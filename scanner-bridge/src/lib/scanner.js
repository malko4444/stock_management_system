// Renderer-side scanner API. All Node work (spawning the helper exe,
// talking to WinBio) happens in the Electron main process. We just
// call across via window.scannerBridge, which is defined in preload.js.

export class ScannerError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "ScannerError";
  }
}

function bridge() {
  const b = typeof window !== "undefined" ? window.scannerBridge : null;
  if (!b) {
    throw new ScannerError(
      "Scanner bridge not available. Run this app inside Electron (npm run dev), not a plain browser."
    );
  }
  return b;
}

export async function isConnected() {
  try {
    return await bridge().isConnected();
  } catch {
    return false;
  }
}

export async function enrollFinger(employeeId) {
  if (!employeeId) throw new ScannerError("employeeId required");
  try {
    return await bridge().enroll(employeeId);
  } catch (err) {
    throw new ScannerError(err?.message || "Enrollment failed");
  }
}

export async function forgetFinger(employeeId) {
  try {
    return await bridge().forget(employeeId);
  } catch (err) {
    throw new ScannerError(err?.message || "Forget failed");
  }
}

export async function captureAndMatch() {
  try {
    return await bridge().identify();
  } catch (err) {
    throw new ScannerError(err?.message || "Identify failed");
  }
}

export function onHelperEvent(cb) {
  try {
    return bridge().onEvent(cb);
  } catch {
    return () => {};
  }
}

export function onFingerDetected(/* callback */) {
  // With WinBio we drive capture explicitly via `captureAndMatch`, so
  // there's no passive "finger placed" event. Listening mode in the
  // Scan tab triggers `captureAndMatch` in a loop instead.
  return () => {};
}
