// Runs in the Electron main process. Spawns ScannerHelper.exe, speaks
// line-delimited JSON over stdio, and exposes the API to the renderer
// via IPC. The renderer talks to us through `window.scannerBridge.*`
// (see preload.js).

const { ipcMain, BrowserWindow, app } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { existsSync } = require("node:fs");

function resolveHelperPath() {
  const here = __dirname;
  const candidates = [
    // Dev: dotnet publish output checked into resources/bin
    path.join(here, "resources", "bin", "ScannerHelper.exe"),
    // Dev: raw publish folder
    path.join(here, "native", "bin", "Release", "net8.0-windows", "win-x64", "publish", "ScannerHelper.exe"),
    path.join(here, "native", "bin", "Release", "net8.0-windows", "ScannerHelper.exe"),
    // Prod: electron-builder extraResources
    path.join(process.resourcesPath || "", "bin", "ScannerHelper.exe"),
  ];
  return candidates.find((p) => existsSync(p));
}

let helperProc = null;
let readyPromise = null;
const pendingQueue = [];
// Last time we verified the device responded. If a long-running
// capture is in flight, isConnected polls queue up and time out —
// use this cached value so the UI doesn't flip to "disconnected"
// mid-enrollment.
let lastConnectedAt = 0;
let lastConnectedValue = false;
let captureInFlight = false;

function broadcastEvent(msg) {
  BrowserWindow.getAllWindows().forEach((win) => {
    try {
      win.webContents.send("scanner:event", msg);
    } catch {
      /* window closed */
    }
  });
}

function startHelper() {
  if (helperProc) return readyPromise;
  const exe = resolveHelperPath();
  if (!exe) {
    return Promise.reject(
      new Error(
        "ScannerHelper.exe not found. Build it with `cd native && dotnet publish -c Release -r win-x64 --self-contained false -o ..\\resources\\bin`."
      )
    );
  }

  readyPromise = new Promise((resolve, reject) => {
    try {
      helperProc = spawn(exe, [], { windowsHide: true });
    } catch (err) {
      return reject(new Error(`Failed to start helper: ${err.message}`));
    }

    let buffer = "";
    helperProc.stdout.setEncoding("utf8");
    helperProc.stdout.on("data", (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.event_ === "ready") {
          resolve(true);
          continue;
        }
        if (msg.event_) {
          broadcastEvent(msg);
          continue;
        }
        const waiter = pendingQueue.shift();
        if (waiter) waiter.resolve(msg);
      }
    });

    helperProc.stderr.on("data", (b) => {
      const text = b.toString();
      console.warn("[scanner-helper stderr]", text);
      // Also forward to the renderer so it shows up in DevTools
      broadcastEvent({ event_: "log", level: "stderr", text: text.trim() });
    });

    helperProc.on("exit", (code) => {
      console.warn(`[scanner-helper] exited with code ${code}`);
      helperProc = null;
      readyPromise = null;
      const err = new Error(`Helper exited (code ${code})`);
      while (pendingQueue.length) pendingQueue.shift().reject(err);
    });

    helperProc.on("error", (err) => {
      reject(new Error(`Helper error: ${err.message}`));
    });
  });

  return readyPromise;
}

function send(command, timeoutMs = 180000) {
  return startHelper().then(
    () =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Helper timeout"));
        }, timeoutMs);
        pendingQueue.push({
          resolve: (msg) => {
            clearTimeout(timer);
            resolve(msg);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
        });
        helperProc.stdin.write(JSON.stringify(command) + "\n");
      })
  );
}

function register() {
  ipcMain.handle("scanner:isConnected", async () => {
    // If a capture is blocking the helper, don't queue yet another
    // isConnected command — just return the last known value. Refresh
    // is fine again once the capture finishes.
    if (captureInFlight) {
      return lastConnectedValue;
    }
    try {
      const res = await send({ cmd: "isConnected" }, 5000);
      lastConnectedValue = Boolean(res.connected);
      lastConnectedAt = Date.now();
      return lastConnectedValue;
    } catch {
      // Single transient failure: keep the last good value for 10s
      // so a slow stderr flush doesn't red-flag the banner.
      if (Date.now() - lastConnectedAt < 10000) return lastConnectedValue;
      lastConnectedValue = false;
      return false;
    }
  });

  ipcMain.handle("scanner:enroll", async (_e, employeeId) => {
    if (!employeeId) throw new Error("employeeId required");
    captureInFlight = true;
    try {
      const res = await send({ cmd: "enroll", employeeId });
      if (!res.ok) throw new Error(res.error || "Enrollment failed");
      return { fingerprintId: employeeId };
    } finally {
      captureInFlight = false;
    }
  });

  ipcMain.handle("scanner:forget", async (_e, employeeId) => {
    const res = await send({ cmd: "forget", employeeId });
    if (!res.ok) throw new Error(res.error || "Forget failed");
    return true;
  });

  ipcMain.handle("scanner:identify", async () => {
    captureInFlight = true;
    try {
      const res = await send({ cmd: "identify" });
      if (!res.ok) throw new Error(res.error || "Identify failed");
      if (!res.matched) return null;
      return { fingerprintId: res.employeeId, score: res.score };
    } finally {
      captureInFlight = false;
    }
  });

  ipcMain.handle("scanner:helperPath", () => resolveHelperPath() || null);

  const shutdownHelper = () => {
    if (!helperProc) return;
    const pid = helperProc.pid;
    try {
      helperProc.kill();
    } catch {
      /* already gone */
    }
    // Belt-and-braces on Windows: TerminateProcess via taskkill in case
    // the managed child ignored the signal and is still holding file locks.
    if (process.platform === "win32" && pid) {
      try {
        const { spawnSync } = require("node:child_process");
        spawnSync("taskkill", ["/F", "/T", "/PID", String(pid)], {
          stdio: "ignore",
          windowsHide: true,
        });
      } catch {
        /* best effort */
      }
    }
    helperProc = null;
  };

  app.on("before-quit", shutdownHelper);
  app.on("will-quit", shutdownHelper);
  app.on("window-all-closed", shutdownHelper);
  process.on("exit", shutdownHelper);
}

module.exports = { register };
