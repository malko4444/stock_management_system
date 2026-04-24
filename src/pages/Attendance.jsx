import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { NavBar } from "../components/NavBar";
import { toast } from "react-toastify";
import {
  Calendar,
  Users,
  Plus,
  Trash2,
  Filter,
  Loader2,
  ClipboardList,
} from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");
const toDateInputValue = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInputValue = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function Attendance() {
  const adminId = localStorage.getItem("adminId");
  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
  const [empFilter, setEmpFilter] = useState("all");

  // Manual add form
  const [mEmp, setMEmp] = useState("");
  const [mType, setMType] = useState("in");
  const [mDate, setMDate] = useState(toDateInputValue(new Date()));
  const [mTime, setMTime] = useState(toTimeInputValue(new Date()));
  const [mErrors, setMErrors] = useState({});
  const [mSubmitting, setMSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!adminId) return;
    try {
      setLoading(true);
      const [empSnap, attSnap] = await Promise.all([
        getDocs(query(collection(db, "employees"), where("adminId", "==", adminId))),
        getDocs(query(collection(db, "attendance"), where("adminId", "==", adminId))),
      ]);
      setEmployees(empSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setEvents(
        attSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            type: data.type,
            source: data.source || "mock",
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : null,
          };
        })
      );
    } catch (err) {
      console.error("Error loading attendance:", err);
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const employeeById = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const filtered = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    return events
      .filter((e) => e.timestamp && e.timestamp >= start && e.timestamp <= end)
      .filter((e) => empFilter === "all" || e.employeeId === empFilter)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [events, selectedDate, empFilter]);

  const validateManual = () => {
    const next = {};
    if (!mEmp) next.mEmp = "Select employee";
    if (!mType) next.mType = "Select type";
    if (!mDate) next.mDate = "Date required";
    if (!mTime) next.mTime = "Time required";
    setMErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitManual = async (e) => {
    e.preventDefault();
    if (!validateManual()) return;
    setMSubmitting(true);
    try {
      const [y, mm, d] = mDate.split("-").map(Number);
      const [hh, min] = mTime.split(":").map(Number);
      const timestamp = new Date(y, mm - 1, d, hh, min, 0, 0);
      const emp = employeeById.get(mEmp);
      await addDoc(collection(db, "attendance"), {
        employeeId: mEmp,
        employeeName: emp?.name || "",
        adminId,
        type: mType,
        timestamp,
        source: "manual",
      });
      toast.success("Attendance entry added");
      setMEmp("");
      setMType("in");
      setMErrors({});
      fetchAll();
    } catch (err) {
      console.error("Error adding manual:", err);
      toast.error("Failed to add entry");
    } finally {
      setMSubmitting(false);
    }
  };

  const removeEvent = async (ev) => {
    const ok = window.confirm(
      `Delete this ${ev.type === "in" ? "check-in" : "check-out"} for ${
        ev.employeeName || "employee"
      }?`
    );
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "attendance", ev.id));
      toast.success("Entry deleted");
      fetchAll();
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error("Failed to delete");
    }
  };

  const fieldClass = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
      hasError ? "border-red-400" : "border-slate-300"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Attendance log</h1>
          <p className="text-sm text-slate-500 mt-1">
            All check-in / check-out events. Add or correct entries manually if needed.
          </p>
        </div>

        {/* Manual add */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <Plus size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Add entry manually</h2>
              <p className="text-xs text-slate-500">
                Use this to back-fill or correct missed punches.
              </p>
            </div>
          </div>
          <form onSubmit={submitManual} className="grid gap-4 md:grid-cols-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Employee
              </label>
              <select
                value={mEmp}
                onChange={(e) => {
                  setMEmp(e.target.value);
                  setMErrors((p) => ({ ...p, mEmp: "" }));
                }}
                className={fieldClass(mErrors.mEmp)}
              >
                <option value="">Select...</option>
                {employees
                  .filter((e) => e.active !== false)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
              {mErrors.mEmp && <p className="mt-1 text-xs text-red-600">{mErrors.mEmp}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={mType}
                onChange={(e) => setMType(e.target.value)}
                className={fieldClass(false)}
              >
                <option value="in">Check in</option>
                <option value="out">Check out</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                className={fieldClass(mErrors.mDate)}
              />
              {mErrors.mDate && <p className="mt-1 text-xs text-red-600">{mErrors.mDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <input
                type="time"
                value={mTime}
                onChange={(e) => setMTime(e.target.value)}
                className={fieldClass(mErrors.mTime)}
              />
              {mErrors.mTime && <p className="mt-1 text-xs text-red-600">{mErrors.mTime}</p>}
            </div>
            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={mSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {mSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {mSubmitting ? "Adding..." : "Add entry"}
              </button>
            </div>
          </form>
        </div>

        {/* Filters + table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
                <ClipboardList size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Log ({filtered.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Filter by date and employee
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="relative">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <select
                  value={empFilter}
                  onChange={(e) => setEmpFilter(e.target.value)}
                  className="pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No attendance entries for this day.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Employee</th>
                    <th className="text-left font-medium px-5 py-3">Type</th>
                    <th className="text-left font-medium px-5 py-3">Time</th>
                    <th className="text-left font-medium px-5 py-3">Source</th>
                    <th className="text-right font-medium px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-medium">
                        <Link
                          to={`/employee-attendance/${ev.employeeId}`}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {ev.employeeName || employeeById.get(ev.employeeId)?.name || "—"}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            ev.type === "in"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ev.type === "in" ? "Check IN" : "Check OUT"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {ev.timestamp ? ev.timestamp.toLocaleTimeString() : "-"}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs uppercase">
                        {ev.source}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => removeEvent(ev)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition-colors"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Attendance;
