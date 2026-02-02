import React, { useState, useEffect } from "react";
import { accountReceivableApi } from "../services/firebaseApi";
import { toast } from "react-toastify";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function AccountReceivable({ embedded = false }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ customer_name: "", amount: "", description: "", due_date: "", status: "pending" });
  const adminId = localStorage.getItem("adminId");

  const fetchList = async () => {
    if (!adminId) return;
    try {
      const data = await accountReceivableApi.getByAdmin(adminId);
      setList(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load receivables");
    } finally {
      setLoading(false);
    }
  };

  const agingBuckets = (items) => {
    const now = new Date();
    const buckets = { '0-30': 0, '31-60': 0, '60+': 0 };
    for (const r of items) {
      const d = r.created_at?.toDate ? r.created_at.toDate() : r.created_at || new Date();
      const days = Math.floor((now - new Date(d)) / (1000 * 60 * 60 * 24));
      const amt = Number(r.amount) || 0;
      if (r.status !== 'pending') continue; // only pending counts toward aging
      if (days <= 30) buckets['0-30'] += amt;
      else if (days <= 60) buckets['31-60'] += amt;
      else buckets['60+'] += amt;
    }
    return buckets;
  };

  useEffect(() => { fetchList(); }, [adminId]);

  const openAdd = () => {
    setEditing(null);
    setForm({ customer_name: "", amount: "", description: "", due_date: "", status: "pending" });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    const d = row.due_date?.toDate ? row.due_date.toDate() : row.due_date;
    setForm({
      customer_name: row.customer_name || "",
      amount: String(row.amount ?? ""),
      description: row.description || "",
      due_date: d ? format(new Date(d), "yyyy-MM-dd") : "",
      status: row.status || "pending",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name?.trim() || !form.amount) {
      toast.error("Customer name and amount are required");
      return;
    }
    try {
      const payload = { admin_id: adminId, customer_name: form.customer_name.trim(), amount: Number(form.amount), description: form.description?.trim() || "", status: form.status };
      if (form.due_date) payload.due_date = new Date(form.due_date);
      if (editing) {
        await accountReceivableApi.update(editing.id, payload);
        toast.success("Receivable updated");
      } else {
        await accountReceivableApi.add({ ...payload, created_at: new Date() });
        toast.success("Receivable added");
      }
      setShowModal(false);
      fetchList();
    } catch (err) {
      console.error(err);
      toast.error(editing ? "Update failed" : "Add failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this receivable?")) return;
    try {
      await accountReceivableApi.delete(id);
      toast.success("Deleted");
      fetchList();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className={embedded ? "min-h-0" : "min-h-screen bg-gray-50 py-8 px-4"}>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h2 className="text-2xl font-bold text-[#108587]">Account Receivable</h2>
          <div className="flex gap-3 items-center">
            <div className="bg-white p-3 rounded shadow text-sm">
              <div className="text-xs text-gray-500">0-30 days</div>
              <div className="text-lg font-semibold">Rs {agingBuckets(list)['0-30']?.toLocaleString('en-PK') || 0}</div>
            </div>
            <div className="bg-white p-3 rounded shadow text-sm">
              <div className="text-xs text-gray-500">31-60 days</div>
              <div className="text-lg font-semibold">Rs {agingBuckets(list)['31-60']?.toLocaleString('en-PK') || 0}</div>
            </div>
            <div className="bg-white p-3 rounded shadow text-sm">
              <div className="text-xs text-gray-500">60+ days</div>
              <div className="text-lg font-semibold">Rs {agingBuckets(list)['60+']?.toLocaleString('en-PK') || 0}</div>
            </div>
            <button onClick={openAdd} className="flex items-center gap-2 bg-[#108587] text-white px-4 py-2 rounded-lg hover:bg-[#0e7274]">
              <Plus size={18} /> Add Receivable
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#17BCBE]" />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No receivables. Click &quot;Add Receivable&quot; to add one.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#E8F8F9]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#108587] uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#108587] uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#108587] uppercase">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#108587] uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#108587] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {list.map((row) => {
                  const d = row.due_date?.toDate ? row.due_date.toDate() : row.due_date;
                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{row.customer_name}</td>
                      <td className="px-4 py-3 font-medium">Rs {Number(row.amount).toLocaleString('en-PK')}</td>
                      <td className="px-4 py-3 text-gray-600">{d ? format(new Date(d), "dd/MM/yyyy") : "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${row.status === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(row)} className="p-1.5 text-[#108587] hover:bg-[#E8F8F9] rounded"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-[#108587]">{editing ? "Edit" : "Add"} Receivable</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#108587] mb-1">Customer Name *</label>
                  <input value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#108587]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#108587] mb-1">Amount (Rs) *</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#108587]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#108587] mb-1">Description</label>
                  <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#108587]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#108587] mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#108587]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#108587] mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#108587]">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#108587] text-white rounded hover:bg-[#0e7274]">Save</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
