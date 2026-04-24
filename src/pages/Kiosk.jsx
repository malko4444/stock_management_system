import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { NavBar } from "../components/NavBar";
import { toast } from "react-toastify";
import {
  KeyRound,
  Search,
  LogIn,
  LogOut,
  Loader2,
  X,
  Clock,
} from "lucide-react";

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function Kiosk() {
  const adminId = localStorage.getItem("adminId");
  const [employees, setEmployees] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);

    // 1) Employees (critical) — load independently
    try {
      const empSnap = await getDocs(
        query(collection(db, "employees"), where("adminId", "==", adminId))
      );
      setEmployees(
        empSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((e) => e.active !== false)
      );
    } catch (err) {
      console.error("Error loading employees:", err);
      toast.error("Failed to load employees");
      setLoading(false);
      return;
    }

    // 2) Attendance (non-critical) — single-field query, filter today client-side
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
    } catch (err) {
      console.warn("Attendance fetch failed, continuing with none:", err);
      setTodayEvents([]);
    }

    setLoading(false);
  }, [adminId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const lastEventFor = useCallback(
    (employeeId) => {
      const events = todayEvents
        .filter((e) => e.employeeId === employeeId)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return events[0] || null;
    },
    [todayEvents]
  );

  const nextTypeFor = (employeeId) => {
    const last = lastEventFor(employeeId);
    if (!last) return "in";
    return last.type === "in" ? "out" : "in";
  };

  const filtered = useMemo(() => {
    let list = [...employees];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((e) =>
        [e.name, e.phone].filter(Boolean).some((v) =>
          String(v).toLowerCase().includes(s)
        )
      );
    }
    return list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [employees, search]);

  const openPinFor = (employee) => {
    setSelected(employee);
    setPin("");
    setPinError("");
  };

  const closePin = () => {
    setSelected(null);
    setPin("");
    setPinError("");
  };

  const submitScan = async () => {
    if (!selected) return;
    if (!/^\d{4}$/.test(pin)) {
      setPinError("Enter 4-digit PIN");
      return;
    }
    if (pin !== selected.pin) {
      setPinError("Incorrect PIN");
      return;
    }
    setSubmitting(true);
    try {
      const nextType = nextTypeFor(selected.id);
      const now = new Date();
      await addDoc(collection(db, "attendance"), {
        employeeId: selected.id,
        employeeName: selected.name,
        adminId,
        type: nextType,
        timestamp: now,
        source: "mock",
      });
      setLastAction({ name: selected.name, type: nextType, at: now });
      toast.success(
        `${selected.name} checked ${nextType === "in" ? "IN" : "OUT"}`
      );
      closePin();
      fetchAll();
    } catch (err) {
      console.error("Error saving attendance:", err);
      toast.error("Failed to save check-in");
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = useMemo(() => {
    const map = new Map();
    todayEvents.forEach((e) => {
      const prev = map.get(e.employeeId);
      if (!prev || (prev.timestamp || 0) < (e.timestamp || 0)) map.set(e.employeeId, e);
    });
    let c = 0;
    map.forEach((v) => {
      if (v.type === "in") c += 1;
    });
    return c;
  }, [todayEvents]);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Attendance kiosk</h1>
            <p className="text-sm text-slate-500 mt-1">
              Tap your name and enter your 4-digit PIN to check in or out.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="text-xs text-slate-500">Present now</div>
              <div className="text-xl font-semibold text-emerald-600">{presentCount}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="text-xs text-slate-500">Today's events</div>
              <div className="text-xl font-semibold text-slate-900">
                {todayEvents.length}
              </div>
            </div>
          </div>
        </div>

        {lastAction && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
            <Clock size={16} className="text-indigo-600" />
            <span className="text-indigo-900">
              <strong>{lastAction.name}</strong> checked{" "}
              {lastAction.type === "in" ? "IN" : "OUT"} at{" "}
              {lastAction.at.toLocaleTimeString()}
            </span>
          </div>
        )}

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your name..."
            className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            autoFocus
          />
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
            {employees.length === 0
              ? "No active employees. Add some from the Employees page."
              : "No employees match your search."}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((emp) => {
              const last = lastEventFor(emp.id);
              const isIn = last && last.type === "in";
              const next = nextTypeFor(emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => openPinFor(emp)}
                  className="group text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <KeyRound size={18} />
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isIn
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isIn ? "Checked in" : "Out"}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 truncate">{emp.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Tap to check {next === "in" ? "IN" : "OUT"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {selected.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Check {nextTypeFor(selected.id) === "in" ? "IN" : "OUT"}
                </p>
              </div>
              <button
                onClick={closePin}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <label className="block text-sm font-medium text-slate-700 mb-2">
              Enter 4-digit PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(v);
                setPinError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitScan();
              }}
              className={`w-full text-center tracking-[0.7em] font-mono text-2xl px-3 py-3 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                pinError ? "border-red-400" : "border-slate-300"
              }`}
              autoFocus
            />
            {pinError && <p className="mt-2 text-xs text-red-600">{pinError}</p>}

            <button
              onClick={submitScan}
              disabled={submitting}
              className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${
                nextTypeFor(selected.id) === "in"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : nextTypeFor(selected.id) === "in" ? (
                <LogIn size={16} />
              ) : (
                <LogOut size={16} />
              )}
              {submitting
                ? "Recording..."
                : nextTypeFor(selected.id) === "in"
                ? "Check in"
                : "Check out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Kiosk;
