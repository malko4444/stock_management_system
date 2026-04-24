// Exposes a narrow, safe API to the renderer. Everything that touches
// Node (child_process, fs) lives in main.js / scanner-main.js; the
// renderer goes through this bridge via IPC.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("scannerBridge", {
  isConnected: () => ipcRenderer.invoke("scanner:isConnected"),
  enroll: (employeeId) => ipcRenderer.invoke("scanner:enroll", employeeId),
  forget: (employeeId) => ipcRenderer.invoke("scanner:forget", employeeId),
  identify: () => ipcRenderer.invoke("scanner:identify"),
  helperPath: () => ipcRenderer.invoke("scanner:helperPath"),
  onEvent: (cb) => {
    const listener = (_e, msg) => {
      try {
        cb(msg);
      } catch {
        /* listener errored */
      }
    };
    ipcRenderer.on("scanner:event", listener);
    return () => ipcRenderer.removeListener("scanner:event", listener);
  },
});
