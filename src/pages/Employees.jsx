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
  Users,
  UserPlus,
  Search,
  Edit2,
  Loader2,
  XCircle,
  Save,
  Power,
} from "lucide-react";

const emptyForm = {
  name: "",
  phone: "",
  cnic: "",
  hourlyRate: "",
  pin: "",
};

function Employees() {
  const adminId = localStorage.getItem("adminId");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!editId;

  const fetchEmployees = useCallback(async () => {
    if (!adminId) return;
    try {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "employees"), where("adminId", "==", adminId))
      );
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching employees:", err);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setErrors({});
  };

  const startEdit = (emp) => {
    setEditId(emp.id);
    setForm({
      name: emp.name || "",
      phone: emp.phone || "",
      cnic: emp.cnic || "",
      hourlyRate: emp.hourlyRate ?? "",
      pin: emp.pin || "",
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validate = () => {
    const next = {};

    if (!form.name.trim()) next.name = "Name is required";
    else if (form.name.trim().length < 2) next.name = "Name must be at least 2 characters";

    if (!form.phone.trim()) next.phone = "Phone is required";
    else if (!/^\d{10,11}$/.test(form.phone.trim()))
      next.phone = "Enter a valid 10-11 digit phone";

    if (form.cnic && !/^\d{5}-?\d{7}-?\d$/.test(form.cnic.trim()))
      next.cnic = "CNIC format should be 12345-1234567-1";

    if (form.hourlyRate === "" || form.hourlyRate === null) {
      next.hourlyRate = "Hourly rate is required";
    } else if (Number.isNaN(Number(form.hourlyRate))) {
      next.hourlyRate = "Hourly rate must be a number";
    } else if (Number(form.hourlyRate) <= 0) {
      next.hourlyRate = "Hourly rate must be greater than 0";
    }

    if (!form.pin) next.pin = "PIN is required";
    else if (!/^\d{4}$/.test(form.pin)) next.pin = "PIN must be exactly 4 digits";

    // Check PIN uniqueness within this admin's employees
    if (!next.pin) {
      const duplicate = employees.find(
        (e) => e.pin === form.pin && e.id !== editId
      );
      if (duplicate) next.pin = "This PIN is already used by another employee";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      cnic: form.cnic.trim() || null,
      hourlyRate: Number(form.hourlyRate),
      pin: form.pin,
    };

    try {
      if (!isEdit) {
        await addDoc(collection(db, "employees"), {
          ...payload,
          adminId,
          active: true,
          createdAt: new Date(),
        });
        toast.success("Employee added");
      } else {
        await updateDoc(doc(db, "employees", editId), {
          ...payload,
          updatedAt: new Date(),
        });
        toast.success("Employee updated");
      }
      resetForm();
      fetchEmployees();
    } catch (err) {
      console.error("Error saving employee:", err);
      toast.error(isEdit ? "Failed to update employee" : "Failed to add employee");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (emp) => {
    const confirmed = window.confirm(
      emp.active
        ? `Deactivate "${emp.name}"? They won't appear on the kiosk, but past attendance stays intact.`
        : `Reactivate "${emp.name}"?`
    );
    if (!confirmed) return;
    try {
      await updateDoc(doc(db, "employees", emp.id), {
        active: !emp.active,
        updatedAt: new Date(),
      });
      toast.success(emp.active ? "Employee deactivated" : "Employee reactivated");
      fetchEmployees();
    } catch (err) {
      console.error("Error toggling status:", err);
      toast.error("Failed to update status");
    }
  };

  const filtered = useMemo(() => {
    let list = [...employees];
    if (statusFilter === "active") list = list.filter((e) => e.active !== false);
    else if (statusFilter === "inactive") list = list.filter((e) => e.active === false);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((e) =>
        [e.name, e.phone, e.cnic].filter(Boolean).some((v) =>
          String(v).toLowerCase().includes(s)
        )
      );
    }
    return list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [employees, search, statusFilter]);

  const fieldClass = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
      hasError ? "border-red-400" : "border-slate-300"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage workers, hourly rates, and kiosk PINs
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isEdit ? "Edit employee" : "Add employee"}
              </h2>
              <p className="text-xs text-slate-500">
                Fields marked with <span className="text-red-500">*</span> are required
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2" noValidate>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={update("name")}
                placeholder="e.g. Bilal Ahmed"
                className={fieldClass(errors.name)}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={update("phone")}
                placeholder="03xxxxxxxxx"
                className={fieldClass(errors.phone)}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CNIC</label>
              <input
                type="text"
                value={form.cnic}
                onChange={update("cnic")}
                placeholder="12345-1234567-1"
                className={fieldClass(errors.cnic)}
              />
              {errors.cnic && <p className="mt-1 text-xs text-red-600">{errors.cnic}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Hourly rate (Rs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.hourlyRate}
                onChange={update("hourlyRate")}
                placeholder="0.00"
                className={fieldClass(errors.hourlyRate)}
              />
              {errors.hourlyRate && (
                <p className="mt-1 text-xs text-red-600">{errors.hourlyRate}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kiosk PIN (4 digits) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={form.pin}
                onChange={update("pin")}
                placeholder="4-digit PIN"
                className={`${fieldClass(errors.pin)} tracking-[0.5em] font-mono`}
              />
              <p className="mt-1 text-xs text-slate-500">
                Used at the attendance kiosk to check in and out.
              </p>
              {errors.pin && <p className="mt-1 text-xs text-red-600">{errors.pin}</p>}
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {submitting
                  ? isEdit
                    ? "Updating..."
                    : "Saving..."
                  : isEdit
                  ? "Update employee"
                  : "Add employee"}
              </button>
              {isEdit && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  <XCircle size={16} />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {filtered.length} employee{filtered.length === 1 ? "" : "s"}
                </h3>
                <p className="text-xs text-slate-500">Tap a row to edit or toggle status</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, phone, CNIC"
                  className="w-full sm:w-72 pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No employees match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Name</th>
                    <th className="text-left font-medium px-5 py-3">Phone</th>
                    <th className="text-left font-medium px-5 py-3">CNIC</th>
                    <th className="text-left font-medium px-5 py-3">Hourly rate</th>
                    <th className="text-left font-medium px-5 py-3">Status</th>
                    <th className="text-right font-medium px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-medium text-slate-900">{emp.name}</td>
                      <td className="px-5 py-3 text-slate-700">{emp.phone || "-"}</td>
                      <td className="px-5 py-3 text-slate-700">{emp.cnic || "-"}</td>
                      <td className="px-5 py-3 text-slate-900 font-medium">
                        Rs {Number(emp.hourlyRate || 0).toLocaleString()}/hr
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            emp.active !== false
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {emp.active !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(emp)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium transition-colors"
                          >
                            <Edit2 size={13} />
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(emp)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              emp.active !== false
                                ? "bg-red-50 text-red-700 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            <Power size={13} />
                            {emp.active !== false ? "Deactivate" : "Reactivate"}
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

export default Employees;
    