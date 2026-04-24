import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { NavBar } from "../components/NavBar";
import { toast } from "react-toastify";
import {
  Calculator,
  Download,
  Save,
  Lock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

const pad = (n) => String(n).padStart(2, "0");
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

// Pair in/out events per day and sum durations
const computeHours = (events) => {
  // Group by YYYY-MM-DD
  const byDay = new Map();
  events.forEach((e) => {
    if (!e.timestamp) return;
    const key = format(e.timestamp, "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(e);
  });

  let totalMs = 0;
  let warnings = 0;

  byDay.forEach((list) => {
    list.sort((a, b) => a.timestamp - b.timestamp);
    let openIn = null;
    list.forEach((ev) => {
      if (ev.type === "in") {
        if (openIn) {
          // Two consecutive INs: ignore earlier, flag
          warnings += 1;
        }
        openIn = ev;
      } else if (ev.type === "out") {
        if (openIn) {
          totalMs += ev.timestamp - openIn.timestamp;
          openIn = null;
        } else {
          // OUT without matching IN
          warnings += 1;
        }
      }
    });
    if (openIn) warnings += 1; // unmatched IN at end of day
  });

  const hours = totalMs / (1000 * 60 * 60);
  return { hours: Math.round(hours * 100) / 100, warnings };
};

function Payroll() {
  const adminId = localStorage.getItem("adminId");
  const [month, setMonth] = useState(currentMonth());
  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState([]);
  const [savedRows, setSavedRows] = useState([]); // existing payroll docs for this month
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // working table rows
  const [savingId, setSavingId] = useState(null);

  const loadAll = useCallback(async () => {
    if (!adminId) return;
    try {
      setLoading(true);
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59, 999);

      const [empSnap, attSnap, paySnap] = await Promise.all([
        getDocs(query(collection(db, "employees"), where("adminId", "==", adminId))),
        getDocs(query(collection(db, "attendance"), where("adminId", "==", adminId))),
        getDocs(
          query(
            collection(db, "payroll"),
            where("adminId", "==", adminId),
            where("month", "==", month)
          )
        ),
      ]);

      const emps = empSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const allEvents = attSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            employeeId: data.employeeId,
            type: data.type,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : null,
          };
        })
        .filter((e) => e.timestamp && e.timestamp >= start && e.timestamp <= end);
      const saved = paySnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setEmployees(emps);
      setEvents(allEvents);
      setSavedRows(saved);
    } catch (err) {
      console.error("Error loading payroll:", err);
      toast.error("Failed to load payroll");
    } finally {
      setLoading(false);
    }
  }, [adminId, month]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Build rows whenever employees/events/savedRows change
  useEffect(() => {
    const savedByEmp = new Map();
    savedRows.forEach((r) => savedByEmp.set(r.employeeId, r));

    const computed = employees
      .filter((e) => e.active !== false || savedByEmp.has(e.id))
      .map((emp) => {
        const empEvents = events.filter((ev) => ev.employeeId === emp.id);
        const { hours: autoHours, warnings } = computeHours(empEvents);
        const saved = savedByEmp.get(emp.id);
        const hours = saved ? Number(saved.totalHours) : autoHours;
        const rate = saved ? Number(saved.hourlyRate) : Number(emp.hourlyRate || 0);
        return {
          employeeId: emp.id,
          employeeName: emp.name,
          autoHours,
          hours,
          rate,
          warnings,
          status: saved?.status || "draft",
          docId: saved?.id || null,
          paidAt: saved?.paidAt?.toDate ? saved.paidAt.toDate() : null,
        };
      });

    setRows(computed);
  }, [employees, events, savedRows]);

  const setRowField = (employeeId, field, value) => {
    setRows((prev) =>
      prev.map((r) =>
        r.employeeId === employeeId
          ? { ...r, [field]: value }
          : r
      )
    );
  };

  const saveDraft = async (row) => {
    setSavingId(row.employeeId);
    try {
      const payload = {
        adminId,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        month,
        totalHours: Number(row.hours) || 0,
        hourlyRate: Number(row.rate) || 0,
        grossPay: (Number(row.hours) || 0) * (Number(row.rate) || 0),
        status: "draft",
        generatedAt: new Date(),
      };
      if (row.docId) {
        await updateDoc(doc(db, "payroll", row.docId), payload);
      } else {
        await addDoc(collection(db, "payroll"), payload);
      }
      toast.success(`Saved draft for ${row.employeeName}`);
      loadAll();
    } catch (err) {
      console.error("Error saving draft:", err);
      toast.error("Failed to save");
    } finally {
      setSavingId(null);
    }
  };

  const markPaid = async (row) => {
    const ok = window.confirm(
      `Mark ${row.employeeName}'s ${month} payroll as PAID? This will lock the row.`
    );
    if (!ok) return;
    setSavingId(row.employeeId);
    try {
      const payload = {
        adminId,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        month,
        totalHours: Number(row.hours) || 0,
        hourlyRate: Number(row.rate) || 0,
        grossPay: (Number(row.hours) || 0) * (Number(row.rate) || 0),
        status: "paid",
        paidAt: new Date(),
        generatedAt: new Date(),
      };
      if (row.docId) {
        await updateDoc(doc(db, "payroll", row.docId), payload);
      } else {
        await addDoc(collection(db, "payroll"), payload);
      }
      toast.success(`${row.employeeName} marked paid`);
      loadAll();
    } catch (err) {
      console.error("Error marking paid:", err);
      toast.error("Failed to mark paid");
    } finally {
      setSavingId(null);
    }
  };

  const downloadPayslip = async (row) => {
    try {
      const { jsPDF } = await import("jspdf");
      const { autoTable } = await import("jspdf-autotable");
      const pdf = new jsPDF();

      pdf.setFontSize(18);
      pdf.text("Payslip", 14, 18);
      pdf.setFontSize(11);
      pdf.text(`Month: ${month}`, 14, 28);
      pdf.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 35);

      pdf.setFontSize(13);
      pdf.text(`Employee: ${row.employeeName}`, 14, 48);
      pdf.setFontSize(11);
      pdf.text(`Status: ${row.status === "paid" ? "PAID" : "DRAFT"}`, 14, 55);

      autoTable(pdf, {
        head: [["Description", "Value"]],
        body: [
          ["Total hours", `${Number(row.hours).toFixed(2)} hrs`],
          ["Hourly rate", `Rs ${Number(row.rate).toLocaleString()}`],
          [
            "Gross pay",
            `Rs ${((Number(row.hours) || 0) * (Number(row.rate) || 0)).toLocaleString()}`,
          ],
        ],
        startY: 65,
        styles: { fontSize: 11, cellPadding: 4 },
        headStyles: { fillColor: [79, 70, 229] },
      });

      pdf.save(`${row.employeeName}_payslip_${month}.pdf`);
      toast.success("Payslip downloaded");
    } catch (err) {
      console.error("Error generating payslip:", err);
      toast.error("Failed to generate payslip");
    }
  };

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const gross = (Number(r.hours) || 0) * (Number(r.rate) || 0);
        acc.hours += Number(r.hours) || 0;
        acc.gross += gross;
        if (r.status === "paid") acc.paid += gross;
        return acc;
      },
      { hours: 0, gross: 0, paid: 0 }
    );
  }, [rows]);

  const fieldClass =
    "w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Payroll</h1>
            <p className="text-sm text-slate-500 mt-1">
              Monthly salary based on attendance × hourly rate
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-slate-500">Total hours (month)</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {totals.hours.toFixed(2)}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-slate-500">Total gross payroll</div>
            <div className="mt-1 text-2xl font-semibold text-indigo-600">
              Rs {totals.gross.toLocaleString()}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-slate-500">Already paid</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-600">
              Rs {totals.paid.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Payroll breakdown ({rows.length})
              </h2>
              <p className="text-xs text-slate-500">
                Edit hours/rate before marking paid. Flagged rows have mismatched punches.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No employees in this month yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Employee</th>
                    <th className="text-left font-medium px-5 py-3">Auto hours</th>
                    <th className="text-left font-medium px-5 py-3">Final hours</th>
                    <th className="text-left font-medium px-5 py-3">Rate (Rs/hr)</th>
                    <th className="text-left font-medium px-5 py-3">Gross</th>
                    <th className="text-left font-medium px-5 py-3">Status</th>
                    <th className="text-right font-medium px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const locked = row.status === "paid";
                    const gross = (Number(row.hours) || 0) * (Number(row.rate) || 0);
                    return (
                      <tr key={row.employeeId} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            {row.employeeName}
                            {row.warnings > 0 && (
                              <span
                                title={`${row.warnings} mismatched punch(es) this month`}
                                className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              >
                                <AlertTriangle size={10} />
                                {row.warnings}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {row.autoHours.toFixed(2)}
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={locked}
                            value={row.hours}
                            onChange={(e) =>
                              setRowField(row.employeeId, "hours", e.target.value)
                            }
                            className={`${fieldClass} w-24 disabled:bg-slate-100`}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={locked}
                            value={row.rate}
                            onChange={(e) =>
                              setRowField(row.employeeId, "rate", e.target.value)
                            }
                            className={`${fieldClass} w-28 disabled:bg-slate-100`}
                          />
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          Rs {gross.toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              locked
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {locked ? <CheckCircle2 size={12} /> : null}
                            {locked ? "Paid" : "Draft"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {!locked && (
                              <>
                                <button
                                  onClick={() => saveDraft(row)}
                                  disabled={savingId === row.employeeId}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium transition-colors disabled:opacity-60"
                                >
                                  {savingId === row.employeeId ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Save size={12} />
                                  )}
                                  Save
                                </button>
                                <button
                                  onClick={() => markPaid(row)}
                                  disabled={savingId === row.employeeId}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium transition-colors disabled:opacity-60"
                                >
                                  <Lock size={12} />
                                  Mark paid
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => downloadPayslip(row)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium transition-colors"
                            >
                              <Download size={12} />
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Payroll;
