import React, { useState, useEffect, useContext, useMemo } from "react";
import { customersApi, customerRecordsApi, deletedRecordsApi } from "../services/firebaseApi";
import { FinancialContext } from '../contexts/FinancialContext';
import { customerDataDataContext } from "./CustomerContext";
import AddRecordModal from "../components/AddRecordModal";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format, subMonths, startOfYear, endOfYear } from "date-fns";
import { Download, Plus, ChevronLeft, ChevronRight } from "lucide-react";

const FILTER_OPTIONS = [
  { value: "all", label: "All Record" },
  { value: "month", label: "Last Month" },
  { value: "sixMonths", label: "Last Six Months" },
  { value: "year", label: "Last Year" },
  { value: "custom", label: "Custom" },
];

function CustomerDetails({ embedded = false }) {
  const [customers, setCustomers] = useState([]);
  const [customerRecords, setCustomerRecords] = useState({});
  const [customerBalances, setCustomerBalances] = useState({});
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { setCustomerData, setCustomerId } = useContext(customerDataDataContext);
  const adminId = localStorage.getItem("adminId");

  const calculateCurrentBalance = (records) => {
    return records.reduce((balance, record) => {
      if (record.type === "send") return balance + (record.total_amount || 0);
      if (record.type === "receive") return balance - (record.amount || 0);
      return balance;
    }, 0);
  };

  const calculateRunningBalance = (records, currentIndex) => {
    return records.slice(0, currentIndex + 1).reduce((balance, record) => {
      if (record.type === "send") return balance + (record.total_amount || 0);
      if (record.type === "receive") return balance - (record.amount || 0);
      return balance;
    }, 0);
  };

  const getRecordDate = (record) => {
    const t = record.created_at;
    if (!t) return null;
    return t.toDate ? t.toDate() : new Date(t);
  };

  const filterRecords = (records, period, from, to) => {
    const now = new Date();
    return (records || []).filter((record) => {
      const recordDate = getRecordDate(record);
      if (!recordDate) return false;
      switch (period) {
        case "month":
          return format(recordDate, "MM-yyyy") === format(now, "MM-yyyy");
        case "sixMonths":
          return recordDate >= subMonths(now, 6);
        case "year":
          return recordDate >= startOfYear(now) && recordDate <= endOfYear(now);
        case "custom":
          if (!from || !to) return true;
          const fromDate = new Date(from + "T00:00:00");
          const toDate = new Date(to + "T23:59:59");
          return recordDate >= fromDate && recordDate <= toDate;
        default:
          return true;
      }
    });
  };

  const generatePDF = async (customer, records) => {
    try {
      const { jsPDF } = await import("jspdf");
      const { autoTable } = await import("jspdf-autotable");
      const filteredRecords = filterRecords(records || [], filterPeriod, customFrom, customTo)
        .sort((a, b) => getRecordDate(b) - getRecordDate(a));
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Customer Report - ${customer.name}`, 14, 15);
      doc.setFontSize(12);
      doc.text(`Generated on: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 25);
      doc.text(`Phone: ${customer.phone}`, 14, 35);
      doc.text(`Balance: Rs ${(customerBalances[customer.id] || 0).toLocaleString('en-PK')}`, 14, 45);
      const tableData = filteredRecords.map((record, index) => {
        const runningBalance = calculateRunningBalance(filteredRecords.slice().reverse(), filteredRecords.length - 1 - index);
        return [
          format(getRecordDate(record), "dd/MM/yyyy"),
          record.type === "send" ? "Product Sent" : "Payment Received",
          record.type === "send" ? `${record.product_name} x ${record.quantity}` : "Payment",
          record.type === "receive" ? (record.payment_method || "").toUpperCase() : "-",
          `Rs ${record.type === "send" ? Number(record.total_amount || 0).toLocaleString('en-PK') : Number(record.amount || 0).toLocaleString('en-PK')}`,
          `Rs ${Number(runningBalance || 0).toLocaleString('en-PK')}`,
        ];
      });
      autoTable(doc, {
        head: [["Date", "Type", "Details", "Payment Method", "Amount", "Balance"]],
        body: tableData,
        startY: 55,
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 25 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 }, 4: { cellWidth: 25 }, 5: { cellWidth: 25 } },
      });
      doc.save(`${customer.name}_report_${format(new Date(), "dd-MM-yyyy")}.pdf`);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate report");
    }
  };

  const fetchCustomersAndRecords = async () => {
    try {
      const customersList = await customersApi.getByAdmin(adminId);
      setCustomers(customersList);
      setCustomerData(customersList);
      if (customersList.length > 0 && !selectedCustomerId) setSelectedCustomerId(customersList[0].id);
      for (const customer of customersList) {
        const records = await customerRecordsApi.getByCustomerAndAdmin(customer.id, adminId);
        setCustomerRecords((prev) => ({ ...prev, [customer.id]: records }));
        setCustomerBalances((prev) => ({ ...prev, [customer.id]: calculateCurrentBalance(records) }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch customer data");
    }
  };

  useEffect(() => {
    fetchCustomersAndRecords();
  }, []);

  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) setSelectedCustomerId(customers[0].id);
  }, [customers]);

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === selectedCustomerId), [customers, selectedCustomerId]);
  const rawRecords = selectedCustomerId ? (customerRecords[selectedCustomerId] || []) : [];
  const filteredRecords = useMemo(
    () => filterRecords(rawRecords, filterPeriod, customFrom, customTo).sort((a, b) => getRecordDate(b) - getRecordDate(a)),
    [rawRecords, filterPeriod, customFrom, customTo]
  );
  const totalRows = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const pageIndex = Math.min(currentPage, totalPages);
  const startIndex = (pageIndex - 1) * rowsPerPage;
  const paginatedRecords = useMemo(() => filteredRecords.slice(startIndex, startIndex + rowsPerPage), [filteredRecords, startIndex, rowsPerPage]);

  const addRecord = () => {
    if (selectedCustomerId) setShowAddModal(true);
    else toast.info("Select a customer first");
  };

  const financial = React.useContext(FinancialContext);

  const deleteCustomerAndRecords = async (customerIdToDelete) => {
    try {
      const isConfirmed = window.confirm("Are you sure you want to delete this customer and all their records? This action cannot be undone.");
      if (!isConfirmed) return;
      const customer = customers.find((c) => c.id === customerIdToDelete);
      const records = customerRecords[customerIdToDelete] || [];
      // Void receivables associated with this customer (audit + data integrity)
      try {
        await financial.voidReceivablesForCustomer({ admin_id: adminId, customer_id: customerIdToDelete, reason: 'Customer deleted with records' });
      } catch (e) {
        console.error('Failed to void receivables before deleting customer:', e);
      }
      await deletedRecordsApi.add({ type: "customer_with_records", admin_id: adminId, customerName: customer?.name, recordCount: records.length });
      await customerRecordsApi.deleteByCustomer(customerIdToDelete, adminId);
      await customersApi.delete(customerIdToDelete);
      setCustomers((prev) => prev.filter((c) => c.id !== customerIdToDelete));
      setCustomerRecords((prev) => {
        const next = { ...prev };
        delete next[customerIdToDelete];
        return next;
      });
      setCustomerBalances((prev) => {
        const next = { ...prev };
        delete next[customerIdToDelete];
        return next;
      });
      if (selectedCustomerId === customerIdToDelete) setSelectedCustomerId(customers.find((c) => c.id !== customerIdToDelete)?.id || "");
      toast.success("Customer and all records deleted successfully!");
    } catch (error) {
      console.error("Error deleting customer and records:", error);
      toast.error("Error deleting customer. Please try again.");
    }
  };

  return (
    <div className={embedded ? "min-h-0" : "min-h-screen bg-gray-50 py-6 px-4"}>
      <div className="max-w-6xl mx-auto">
        {/* Customer selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#108587] mb-2">Customer</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => {
              setSelectedCustomerId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full max-w-md border border-[#20dbdf] rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-[#108587] focus:border-[#17BCBE] text-gray-900"
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.phone ? ` – ${c.phone}` : ""}</option>
            ))}
          </select>
        </div>

        {!selectedCustomer ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500 border border-[#E8F8F9]">
            {customers.length === 0 ? "No customers found. Add customers from Home → Customer." : "Select a customer to view details."}
          </div>
        ) : (
          <>
            {/* Header: customer name */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedCustomer.name}</h1>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <select
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-[#20dbdf] rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-[#108587] focus:border-[#17BCBE]"
              >
                {FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {filterPeriod === "custom" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="border border-[#20dbdf] rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#108587]"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="border border-[#20dbdf] rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#108587]"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => generatePDF(selectedCustomer, rawRecords)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#108587] text-white rounded-lg hover:bg-[#0e7274] transition-colors font-medium"
              >
                <Download size={18} />
                Download Report
              </button>
              <button
                type="button"
                onClick={addRecord}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#108587] text-white hover:bg-[#0e7274] transition-colors"
                aria-label="Add record"
              >
                <Plus size={22} />
              </button>
              <button
                type="button"
                onClick={() => deleteCustomerAndRecords(selectedCustomer.id)}
                className="ml-auto px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete customer & records
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden border border-[#E8F8F9]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#E8F8F9]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#108587] uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#108587] uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#108587] uppercase tracking-wider">Details</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#108587] uppercase tracking-wider">Payment Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#108587] uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#108587] uppercase tracking-wider">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No records in this period.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((record, indexInPage) => {
                        const indexInFiltered = startIndex + indexInPage;
                        const runningBalance = calculateRunningBalance(filteredRecords.slice().reverse(), filteredRecords.length - 1 - indexInFiltered);
                        const recordDate = getRecordDate(record);
                        return (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {recordDate ? format(recordDate, "dd/MM/yyyy") : "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  record.type === "send" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                                }`}
                              >
                                {record.type === "send" ? "Product Send" : "Payment Receive"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {record.type === "send" ? `${record.product_name || "-"} X ${record.quantity ?? 0}` : "Payment"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {record.type === "receive" ? (record.payment_method || "—").toUpperCase() : "—"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              Rs {Number(record.type === "send" ? record.total_amount : record.amount).toLocaleString('en-PK')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              <span className={runningBalance > 0 ? "text-red-600" : "text-green-600"}>Rs {Number(runningBalance || 0).toLocaleString('en-PK')}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalRows > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {startIndex + 1}-{Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Rows per page:</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
                      >
                        {[5, 10, 25, 50].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={pageIndex <= 1}
                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm text-gray-700 px-2">
                        {pageIndex} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={pageIndex >= totalPages}
                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                        aria-label="Next page"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AddRecordModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        customerId={selectedCustomerId}
        customerName={selectedCustomer?.name}
        onSuccess={fetchCustomersAndRecords}
      />
    </div>
  );
}

export default CustomerDetails;
