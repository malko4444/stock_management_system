import { useEffect, useState } from "react";
import { isConnected } from "./scanner";

// Poll scanner connection status on an interval. Returns a boolean
// plus a loading flag for the first check.
export function useScannerStatus(intervalMs = 4000) {
  const [connected, setConnected] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const ok = await isConnected();
        if (mounted) {
          setConnected(ok);
          setChecked(true);
        }
      } catch {
        if (mounted) {
          setConnected(false);
          setChecked(true);
        }
      }
    };
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { connected, checked };
}
