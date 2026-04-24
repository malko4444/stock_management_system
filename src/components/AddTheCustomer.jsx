import React, { useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { UserPlus, Loader2 } from "lucide-react";

function AddTheCustomer({ onAdded }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const adminId = localStorage.getItem("adminId");

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Customer name is required";
    else if (form.name.trim().length < 2) next.name = "Name must be at least 2 characters";

    if (!form.phone.trim()) next.phone = "Phone number is required";
    else if (!/^\d{10,11}$/.test(form.phone.trim()))
      next.phone = "Enter a valid 10-11 digit phone number";

    if (!form.address.trim()) next.address = "Address is required";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const addCustomer = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "customers"), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        createdAt: new Date(),
        adminId,
      });
      toast.success("Customer added successfully");
      setForm({ name: "", phone: "", address: "" });
      setErrors({});
      if (typeof onAdded === "function") onAdded();
    } catch (err) {
      console.error("Error adding customer:", err);
      toast.error("Failed to add customer");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
      hasError ? "border-red-400" : "border-slate-300"
    }`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
          <UserPlus size={18} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Add new customer</h3>
          <p className="text-xs text-slate-500">Save a client to start recording transactions</p>
        </div>
      </div>

      <form onSubmit={addCustomer} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            value={form.name}
            onChange={update("name")}
            type="text"
            placeholder="e.g. Ahmed Khan"
            className={fieldClass(errors.name)}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={update("phone")}
            type="tel"
            inputMode="numeric"
            placeholder="03xxxxxxxxx"
            className={fieldClass(errors.phone)}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <input
            value={form.address}
            onChange={update("address")}
            type="text"
            placeholder="Street, City"
            className={fieldClass(errors.address)}
          />
          {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Saving..." : "Add customer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddTheCustomer;
