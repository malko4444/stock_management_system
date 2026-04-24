import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";
import { captureAndMatch, ScannerError } from "../../lib/scanner";
import { useScannerStatus } from "../../lib/useScannerStatus";
import { ScannerDisconnectedBanner } from "../../components/ScannerStatus";
import {
  Fingerprint,
  Loader2,
  Clock,
  XCircle,
  CheckCircle2,
  Play,
  Pause,
} from "lucide-react";

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function ScanTab({ user }) {
  const adminId = user?.uid;
  const [employees, setEmployees] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [listening, setListening] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [recent, setRecent] = useState([]);
  const { connected } = useScannerStatus();
  const stopRef = useRef(false);

  const loadAll = useCallback(async () => {
    if (!adminId) return;
    try {
      const empSnap = await getDocs(
        query(collection(db, "employees"), where("adminId", "==", adminId))
      );
      setEmployees(empSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    try {
      const attSnap = await getDocs(
        query(collection(db, "attendance"), where("adminId", "==", adminId))
      );
      const start = todayStart();
      setTodayEvents(
        attSnap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              employeeId: data.employeeId,
              type: data.type,
              timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : null,
            };
          })
          .filter((e) => e.timestamp && e.timestamp >= start)
      );
    } catch (err) { console.warn("Attendance load failed:", err); }
  }, [adminId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const employeeById = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const enrolledCount = useMemo(
    () => employees.filter((e) => e.active !== false && e.fingerprintId).length,
    [employees]
  );

  const lastEventFor = useCallback(
    (empId) => {
      const list = todayEvents
        .filter((e) => e.employeeId === empId)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return list[0] || null;
    },
    [todayEvents]
  );

  const processOne = useCallback(async () => {
    setScanning(true);
    try {
      const match = await captureAndMatch();
      if (!match) {
        setLastResult({ ok: false, reason: "Finger not recognised. Try again." });
        return;
      }
      const emp = employeeById.get(match.fingerprintId);
      if (!emp) {
        setLastResult({
          ok: false,
          reason: "Matched template has no linked employee. Re-enroll them.",
        });
        return;
      }
      const last = lastEventFor(emp.id);
      const type = !last ? "in" : last.type === "in" ? "out" : "in";
      const now = new Date();
      await addDoc(collection(db, "attendance"), {
        employeeId: emp.id,
        employeeName: emp.name,
        adminId,
        type,
        timestamp: now,
        source: "scanner",
        matchScore: match.score,
      });
      const result = { ok: true, name: emp.name, type, at: now, score: match.score };
      setLastResult(result);
      setRecent((prev) =>
        [{ id: `${emp.id}_${now.getTime()}`, ...result }, ...prev].slice(0, 8)
      );
      toast.success(`${emp.name} checked ${type === "in" ? "IN" : "OUT"}`);
      loadAll();
    } catch (err) {
      const msg = err instanceof ScannerError ? err.message : "Scan failed";
      setLastResult({ ok: false, reason: msg });
    } finally {
      setScanning(false);
    }
  }, [adminId, employeeById, lastEventFor, loadAll]);

  // Continuous listening loop: repeatedly call captureAndMatch until stopped.
  useEffect(() => {
    if (!listening || !connected) return;
    stopRef.current = false;
    (async () => {
      while (!stopRef.current) {
        await processOne();
        // brief cooldown so the last touch clears the sensor
        await new Promise((r) => setTimeout(r, 800));
      }
    })();
    return () => { stopRef.current = true; };
  }, [listening, connected, processOne]);

  const toggleListening = () => {
    if (!connected) { toast.error("Scanner not connected"); return; }
    setListening((v) => !v);
  };

  const presentCount = useMemo(() => {
    const map = new Map();
    todayEvents.forEach((e) => {
      const prev = map.get(e.employeeId);
      if (!prev || (prev.timestamp || 0) < (e.timestamp || 0)) map.set(e.employeeId, e);
    });
    let c = 0;
    map.forEach((v) => { if (v.type === "in") c += 1; });
    return c;
  }, [todayEvents]);

  const readyToScan = connected && listening;

  return (
    <div className="space-y-6">
      <ScannerDisconnectedBanner />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-slate-500">Enrolled employees</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{enrolledCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-slate-500">Present now</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{presentCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-slate-500">Today's events</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{todayEvents.length}</div>
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl shadow-sm border p-10 min-h-[300px] flex flex-col items-center justify-center transition-colors ${
          readyToScan ? "bg-gradient-to-br from-indigo-50 to-white border-indigo-200" : "bg-white border-slate-200"
        }`}
      >
        <div
          className={`h-24 w-24 rounded-full grid place-items-center mb-4 transition-all ${
            scanning
              ? "bg-indigo-600 text-white animate-pulse"
              : readyToScan
              ? "bg-indigo-100 text-indigo-600 animate-pulse"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          <Fingerprint size={48} />
        </div>

        <h2 className="text-xl font-semibold text-slate-900">
          {scanning
            ? "Place finger on the scanner..."
            : readyToScan
            ? "Ready - place finger"
            : !connected
            ? "Scanner not connected"
            : "Scanner idle"}
        </h2>
        <p className="text-sm text-slate-500 mt-1 text-center max-w-sm">
          {!connected
            ? "Plug in the fingerprint reader and restart the app."
            : enrolledCount === 0
            ? "No enrolled employees. Enroll at least one worker from the Enroll tab."
            : readyToScan
            ? "Identifying automatically. Press Stop to pause."
            : "Click Start to begin listening."}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={toggleListening}
            disabled={!connected || enrolledCount === 0}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              listening ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {listening ? <Pause size={16} /> : <Play size={16} />}
            {listening ? "Stop listening" : "Start listening"}
          </button>
          {scanning && <Loader2 size={18} className="animate-spin text-indigo-600" />}
        </div>
      </div>

      {lastResult && (
        <div
          className={`rounded-2xl p-4 flex items-center gap-3 text-sm animate-fade-in ${
            lastResult.ok
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-red-50 border border-red-200 text-red-900"
          }`}
        >
          {lastResult.ok ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}
          {lastResult.ok ? (
            <span>
              <strong>{lastResult.name}</strong> checked{" "}
              {lastResult.type === "in" ? "IN" : "OUT"} at{" "}
              {lastResult.at.toLocaleTimeString()}
              {lastResult.score != null && (
                <span className="ml-2 text-xs opacity-70">(score {Math.round(lastResult.score)})</span>
              )}
            </span>
          ) : (
            <span>{lastResult.reason}</span>
          )}
        </div>
      )}

      {recent.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Recent scans</h3>
              <p className="text-xs text-slate-500">This session</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {recent.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                <Fingerprint size={14} className="text-indigo-600" />
                <span className="font-medium text-slate-900">{r.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.type === "in" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {r.type === "in" ? "Checked IN" : "Checked OUT"}
                </span>
                <span className="ml-auto text-xs text-slate-500">{r.at.toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
