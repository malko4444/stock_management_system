import React, { useState, useEffect, useContext, useMemo } from "react";
import { LoanContext } from "../contexts/LoanContext";
import { customerDataDataContext } from "./CustomerContext";
import AddRecordModal from "../components/AddRecordModal";
import { toast } from "react-toastify";
import { format, subMonths, startOfYear, endOfYear } from "date-fns";
import { Download, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import { customerRecordsApi } from "../services/firebaseApi";
import DeleteRecordsPeriodModal from "../components/DeleteRecordsPeriodModal";

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

const FILTER_OPTIONS = [
  { value: "all", label: "All Records" },
  { value: "month", label: "Last Month" },
  { value: "sixMonths", label: "Last Six Months" },
  { value: "year", label: "Last Year" },
];

export default function CustomerDetails({ embedded = false }) {
  const { customers, deleteCustomer, getCustomerDues, getCustomerRecords, deleteCustomerRecordsByPeriod, loading } = useContext(LoanContext);
  const { setCustomerId } = useContext(customerDataDataContext); // For backwards compatibility if needed

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteRecordsModal, setShowDeleteRecordsModal] = useState(false);
  const [isDeletingRecords, setIsDeletingRecords] = useState(false);
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Use the records from the shared context ledger directly
  const rawRecords = useMemo(() => {
    if (!selectedCustomerId) return [];
    return getCustomerRecords(selectedCustomerId);
  }, [selectedCustomerId, getCustomerRecords]);

  const adminId = localStorage.getItem("adminId");

  // Auto-select first customer if none selected
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  const selectedCustomer = useMemo(() => 
    customers.find((c) => c.id === selectedCustomerId), 
  [customers, selectedCustomerId]);

  // Current balance
  const currentDues = useMemo(() => {
    if (!selectedCustomerId) return 0;
    return getCustomerDues(selectedCustomerId);
  }, [selectedCustomerId, getCustomerDues]);

  // Analytics
  const analytics = useMemo(() => {
    if (!rawRecords || rawRecords.length === 0) return { totalPaid: 0, totalLoaned: 0, goodwillIndex: 0 };
    let totalPaid = 0;
    let totalLoaned = 0;
    
    rawRecords.forEach(record => {
       const amt = Number(record.amount || record.total_amount || 0);
       if (record.type === "product_send" || record.type === "purchase" || record.type === "send") {
           totalLoaned += amt;
       } else {
           totalPaid += amt;
       }
    });

    let goodwillIndex = 0;
    if (totalLoaned > 0) {
        const ratio = totalPaid / totalLoaned;
        if (ratio >= 1) goodwillIndex = 5;
        else if (ratio >= 0.8) goodwillIndex = 4;
        else if (ratio >= 0.5) goodwillIndex = 3;
        else if (ratio >= 0.2) goodwillIndex = 2;
        else goodwillIndex = 1;
    } else if (totalPaid > 0) {
        goodwillIndex = 5;
    }

    return { totalPaid, totalLoaned, goodwillIndex };
  }, [rawRecords]);

  // Calculate chronological running balance by summing backwards from current absolute
  // Since LoanContext orders records newest-first (descending timestamp),
  // we iterate backwards from end of the array to beginning
  const recordsWithRunningBalance = useMemo(() => {
    if (!rawRecords || rawRecords.length === 0) return [];
    
    // Create a copy because we'll add the runningBalance property
    const records = [...rawRecords].map(r => ({...r}));
    
    // Reverse logic: start with the absolute final balance from context
    let runningBalance = currentDues;

    // Traverse the array from newest (index 0) to oldest (index N)
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        // At this exact moment, the balance was runningBalance
        record.runningBalance = runningBalance;
        
        // Now, undo the effect of THIS record so the NEXT iteration (older record) 
        // has the correct balance from before this record occurred
        const isAddingDues = record.type === "product_send" || record.type === "purchase" || record.type === "send";
        const amt = Number(record.amount || record.total_amount || 0);

        if (isAddingDues) {
           // If they added dues, the balance BEFORE was lower
           runningBalance -= amt;
        } else {
           // If they paid, the balance BEFORE was higher
           runningBalance += amt;
        }
    }
    
    return records;
  }, [rawRecords, currentDues]);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    return recordsWithRunningBalance.filter((record) => {
      let recordDate = record.created_at;
      if (recordDate && typeof recordDate.toDate === 'function') {
         recordDate = recordDate.toDate();
      } else {
         recordDate = new Date(recordDate);
      }
      
      if (!recordDate || isNaN(recordDate.getTime())) return true; // Keep old poorly formed records just in case

      switch (filterPeriod) {
        case "month":
          return format(recordDate, "MM-yyyy") === format(now, "MM-yyyy");
        case "sixMonths":
          return recordDate >= subMonths(now, 6);
        case "year":
          return recordDate >= startOfYear(now) && recordDate <= endOfYear(now);
        default:
          return true;
      }
    });
  }, [recordsWithRunningBalance, filterPeriod]);

  const totalRows = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const pageIndex = Math.min(currentPage, totalPages);
  const startIndex = (pageIndex - 1) * rowsPerPage;
  const paginatedRecords = useMemo(() => 
    filteredRecords.slice(startIndex, startIndex + rowsPerPage), 
  [filteredRecords, startIndex, rowsPerPage]);

  const generatePDF = async () => {
    if (!selectedCustomer) return;
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      
      const doc = new jsPDF();
      const brandColor = [16, 133, 135]; // #108587
      
      // Header Section
      doc.setFontSize(22);
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text("STOCK EASE", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text("Financial Ledger Report", 14, 26);
      
      // Date & Info (Right Aligned)
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 14, 20, { align: "right" });
      
      // Divider
      doc.setDrawColor(232, 248, 249);
      doc.line(14, 32, pageWidth - 14, 32);
      
      // Customer Info
      doc.setFontSize(14);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text(selectedCustomer.name, 14, 42);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(`Phone: ${selectedCustomer.phone || "N/A"}`, 14, 48);
      
      // Summary Cards (Color Blocks)
      const summaryY = 55;
      const cardWidth = (pageWidth - 28 - 10) / 3;
      
      // Outstanding Card
      doc.setFillColor(255, 231, 231); // Soft Red
      doc.roundedRect(14, summaryY, cardWidth, 18, 2, 2, "F");
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      doc.text("PENDING DUES", 18, summaryY + 6);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Rs ${currentDues.toLocaleString()}`, 18, summaryY + 13);
      
      // Total Loaned
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(14 + cardWidth + 5, summaryY, cardWidth, 18, 2, 2, "F");
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.setFont("helvetica", "normal");
      doc.text("TOTAL PURCHASE", 14 + cardWidth + 9, summaryY + 6);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Rs ${analytics.totalLoaned.toLocaleString()}`, 14 + cardWidth + 9, summaryY + 13);
      
      // Total Paid
      doc.setFillColor(232, 248, 249); // Brand Light
      doc.roundedRect(14 + (cardWidth + 5) * 2, summaryY, cardWidth, 18, 2, 2, "F");
      doc.setFontSize(8);
      doc.setTextColor(16, 133, 135);
      doc.setFont("helvetica", "normal");
      doc.text("TOTAL PAID", 14 + (cardWidth + 5) * 2 + 4, summaryY + 6);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Rs ${analytics.totalPaid.toLocaleString()}`, 14 + (cardWidth + 5) * 2 + 4, summaryY + 13);
      
      const tableData = filteredRecords.map((record) => {
        let rDate = record.created_at?.toDate ? record.created_at.toDate() : new Date(record.created_at);
        if (isNaN(rDate.getTime())) rDate = new Date();
        
        const isPurchase = record.type === "purchase" || record.type === "send" || record.type === "product_send";
        return [
          format(rDate, "dd/MM/yyyy, hh:mm a"),
          isPurchase ? "Dues Added" : "Payment Received",
          isPurchase ? (record.product_name || record.description || "Product/Goods") : (record.payment_method || record.description || "Payment"),
          `Rs ${Number(record.amount || record.total_amount || 0).toLocaleString()}`,
          !isPurchase && record.clearance_date ? format(new Date(record.clearance_date), "dd/MM/yyyy") : "-",
          `Rs ${Number(record.runningBalance || 0).toLocaleString()}`,
        ];
      });
      
      autoTable(doc, {
        head: [["Date", "Type", "Details", "Amount", "Clearance", "Balance"]],
        body: tableData,
        startY: 80,
        theme: "striped",
        headStyles: { 
          fillColor: brandColor, 
          textColor: 255, 
          fontSize: 9, 
          fontStyle: "bold",
          halign: "left"
        },
        columnStyles: {
          3: { halign: "right" },
          5: { halign: "right", fontStyle: "bold" }
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 4, 
          overflow: "linebreak",
          valign: "middle",
          font: "helvetica"
        },
        alternateRowStyles: {
          fillColor: [249, 252, 252]
        }
      });
      
      doc.save(`${selectedCustomer.name}_Ledger_${format(new Date(), "ddMMyy")}.pdf`);
      toast.success("Professional report generated!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Make sure plugins are loaded.");
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!deletingId) return;
    try {
      await deleteCustomer(deletingId);
      toast.success("Customer and all records deleted successfully!");
      if (selectedCustomerId === deletingId) {
        setSelectedCustomerId("");
      }
      setShowDeleteModal(false);
      setDeletingId(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to delete customer");
    }
  };

  const handleDeleteRecords = async (period) => {
    if (!selectedCustomerId) return;
    setIsDeletingRecords(true);
    try {
      const success = await deleteCustomerRecordsByPeriod(adminId, selectedCustomerId, period);
      if (success) {
        setShowDeleteRecordsModal(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete records. Please try again.");
    } finally {
      setIsDeletingRecords(false);
    }
  };

  return (
    <div className={embedded ? "min-h-0" : "min-h-screen bg-gray-50 py-6 px-4"}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-white p-4 rounded-2xl shadow-sm border border-[#E8F8F9]">
            <div className="w-full md:w-1/3">
                <label className="block text-[10px] font-bold text-[#108587] mb-1.5 uppercase tracking-tight ml-1">Select Customer Account</label>
                <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setCurrentPage(1);
                    }}
                    className="w-full border border-[#20dbdf] rounded-lg px-4 py-2 bg-white focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] text-sm text-gray-900 transition-all outline-none cursor-pointer"
                >
                    <option value="">-- Choose Account --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? " (" + c.phone + ")" : ""}
                      </option>
                    ))}
                </select>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-[#20dbdf] rounded-lg px-3 py-2 bg-white text-xs font-bold text-gray-600 focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none cursor-pointer"
              >
                {FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={generatePDF}
                disabled={!selectedCustomer || filteredRecords.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 bg-white border border-[#108587] text-[#108587] rounded-lg hover:bg-[#108587]/5 transition-all text-xs font-bold disabled:opacity-30 shadow-sm cursor-pointer"
              >
                <Download size={16} />
                <span>Export PDF</span>
              </button>
              
              {selectedCustomer && (
                <button
                   onClick={() => setShowAddModal(true)}
                   className="inline-flex items-center gap-2 px-5 py-2 bg-[#108587] text-white rounded-lg hover:bg-[#0e7274] shadow-md shadow-[#108587]/10 transition-all text-xs font-bold active:scale-95 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>New Record</span>
                </button>
              )}
            </div>
        </div>

        {!selectedCustomer ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="text-gray-400 mb-3 flex justify-center"><ChevronRight size={40}/></div>
            <h3 className="text-lg font-medium text-gray-900">No Account Selected</h3>
            <p className="text-gray-500 mt-1">
              Select a customer from the dropdown above to view their financial ledger and records.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar Profile Card */}
            <div className="col-span-1 border border-gray-100 bg-white rounded-xl shadow-sm p-6 flex flex-col items-center text-center h-fit">
               <div className="w-20 h-20 bg-[#E8F8F9] text-[#108587] rounded-full flex justify-center items-center text-2xl font-bold mb-4">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
               </div>
               <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
               <p className="text-sm text-gray-500 mt-1">{selectedCustomer.phone || "No Phone Number"}</p>
               <p className="text-sm text-gray-500">{selectedCustomer.address || "No Address"}</p>
               
               <div className="w-full my-6 border-t border-gray-100"></div>
               
               <p className="text-sm font-medium text-gray-600 w-full text-left">Current Pending Dues</p>
               {loading ? (
                   <Skeleton className="h-9 w-32 mt-1" />
               ) : (
                   <p className={`text-3xl font-bold w-full text-left mt-1 ${currentDues > 0 ? "text-red-600" : "text-gray-900"}`}>
                     Rs {currentDues.toLocaleString()}
                   </p>
               )}

               <div className="w-full flex justify-between mt-4 text-sm">
                  <span className="text-gray-500">Total Paid:</span>
                  {loading ? <Skeleton className="h-5 w-20" /> : <span className="font-semibold text-green-600">Rs {analytics.totalPaid.toLocaleString()}</span>}
               </div>
               <div className="w-full flex justify-between mt-1 text-sm">
                  <span className="text-gray-500">Total purchase:</span>
                  {loading ? <Skeleton className="h-5 w-20" /> : <span className="font-semibold text-red-600">Rs {analytics.totalLoaned.toLocaleString()}</span>}
               </div>
               
               <div className="w-full mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#108587]">Goodwill Index</span>
                  <div className="flex text-yellow-400">
                     {loading ? (
                         <Skeleton className="h-4 w-24" />
                     ) : (
                         [...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-4 h-4 ${i < analytics.goodwillIndex ? "fill-current" : "text-gray-300 fill-current"}`} viewBox="0 0 20 20">
                               <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                         ))
                     )}
                  </div>
               </div>
               
               <button
                  disabled={isDeletingRecords}
                  onClick={() => setShowDeleteRecordsModal(true)}
                  className="w-full mt-6 py-2 text-red-500 border border-transparent rounded-lg flex items-center justify-center gap-2 hover:bg-red-50 transition-all font-bold text-xs cursor-pointer disabled:opacity-50"
               >
                 <Trash2 size={16} />
                 {isDeletingRecords ? "Deleting..." : "Delete Records"}
               </button>
               
               <button
                  onClick={() => {
                    setDeletingId(selectedCustomer.id);
                    setShowDeleteModal(true);
                  }}
                  className="w-full mt-2 py-2 text-red-400 border border-transparent rounded-lg flex items-center justify-center gap-2 hover:bg-red-50 transition-all font-bold text-xs cursor-pointer"
               >
                 <Trash2 size={16} />
                 Delete Account
               </button>
            </div>
            
            {/* Main Ledger Table */}
            <div className="col-span-1 lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#E8F8F9]">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-[#108587] uppercase tracking-wider">Date of Deal</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-[#108587] uppercase tracking-wider">Type</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-[#108587] uppercase tracking-wider">Item / $ Mode</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-[#108587] uppercase tracking-wider">Amount Due</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-[#108587] uppercase tracking-wider">Clearance Date</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-[#108587] uppercase tracking-wider">Balance After</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                  {loading && paginatedRecords.length === 0 ? (
                      [...Array(5)].map((_, i) => (
                          <tr key={i}>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                              <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                          </tr>
                      ))
                  ) : paginatedRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                            No matching records found.
                          </td>
                        </tr>
                      ) : (
                        paginatedRecords.map((record) => {
                          let recordDate = record.created_at?.toDate ? record.created_at.toDate() : new Date(record.created_at);
                          if (isNaN(recordDate)) recordDate = new Date(); // fallback
                          
                          // Convert type securely
                          const isAddingDues = record.type === "purchase" || record.type === "send" || record.type === "product_send";
                          const recordAmount = Number(record.amount || record.total_amount || 0);

                          return (
                            <tr key={record.id} className="hover:bg-gray-50/50">
                              <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                                {format(recordDate, "dd MMM yyyy, hh:mm a")}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${
                                    isAddingDues ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"
                                  }`}
                                >
                                  {isAddingDues ? "Dues Added" : "Payment Received"}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-900 max-w-[200px] truncate">
                                {isAddingDues ? (record.product_name || record.description || "Product/Goods") : (record.payment_method || record.description || "Payment")}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                {isAddingDues ? "+" : "-"} Rs {recordAmount.toLocaleString()}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                                {!isAddingDues && record.clearance_date ? format(new Date(record.clearance_date), "dd MMM yyyy") : "-"}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <span className={record.runningBalance > 0 ? "text-red-700" : "text-green-700"}>
                                  Rs {(record.runningBalance || 0).toLocaleString()}
                                </span>
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
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1}-{Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows} records
                    </div>
                    <div className="flex items-center gap-2">
                       <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={pageIndex <= 1}
                          className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50 text-gray-600 transition"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-medium text-gray-700 px-2 lg:px-4">{pageIndex} / {totalPages}</span>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={pageIndex >= totalPages}
                          className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50 text-gray-600 transition"
                        >
                          <ChevronRight size={20} />
                        </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        )}
      </div>

      <AddRecordModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        customerId={selectedCustomerId}
        customerName={selectedCustomer?.name}
      />

      {showDeleteRecordsModal && (
        <DeleteRecordsPeriodModal
          isOpen={showDeleteRecordsModal}
          onClose={() => setShowDeleteRecordsModal(false)}
          onConfirm={handleDeleteRecords}
          customerName={selectedCustomer?.name}
        />
      )}
      
      {showDeleteModal && (
        <DeleteConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setDeletingId(null);
            }}
            onConfirm={confirmDeleteCustomer}
            title="Delete Customer Account"
            message={`Are you sure you want to permanently delete ${selectedCustomer?.name}? This will securely erase all their historical ledger records.`}
        />
      )}
    </div>
  );
}
