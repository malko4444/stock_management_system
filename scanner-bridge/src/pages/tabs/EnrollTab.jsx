import React, { useCallback, useEffect, useState } from "react";
import {
  collection,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";
import { enrollFinger, ScannerError } from "../../lib/scanner";
import { useScannerStatus } from "../../lib/useScannerStatus";
import { ScannerDisconnectedBanner } from "../../components/ScannerStatus";
import {
  Users,
  Fingerprint,
  Loader2,
  CheckCircle2,
  Search,
  RefreshCw,
  Info,
} from "lucide-react";

export default function EnrollTab({ user }) {
  const adminId = user?.uid;
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [enrollingId, setEnrollingId] = useState(null);
  const { connected } = useScannerStatus();

  const fetchEmployees = useCallback(async () => {
    if (!adminId) return;
    try {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "employees"), where("adminId", "==", adminId))
      );
      setEmployees(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((e) => e.active !== false)
      );
    } catch (err) {
      console.error("Fetch employees failed:", err);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleEnroll = async (emp) => {
    if (emp.fingerprintId) {
      const ok = window.confirm(
        `${emp.name} is already enrolled. Re-enroll finger?`
      );
      if (!ok) return;
    }
    setEnrollingId(emp.id);
    try {
      // employeeId IS the template key in the local store
      const { fingerprintId } = await enrollFinger(emp.id);
      await updateDoc(doc(db, "employees", emp.id), {
        fingerprintId,
        enrolledAt: new Date(),
      });
      toast.success(`${emp.name} enrolled (place finger 3 times)`);
      fetchEmployees();
    } catch (err) {
      console.error("Enroll failed:", err);
      const msg =
        err instanceof ScannerError
          ? err.message
          : "Failed to enroll. Please try again.";
      toast.error(msg);
    } finally {
      setEnrollingId(null);
    }
  };

  const filtered = employees
    .filter((e) => {
      if (!search.trim()) return true;
      const s = search.trim().toLowerCase();
      return [e.name, e.phone, e.cnic]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

  const enrolledCount = employees.filter((e) => e.fingerprintId).length;

  return (
    <div className="space-y-6">
      <ScannerDisconnectedBanner />

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 text-sm text-indigo-900">
        <Info size={16} className="mt-0.5 text-indigo-600 flex-shrink-0" />
        <div>
          Employees are added from the web dashboard. Here you enroll each
          worker's fingerprint. You'll be asked to place the same finger on
          the scanner three times. The biometric template stays on this PC;
          Firebase only gets a reference ID.
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {employees.length} active employee
                {employees.length === 1 ? "" : "s"}
              </h2>
              <p className="text-xs text-slate-500">
                {enrolledCount} enrolled - {employees.length - enrolledCount} pending
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full md:w-64 pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={fetchEmployees}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {employees.length === 0
              ? "No active employees. Add workers from the web dashboard first."
              : "No employees match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Name</th>
                  <th className="text-left font-medium px-5 py-3">Phone</th>
                  <th className="text-left font-medium px-5 py-3">Rate</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-right font-medium px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900">{emp.name}</td>
                    <td className="px-5 py-3 text-slate-700">{emp.phone || "-"}</td>
                    <td className="px-5 py-3 text-slate-900">
                      Rs {Number(emp.hourlyRate || 0).toLocaleString()}/hr
                    </td>
                    <td className="px-5 py-3">
                      {emp.fingerprintId ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={12} />
                          Enrolled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Fingerprint size={12} />
                          Not enrolled
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleEnroll(emp)}
                          disabled={!connected || enrollingId === emp.id}
                          title={!connected ? "Scanner not connected" : undefined}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {enrollingId === emp.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Fingerprint size={12} />
                          )}
                          {enrollingId === emp.id
                            ? "Place finger..."
                            : emp.fingerprintId
                            ? "Re-enroll"
                            : "Enroll finger"}
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
  );
}
