import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import React, { useState, useEffect, useContext, useMemo } from "react";
import { db } from "../../firebaseConfig";
import { customerDataDataContext } from "./CustomerContext";
import { Link } from "react-router-dom";
import { NavBar } from "../components/NavBar";
import { toast } from "react-toastify";
import { format, subMonths, startOfYear } from "date-fns";
import {
  Users,
  Search,
  Download,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Filter,
} from "lucide-react";

function CustomerDetails() {
  const [customers, setCustomers] = useState([]);
  const [customerRecords, setCustomerRecords] = useState({});
  const [customerBalances, setCustomerBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const { setCustomerData, setCustomerId } = useContext(customerDataDataContext);
  const adminId = localStorage.getItem("adminId");

  const calculateCurrentBalance = (records) =>
    records.reduce((balance, record) => {
      if (record.type === "send") return balance + (Number(record.total_amount) || 0);
      if (record.type === "receive") return balance - (Number(record.amount) || 0);
      return balance;
    }, 0);

  const calculateRunningBalance = (records, currentIndex) =>
    records.slice(0, currentIndex + 1).reduce((balance, record) => {
      if (record.type === "send") return balance + (Number(record.total_amount) || 0);
      if (record.type === "receive") return balance - (Number(record.amount) || 0);
      return balance;
    }, 0);

  const filterRecords = (records, period) => {
    const now = new Date();
    return records.filter((record) => {
      if (!record.created_at?.toDate) return true;
      const recordDate = record.created_at.toDate();
      switch (period) {
        case "month":
          return format(recordDate, "MM-yyyy") === format(now, "MM-yyyy");
        case "sixMonths":
          return recordDate >= subMonths(now, 6);
        case "year":
          return recordDate >= startOfYear(now);
        default:
          return true;
      }
    });
  };

  const generatePDF = async (customer, records) => {
    try {
      const { jsPDF } = await import("jspdf");
      const { autoTable } = await import("jspdf-autotable");

      const docInstance = new jsPDF();
      const filteredRecords = filterRecords(records || [], filterPeriod).sort(
        (a, b) => b.created_at?.toDate() - a.created_at?.toDate()
      );

      docInstance.setFontSize(18);
      docInstance.text(`Customer Report - ${customer.name}`, 14, 15);
      docInstance.setFontSize(12);
      docInstance.text(`Generated on: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 25);
      docInstance.text(`Phone: ${customer.phone || "-"}`, 14, 35);
      docInstance.text(`Balance: Rs ${customerBalances[customer.id] || 0}`, 14, 45);

      const tableData = filteredRecords.map((record, index) => {
        const runningBalance = calculateRunningBalance(
          filteredRecords.slice().reverse(),
          filteredRecords.length - 1 - index
        );
        return [
          format(record.created_at.toDate(), "dd/MM/yyyy"),
          record.type === "send" ? "Product Sent" : "Payment Received",
          record.type === "send" ? `${record.product_name} x ${record.quantity}` : "Payment",
          record.type === "receive" ? record.payment_method?.toUpperCase() || "-" : "-",
          `Rs ${record.type === "send" ? record.total_amount : record.amount}`,
          `Rs ${runningBalance}`,
        ];
      });

      autoTable(docInstance, {
        head: [["Date", "Type", "Details", "Payment Method", "Amount", "Balance"]],
        body: tableData,
        startY: 55,
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 40 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
        },
      });

      docInstance.save(`${customer.name}_report_${format(new Date(), "dd-MM-yyyy")}.pdf`);
      toast.success("Report downloaded");
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Failed to generate report");
    }
  };

  const fetchCustomersAndRecords = async () => {
    try {
      setLoading(true);
      const customerQuery = query(collection(db, "customers"), where("adminId", "==", adminId));
      const customerSnapshot = await getDocs(customerQuery);
      const customersList = customerSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCustomers(customersList);
      setCustomerData(customersList);

      const records = {};
      const balances = {};

      await Promise.all(
        customersList.map(async (customer) => {
          const recordQuery = query(
            collection(db, "customerRecord"),
            where("customer_id", "==", customer.id),
            where("admin_id", "==", adminId)
          );
          const recordSnapshot = await getDocs(recordQuery);
          const recs = recordSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          records[customer.id] = recs;
          balances[customer.id] = calculateCurrentBalance(recs);
        })
      );

      setCustomerRecords(records);
      setCustomerBalances(balances);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to fetch customer data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersAndRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectCustomer = (id) => setCustomerId(id);

  const deleteCustomerAndRecords = async (customer) => {
    const ok = window.confirm(
      `Delete "${customer.name}" and ALL of their records? This cannot be undone.`
    );
    if (!ok) return;
    try {
      const recordsQuery = query(
        collection(db, "customerRecord"),
        where("customer_id", "==", customer.id),
        where("admin_id", "==", adminId)
      );
      const recordsSnapshot = await getDocs(recordsQuery);
      await Promise.all(recordsSnapshot.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "customers", customer.id));

      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      setCustomerRecords((prev) => {
        const next = { ...prev };
        delete next[customer.id];
        return next;
      });
      setCustomerBalances((prev) => {
        const next = { ...prev };
        delete next[customer.id];
        return next;
      });

      toast.success("Customer deleted");
    } catch (err) {
      console.error("Error deleting customer:", err);
      toast.error("Error deleting customer");
    }
  };

  const deleteAllRecords = async () => {
    const ok = window.confirm("WARNING: This deletes ALL customers and their records. Continue?");
    if (!ok) return;

    try {
      setIsDeletingAll(true);
      const customerQuery = query(collection(db, "customers"), where("adminId", "==", adminId));
      const customerSnapshot = await getDocs(customerQuery);

      for (const customerDoc of customerSnapshot.docs) {
        const recordsQuery = query(
          collection(db, "customerRecord"),
          where("customer_id", "==", customerDoc.id),
          where("admin_id", "==", adminId)
        );
        const recordsSnapshot = await getDocs(recordsQuery);
        await Promise.all(recordsSnapshot.docs.map((d) => deleteDoc(d.ref)));
        await deleteDoc(doc(db, "customers", customerDoc.id));
      }

      setCustomers([]);
      setCustomerRecords({});
      setCustomerBalances({});
      setCustomerData([]);
      toast.success("All customers and records deleted");
    } catch (err) {
      console.error("Error deleting data:", err);
      toast.error("Error deleting data");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const s = search.trim().toLowerCase();
    return customers.filter((c) =>
      [c.name, c.phone, c.address].filter(Boolean).some((v) => String(v).toLowerCase().includes(s))
    );
  }, [customers, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Customers</h1>
            <p className="text-sm text-slate-500 mt-1">View balances and transaction history</p>
          </div>
          <button
            onClick={deleteAllRecords}
            disabled={isDeletingAll || customers.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeletingAll ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {isDeletingAll ? "Deleting..." : "Delete all"}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <Users size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {filteredCustomers.length} customer{filteredCustomers.length === 1 ? "" : "s"}
              </div>
              <div className="text-xs text-slate-500">{customers.length} total</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers"
                className="w-full sm:w-72 pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All records</option>
                <option value="month">This month</option>
                <option value="sixMonths">Last 6 months</option>
                <option value="year">This year</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 grid place-items-center mb-3">
              <Users size={18} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">
              {customers.length === 0
                ? "No customers yet. Add one from the dashboard."
                : "No customers match your search."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCustomers.map((customer) => {
              const balance = customerBalances[customer.id] || 0;
              const recordsForCustomer = customerRecords[customer.id] || [];
              const visible = filterRecords(recordsForCustomer, filterPeriod).sort(
                (a, b) => b.created_at?.toDate() - a.created_at?.toDate()
              );
              return (
                <div key={customer.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{customer.name}</h3>
                      <div className="text-sm text-slate-500">
                        {customer.phone}
                        {customer.address ? ` - ${customer.address}` : ""}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold ${
                            balance > 0
                              ? "bg-red-50 text-red-700"
                              : balance < 0
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {balance > 0 && <AlertTriangle size={12} />}
                          Balance: Rs {balance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => generatePDF(customer, recordsForCustomer)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium transition-colors"
                      >
                        <Download size={14} />
                        Report
                      </button>
                      <Link to="/addRecord" onClick={() => selectCustomer(customer.id)}>
                        <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors">
                          <Plus size={14} />
                          New record
                        </button>
                      </Link>
                      <button
                        onClick={() => deleteCustomerAndRecords(customer)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm font-medium transition-colors"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>

                  {visible.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                          <tr>
                            <th className="text-left font-medium px-5 py-3">Date</th>
                            <th className="text-left font-medium px-5 py-3">Type</th>
                            <th className="text-left font-medium px-5 py-3">Details</th>
                            <th className="text-left font-medium px-5 py-3">Payment</th>
                            <th className="text-left font-medium px-5 py-3">Amount</th>
                            <th className="text-left font-medium px-5 py-3">Running balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visible.map((record, index, array) => {
                            const runningBalance = calculateRunningBalance(
                              array.slice().reverse(),
                              array.length - 1 - index
                            );
                            const amount = record.type === "send" ? record.total_amount : record.amount;
                            return (
                              <tr key={record.id} className="hover:bg-slate-50/60">
                                <td className="px-5 py-3 whitespace-nowrap text-slate-700">
                                  {record.created_at?.toDate
                                    ? format(record.created_at.toDate(), "dd/MM/yyyy")
                                    : "-"}
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      record.type === "send"
                                        ? "bg-red-50 text-red-700"
                                        : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    {record.type === "send" ? "Product sent" : "Payment received"}
                                  </span>
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap text-slate-700">
                                  {record.type === "send"
                                    ? `${record.product_name} x ${record.quantity}`
                                    : "Payment"}
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap">
                                  {record.type === "receive" ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                      {record.payment_method?.toUpperCase() || "N/A"}
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap font-medium text-slate-900">
                                  Rs {Number(amount || 0).toLocaleString()}
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap">
                                  <span className={runningBalance > 0 ? "text-red-600" : "text-emerald-600"}>
                                    Rs {runningBalance.toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No records for this period</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerDetails;
