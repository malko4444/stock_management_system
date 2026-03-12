import React, { useContext, useMemo, useState, useEffect } from "react";
import { LoanContext } from "../contexts/LoanContext";
import { customerRecordsApi } from "../services/firebaseApi";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  Star,
  Search,
  ArrowRight
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

export default function LoanSummary() {
  const { customers, globalRecords, loading } = useContext(LoanContext);
  const [searchTerm, setSearchTerm] = useState("");
  const adminId = localStorage.getItem("adminId");

  // Aggregate Statistics
  const stats = useMemo(() => {
    let totalPaid = 0;
    let totalLoaned = 0;

    globalRecords.forEach(record => {
      const amount = Number(record.amount || record.total_amount || 0);
      if (record.type === "product_send" || record.type === "purchase" || record.type === "send") {
        totalLoaned += amount;
      } else {
        totalPaid += amount;
      }
    });

    return { totalPaid, totalLoaned, netOutstanding: totalLoaned - totalPaid };
  }, [globalRecords]);

  // Customer Analytics (Goodwill Index)
  const customerAnalytics = useMemo(() => {
    const analytics = {};

    customers.forEach(c => {
      analytics[c.id] = {
        name: c.name,
        totalPaid: 0,
        totalLoaned: 0,
        paymentCount: 0,
        totalClearanceDays: 0,
        goodwillIndex: 0
      };
    });

    globalRecords.forEach(record => {
      const c = analytics[record.customer_id];
      if (!c) return;
      
      const customer = customers.find(cust => cust.id === record.customer_id);
      const customerName = customer ? customer.name : "Unknown";

      const amount = Number(record.amount || record.total_amount || 0);
      if (record.type === "product_send" || record.type === "purchase" || record.type === "send") {
        c.totalLoaned += amount;
      } else {
        c.totalPaid += amount;
        c.paymentCount += 1;
        
        // Timeliness check: Clearance Date vs Created At (Deal Date)
        if (record.clearance_date) {
            const dealDate = record.created_at?.toDate ? record.created_at.toDate() : new Date(record.created_at);
            const clearDate = new Date(record.clearance_date);
            const diff = differenceInDays(clearDate, dealDate);
            c.totalClearanceDays += Math.max(0, diff);
        }
      }
    });

    // Calculate Final Goodwill Index (1-5)
    Object.values(analytics).forEach(data => {
      let score = 0;
      
      // 1. Ratio Strength (Up to 3 points)
      if (data.totalLoaned > 0) {
        const ratio = data.totalPaid / data.totalLoaned;
        if (ratio >= 1) score += 3;
        else if (ratio >= 0.8) score += 2.5;
        else if (ratio >= 0.5) score += 2;
        else if (ratio >= 0.2) score += 1;
      } else if (data.totalPaid > 0) {
        score += 3;
      }

      // 2. Timeliness Strength (Up to 2 points)
      if (data.paymentCount > 0) {
          const avgDays = data.totalClearanceDays / data.paymentCount;
          if (avgDays <= 3) score += 2;     // Fast (3 days)
          else if (avgDays <= 7) score += 1.5; // Weekly
          else if (avgDays <= 15) score += 1;  // Half month
          else if (avgDays <= 30) score += 0.5; // Month
      }

      data.goodwillIndex = Math.max(1, Math.min(5, Math.ceil(score)));
    });

    return Object.values(analytics).sort((a, b) => b.totalLoaned - a.totalLoaned);
  }, [customers, globalRecords]);

  const filteredHistory = useMemo(() => {
    return globalRecords.map(r => {
        const c = customers.find(cust => cust.id === r.customer_id);
        return { ...r, customerName: c ? c.name : "Unknown" };
    }).filter(r => 
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.product_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.payment_method || "").toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => {
        const da = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
        const db = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
        return db - da; 
    });
  }, [globalRecords, customers, searchTerm]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Global Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan & Credit Summary</h1>
          <p className="text-gray-500">Global financial health and customer credit rankings</p>
        </div>
        <div className="flex gap-2">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
                <Calendar size={18} className="text-[#108587]" />
                <span className="text-sm font-medium text-gray-600">{format(new Date(), "MMMM yyyy")}</span>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-5">
          <div className="h-14 w-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Paid</p>
            {loading ? <Skeleton className="h-8 w-32 mt-1" /> : <p className="text-2xl font-black text-gray-900">Rs {stats.totalPaid.toLocaleString()}</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-5">
          <div className="h-14 w-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
            <TrendingDown size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Loaned</p>
            {loading ? <Skeleton className="h-8 w-32 mt-1" /> : <p className="text-2xl font-black text-gray-900">Rs {stats.totalLoaned.toLocaleString()}</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#108587]/20 bg-[#108587]/5 flex items-center gap-5">
          <div className="h-14 w-14 bg-[#108587] rounded-2xl flex items-center justify-center text-white">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#108587] uppercase tracking-wider">Net Outstanding</p>
            {loading ? <Skeleton className="h-8 w-32 mt-1" /> : <p className="text-2xl font-black text-gray-900">Rs {stats.netOutstanding.toLocaleString()}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Goodwill Table */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-[#E8F8F9]/30">
            <h2 className="font-bold text-[#108587] flex items-center gap-2">
                <Star size={18} className="fill-yellow-400 text-yellow-400" />
                Goodwill Index
            </h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Top Debtor List</span>
          </div>
          <div className="flex-1 overflow-auto max-h-[600px]">
             {loading && customerAnalytics.length === 0 ? (
                 [...Array(8)].map((_, i) => (
                    <div key={i} className="p-4 border-b border-gray-50 flex justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                    </div>
                 ))
             ) : customerAnalytics.map((c, i) => (
                <div key={c.name} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{c.name}</p>
                        <div className="flex text-yellow-400 mt-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} className={i < c.goodwillIndex ? "fill-current" : "text-gray-200 fill-current"} />
                            ))}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-red-600">Rs {(c.totalLoaned - c.totalPaid).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400 uppercase">Outstanding</p>
                    </div>
                </div>
             ))}
          </div>
        </div>

        {/* Global Transaction History */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
          <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="font-bold text-gray-900">Transaction History Log</h2>
            <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search name, product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#108587] focus:border-[#108587]"
                />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase">Customer</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase">Details</th>
                        <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase">Amount</th>
                        <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {loading && filteredHistory.length === 0 ? (
                        [...Array(10)].map((_, i) => (
                            <tr key={i}>
                                <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                                <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                                <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                                <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                            </tr>
                        ))
                    ) : filteredHistory.length === 0 ? (
                        <tr><td colSpan={5} className="py-20 text-center text-gray-400">No records found matching your search.</td></tr>
                    ) : filteredHistory.map((record) => {
                        const isDues = record.type === "product_send" || record.type === "purchase" || record.type === "send";
                        const amt = Number(record.amount || record.total_amount || 0);
                        const date = record.created_at?.toDate ? record.created_at.toDate() : new Date(record.created_at);
                        
                        return (
                            <tr key={record.id} className="hover:bg-gray-50/50 transition">
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                    {format(date, "dd MMM yyyy")}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <p className="text-sm font-bold text-gray-900">{record.customerName}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm text-gray-600 truncate max-w-[150px]">
                                        {isDues ? (record.product_name || "Purchase") : (record.payment_method || "Payment")}
                                    </p>
                                    <p className="text-[10px] text-gray-400">{isDues ? "Credit Sale" : "Receipt"}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <p className={`text-sm font-black ${isDues ? "text-red-600" : "text-green-600"}`}>
                                        {isDues ? "+" : "-"} Rs {amt.toLocaleString()}
                                    </p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isDues ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                                        {isDues ? "Pending" : "Cleared"}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
