import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { NavBar } from "../components/NavBar";
import { toast } from "react-toastify";
import { format } from "date-fns";
import {
  Users,
  Clock,
  CalendarDays,
  Search,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  UserCog,
} from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const monthBounds = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
};

// Group events into days (yyyy-MM-dd) and summarize per day
const summarizeEvents = (events) => {
  const byDay = new Map();
  events.forEach((e) => {
    if (!e.timestamp) return;
    const key = format(e.timestamp, "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(e);
  });

  const rows = [];
  let totalMs = 0;
  let warnings = 0;
  byDay.forEach((list, dateKey) => {
    list.sort((a, b) => a.timestamp - b.timestamp);
    let openIn = null;
    let dayMs = 0;
    let dayWarn = 0;
    list.forEach((ev) => {
      if (ev.type === "in") {
        if (openIn) dayWarn += 1;
        openIn = ev;
      } else if (ev.type === "out") {
        if (openIn) {
          dayMs += ev.timestamp - openIn.timestamp;
          openIn = null;
        } else {
          dayWarn += 1;
        }
      }
    });
    if (openIn) dayWarn += 1;
    totalMs += dayMs;
    warnings += dayWarn;
    const firstIn = list.find((e) => e.type === "in");
    const lastOut = [...list].reverse().find((e) => e.type === "out");
    rows.push({
      dateKey,
      date: list[0].timestamp,
      firstIn: firstIn ? firstIn.timestamp : null,
      lastOut: lastOut ? lastOut.timestamp : null,
      hours: dayMs / (1000 * 60 * 60),
      warnings: dayWarn,
      events: list,
    });
  });
  rows.sort((a, b) => b.date - a.date);
  return {
    rows,
    totalHours: totalMs / (1000 * 60 * 60),
    daysPresent: rows.length,
    warnings,
  };
};

export default function EmployeeAttendance() {
  const adminId = localStorage.getItem("adminId");
  const navigate = useNavigate();
  const { employeeId } = useParams(); // may be undefined

  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth());
  const [search, setSearch] = useState("");

  const loadAll = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const empSnap = await getDocs(
        query(collection(db, "employees"), where("adminId", "==", adminId))
      );
      setEmployees(empSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load employees");
    }
    try {
      const attSnap = await getDocs(
        query(collection(db, "attendance"), where("adminId", "==", adminId))
      );
      setEvents(
        attSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            employeeId: data.employeeId,
            type: data.type,
            source: data.source || "mock",
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : null,
          };
        })
      );
    } catch (err) {
      console.warn("Attendance load failed:", err);
      setEvents([]);
    }
    setLoading(false);
  }, [adminId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const { start, end } = useMemo(() => monthBounds(month), [month]);

  // Events within selected month
  const eventsInMonth = useMemo(
    () =>
      events.filter((e) => e.timestamp && e.timestamp >= start && e.timestamp <= end),
    [events, start, end]
  );

  // Per-employee summary for the list view
  const summaries = useMemo(() => {
    return employees
      .filter((e) => e.active !== false)
      .map((emp) => {
        const empEvents = eventsInMonth.filter((ev) => ev.employeeId === emp.id);
        const sum = summarizeEvents(empEvents);
        return {
          employee: emp,
          ...sum,
        };
      })
      .filter((s) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return [s.employee.name, s.employee.phone]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) =>
        String(a.employee.name || "").localeCompare(
          String(b.employee.name || "")
        )
      );
  }, [employees, eventsInMonth, search]);

  // If route has employeeId, find them and compute their detail
  const selected = employeeId
    ? employees.find((e) => e.id === employeeId)
    : null;

  const selectedSummary = useMemo(() => {
    if (!selected) return null;
    const empEvents = eventsInMonth.filter((ev) => ev.employeeId === selected.id);
    return summarizeEvents(empEvents);
  }, [selected, eventsInMonth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <div className="p-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  // --- DETAIL view ---
  if (selected && selectedSummary) {
    const avgHours =
      selectedSummary.daysPresent > 0
        ? selectedSummary.totalHours / selectedSummary.daysPresent
        : 0;
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <button
            onClick={() => navigate("/employee-attendance")}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={14} />
            Back to all employees
          </button>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                {selected.name}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {selected.phone ? `${selected.phone} · ` : ""}Rs{" "}
                {Number(selected.hourlyRate || 0).toLocaleString()}/hr
              </p>
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs text-slate-500">Days present</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {selectedSummary.daysPresent}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs text-slate-500">Total hours</div>
              <div className="mt-1 text-2xl font-semibold text-indigo-600">
                {selectedSummary.totalHours.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs text-slate-500">Avg hours / day</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {avgHours.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs text-slate-500">Estimated pay</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-600">
                Rs {Math.round(selectedSummary.totalHours * Number(selected.hourlyRate || 0)).toLocaleString()}
              </div>
            </div>
          </div>

          {selectedSummary.warnings > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <strong>{selectedSummary.warnings}</strong> punch(es) this month could not be paired (missed check-in or check-out). Fix them on the Attendance page before finalising payroll.
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
                <CalendarDays size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Day-by-day</h2>
                <p className="text-xs text-slate-500">
                  {selectedSummary.rows.length === 0
                    ? "No attendance in this month"
                    : "First check-in, last check-out and total hours per day"}
                </p>
              </div>
            </div>

            {selectedSummary.rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                {selected.name} has no attendance records in {month}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left font-medium px-5 py-3">Date</th>
                      <th className="text-left font-medium px-5 py-3">First IN</th>
                      <th className="text-left font-medium px-5 py-3">Last OUT</th>
                      <th className="text-left font-medium px-5 py-3">Hours</th>
                      <th className="text-left font-medium px-5 py-3">Punches</th>
                      <th className="text-left font-medium px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSummary.rows.map((row) => (
                      <tr key={row.dateKey} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 text-slate-900 font-medium">
                          {format(row.date, "EEE, dd MMM yyyy")}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {row.firstIn ? format(row.firstIn, "hh:mm a") : "-"}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {row.lastOut ? format(row.lastOut, "hh:mm a") : "-"}
                        </td>
                        <td className="px-5 py-3 text-slate-900 font-medium">
                          {row.hours.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {row.events.length}
                        </td>
                        <td className="px-5 py-3">
                          {row.warnings > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                              <AlertTriangle size={12} />
                              Missing punch
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                              Complete
                            </span>
                          )}
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

  // --- LIST view ---
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
              Employee attendance
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Click a worker to see their day-by-day history
            </p>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {summaries.length} employee{summaries.length === 1 ? "" : "s"}
                </h2>
                <p className="text-xs text-slate-500">
                  Showing summary for {month}
                </p>
              </div>
            </div>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone"
                className="w-full md:w-72 pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {summaries.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 grid place-items-center mb-3">
                <UserCog size={18} className="text-slate-400" />
              </div>
              {employees.length === 0
                ? "No employees yet. Add some from the Employees page."
                : "No employees match your search."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summaries.map(({ employee, daysPresent, totalHours, warnings, rows }) => {
                const lastDay = rows[0];
                return (
                  <li key={employee.id}>
                    <Link
                      to={`/employee-attendance/${employee.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center flex-shrink-0">
                        <Users size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {employee.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {employee.phone || "—"} · Rs{" "}
                          {Number(employee.hourlyRate || 0).toLocaleString()}/hr
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-6 text-sm flex-shrink-0">
                        <div className="text-center">
                          <div className="text-xs text-slate-500">Days</div>
                          <div className="font-semibold text-slate-900">
                            {daysPresent}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500">Hours</div>
                          <div className="font-semibold text-indigo-600">
                            {totalHours.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500">Last seen</div>
                          <div className="font-medium text-slate-700 text-xs">
                            {lastDay ? format(lastDay.date, "dd MMM") : "—"}
                          </div>
                        </div>
                        {warnings > 0 && (
                          <span
                            title={`${warnings} unpaired punch(es)`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700"
                          >
                            <AlertTriangle size={12} />
                            {warnings}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <Clock size={12} />
          Hours are computed from paired in/out events. Missing punches are shown as warnings.
        </div>
      </div>
    </div>
  );
}
