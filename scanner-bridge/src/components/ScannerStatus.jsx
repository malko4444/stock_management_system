import React from "react";
import { Fingerprint, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useScannerStatus } from "../lib/useScannerStatus";

// Compact pill indicator. Use in the top bar.
export function ScannerStatusPill() {
  const { connected, checked } = useScannerStatus();
  if (!checked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Fingerprint size={12} />
        Checking scanner...
      </span>
    );
  }
  return connected ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
      <CheckCircle2 size={12} />
      Scanner ready
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
      <AlertTriangle size={12} />
      Scanner not connected
    </span>
  );
}

// Full-width disconnected banner. Use above a tab's content.
export function ScannerDisconnectedBanner() {
  const { connected, checked } = useScannerStatus();
  if (!checked || connected) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 flex items-start gap-3">
      <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
      <div>
        <div className="font-semibold">Fingerprint scanner not connected</div>
        <p className="text-sm text-red-700 mt-1">
          Plug in the USB fingerprint reader. Enrollment and attendance
          scanning are disabled until the device is detected. No fake data
          will be saved while disconnected.
        </p>
      </div>
    </div>
  );
}
