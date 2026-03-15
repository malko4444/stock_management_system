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
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  X,
  ChevronDown,
  Filter
} from "lucide-react";
import { format, differenceInDays, subDays, isAfter } from "date-fns";

const RECORDS_PER_PAGE = 10;

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

// Unified Confirmation Modal for Global Clear
const GlobalClearConfirmationModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] overflow-y-auto bg-black/40 backdrop-blur-md pointer-events-auto" onClick={onClose}>
      <div className="min-h-full flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-sm overflow-hidden relative border border-[#E8F8F9] p-8 text-center pointer-events-auto transform transition-all animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-[#DC2626] mx-auto mb-6 shadow-sm border border-red-100/50">
            <Trash2 size={32} strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-bold mb-2 text-[#108587]">Master Reset?</h3>
          <p className="text-xs font-semibold text-gray-500 mb-8 leading-relaxed">
            This will <span className="text-red-600 font-bold underline">delete all history records</span> and reset all customer balances to zero. This action is final and cannot be undone.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="w-full py-3.5 bg-gradient-to-br from-[#DC2626] to-[#ef4444] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/10 transition-all cursor-pointer active:scale-95 hover:scale-[1.02] disabled:opacity-50"
            >
              {isDeleting ? "Clearing Data..." : "Yes, Reset Everything"}
            </button>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="w-full py-3.5 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all cursor-pointer border border-slate-200/50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LoanSummary() {
  const { customers, globalRecords, loading, clearAllRecords } = useContext(LoanContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // time filter: all, week, month
  const [txTypeFilter, setTxTypeFilter] = useState("all"); // transaction type: all, purchase, payment
  const [customerFilter, setCustomerFilter] = useState("all"); // specific customer id
  const [currentPage, setCurrentPage] = useState(1);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const adminId = localStorage.getItem("adminId");

  // Aggregate Statistics based on FILTERED records
  const stats = useMemo(() => {
    let totalPaid = 0;
    let totalLoaned = 0;

    // Use globalRecords for overall stats, but we might want them restricted to filters?
    // User requested "necessary filters", usually these stats are for the view.
    // Let's keep these global for the hero section but filters for the log.
    globalRecords.forEach(record => {
      const amount = Number(record.amount || record.total_amount || 0);
      if (record.type === "product_send" || record.type === "purchase" || record.type === "send") {
        totalLoaned += amount;
      } else {
        totalPaid += amount;
      }
    });

    return { totalPaid, totalLoaned, netPending: totalLoaned - totalPaid };
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
      const cid = record.customer_id || record.customerId;
      const c = analytics[cid];
      if (!c) return;
      
      const customer = customers.find(cust => cust.id === cid);
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
    const now = new Date();
    let history = globalRecords.map(r => {
        const cid = r.customer_id || r.customerId;
        const c = customers.find(cust => cust.id === cid);
        return { ...r, customerName: c ? c.name : "Unknown" };
    });

    // 1. Time-based Filter
    if (filterType === "week") {
        const weekAgo = subDays(now, 7);
        history = history.filter(r => {
            const date = r.created_at?.toDate ? r.created_at.toDate() : new Date(r.created_at);
            return isAfter(date, weekAgo);
        });
    } else if (filterType === "month") {
        const monthAgo = subDays(now, 30);
        history = history.filter(r => {
            const date = r.created_at?.toDate ? r.created_at.toDate() : new Date(r.created_at);
            return isAfter(date, monthAgo);
        });
    }

    // 2. Transaction Type Filter
    if (txTypeFilter === "purchase") {
        history = history.filter(r => r.type === "product_send" || r.type === "purchase" || r.type === "send");
    } else if (txTypeFilter === "payment") {
        history = history.filter(r => r.type === "payment" || r.type === "receive" || r.type === "payment_receive");
    }

    // 3. Customer Filter
    if (customerFilter !== "all") {
        history = history.filter(r => r.customer_id === customerFilter);
    }

    // 4. Search Filter
    return history.filter(r => 
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.product_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.payment_method || "").toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => {
        const da = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
        const db = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
        return db - da; 
    });
  }, [globalRecords, customers, searchTerm, filterType, txTypeFilter, customerFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredHistory.length / RECORDS_PER_PAGE);
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * RECORDS_PER_PAGE;
    return filteredHistory.slice(start, start + RECORDS_PER_PAGE);
  }, [filteredHistory, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, txTypeFilter, customerFilter]);

  const handleGlobalClear = async () => {
    try {
      setIsDeleting(true);
      await clearAllRecords(adminId);
      setShowClearModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <GlobalClearConfirmationModal 
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleGlobalClear}
        isDeleting={isDeleting}
      />

      {/* Header & Global Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-[#108587] tracking-tight">Purchase & Credit Summary</h1>
          <p className="text-gray-500">Customer records and transactions activities</p>
        </div>

        {/* Seamless Branding Banner */}
        <div className="hidden lg:flex flex-1 mx-8 h-10 items-center overflow-hidden border-x border-[#108587]/10 bg-[#108587]/[0.02]">
          <div className="marquee-container">
            <div className="animate-marquee flex items-center gap-12 text-[10px] font-bold text-[#108587]/80 uppercase tracking-[0.2em]">
              {/* Set 1 */}
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#108587] animate-pulse" />
                  Get our services
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-900 font-extrabold">Hamza Software Solutions</span>
                <span className="text-gray-300">|</span>
                <span>Hamza Ahmad: 03058777185</span>
                <span className="text-gray-300">|</span>
                <span className="lowercase">ha01257890@gmail.com</span>
              </div>
              
              {/* Set 2 (Identical for seamless loop) */}
              <div className="flex items-center gap-6 pr-12">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#108587] animate-pulse" />
                  Get our services
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-900 font-extrabold">Hamza Software Solutions</span>
                <span className="text-gray-300">|</span>
                <span>Hamza Ahmad: 03058777185</span>
                <span className="text-gray-300">|</span>
                <span className="lowercase">ha01257890@gmail.com</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setShowClearModal(true)}
              className="bg-white px-4 py-2 rounded-xl border border-red-100 text-red-500 shadow-sm flex items-center gap-2 text-sm font-bold hover:bg-red-50 transition-all active:scale-95"
            >
                <Trash2 size={16} />
                Clear All 
            </button>
            <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/60 shadow-sm flex items-center gap-3">
                <Calendar size={18} className="text-[#108587]" />
                <span className="text-sm font-semibold text-gray-600">{format(new Date(), "MMMM yyyy")}</span>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-2 rounded-2xl relative mb-10 overflow-hidden">
        {/* Artistic Background Decor */}
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-[#108587]/5 rounded-full blur-[100px] animate-float pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#108587]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl -m-0.5 blur-lg" />
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-500 hover:translate-y-[-2px] hover:shadow-xl border border-white/60">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <TrendingUp size={80} />
              </div>
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 bg-gradient-to-br from-[#108587] to-[#14a3a6] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#108587]/10">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
                  {loading ? <Skeleton className="h-8 w-32 mt-1" /> : <p className="text-2xl font-semibold text-[#108587] tracking-tight">Rs {stats.totalPaid.toLocaleString()}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#108587]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl -m-0.5 blur-lg" />
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-500 hover:translate-y-[-2px] hover:shadow-xl border border-white/60">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <TrendingDown size={80} />
              </div>
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 bg-gradient-to-br from-[#108587] to-[#14a3a6] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#108587]/10">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total purchase</p>
                  {loading ? <Skeleton className="h-8 w-32 mt-1" /> : <p className="text-2xl font-semibold text-[#108587] tracking-tight">Rs {stats.totalLoaned.toLocaleString()}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#108587]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl -m-0.5 blur-lg" />
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-500 hover:translate-y-[-2px] hover:shadow-xl border border-white/60">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Users size={80} />
              </div>
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 bg-gradient-to-br from-[#108587] to-[#14a3a6] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#108587]/10">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Pending</p>
                  {loading ? <Skeleton className="h-8 w-32 mt-1" /> : <p className="text-2xl font-semibold text-[#108587] tracking-tight">Rs {stats.netPending.toLocaleString()}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Goodwill Table */}
        <div className="lg:col-span-1 glass-card rounded-2xl overflow-hidden flex flex-col border border-white/60">
          <div className="p-5 border-b border-white/40 flex justify-between items-center bg-emerald-50/20">
            <h2 className="font-bold text-[#108587] flex items-center gap-2">
                <Star size={18} className="fill-yellow-400 text-yellow-400" />
                Goodwill Index
            </h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top Debtor List</span>
          </div>
          <div className="flex-1 overflow-auto max-h-[600px] scrollbar-thin">
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
                <div key={c.name} className="p-4 border-b border-gray-50/50 hover:bg-[#108587]/5 transition flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-700 truncate">{c.name}</p>
                        <div className="flex text-yellow-400 mt-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={11} className={i < c.goodwillIndex ? "fill-current" : "text-gray-200 fill-current"} />
                            ))}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-[#108587]">Rs {(c.totalLoaned - c.totalPaid).toLocaleString()}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Pending</p>
                    </div>
                </div>
             ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass-card rounded-2xl flex flex-col min-h-[400px] border border-white/60">
          <div className="p-5 border-b border-white/40 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
              <h2 className="font-bold text-slate-800 whitespace-nowrap">Transaction History Log</h2>
              <div className="flex bg-[#108587]/5 p-1 rounded-xl w-full sm:w-auto">
                {['all', 'week', 'month'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                      filterType === type 
                        ? 'bg-[#108587] text-white shadow-sm' 
                        : 'text-gray-400 hover:text-[#108587]'
                    }`}
                  >
                    {type === 'all' ? 'All Time' : type === 'week' ? 'Last Week' : 'Last Month'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white/50 border border-white/60 rounded-xl focus:ring-2 focus:ring-[#108587] focus:border-[#108587] transition-all"
                />
            </div>
          </div>

          {/* Advanced Filters Row */}
          <div className="px-5 py-4 bg-slate-50/50 border-b border-white/40 flex flex-wrap gap-4 items-center">
             <div className="flex items-center gap-2">
                <Filter size={14} className="text-[#108587]" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filters:</span>
             </div>

             <div className="flex bg-white rounded-lg border border-white/60 p-0.5 shadow-sm">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'purchase', label: 'Purchases' },
                  { id: 'payment', label: 'Payments' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTxTypeFilter(t.id)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                      txTypeFilter === t.id 
                        ? 'bg-[#108587] text-white shadow-sm' 
                        : 'text-gray-500 hover:text-[#108587]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
             </div>

             <div className="relative group min-w-[160px]">
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full appearance-none bg-white border border-white/60 text-xs font-semibold rounded-lg px-3 py-1.5 pr-8 focus:ring-2 focus:ring-[#108587]/20 focus:border-[#108587] transition-all cursor-pointer outline-none shadow-sm"
                >
                  <option value="all">All Customers</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
             </div>
             
             {(filterType !== 'all' || txTypeFilter !== 'all' || customerFilter !== 'all' || searchTerm) && (
               <button 
                 onClick={() => {
                   setFilterType('all');
                   setTxTypeFilter('all');
                   setCustomerFilter('all');
                   setSearchTerm('');
                 }}
                 className="text-[10px] font-bold text-red-500 hover:underline uppercase tracking-wider ml-auto"
               >
                 Reset Filters
               </button>
             )}
          </div>
          
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-[#108587]/5 sticky top-0 z-20 backdrop-blur-md">
                    <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-[#108587] uppercase tracking-widest">Date</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-[#108587] uppercase tracking-widest">Customer</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-[#108587] uppercase tracking-widest">Details</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold text-[#108587] uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-3 text-center text-[10px] font-bold text-[#108587] uppercase tracking-widest">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {loading && paginatedHistory.length === 0 ? (
                        [...Array(10)].map((_, i) => (
                            <tr key={i}>
                                <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                                <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                                <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                                <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                            </tr>
                        ))
                    ) : paginatedHistory.length === 0 ? (
                        <tr><td colSpan={5} className="py-20 text-center text-gray-400 font-medium">No records found matching your selection.</td></tr>
                    ) : paginatedHistory.map((record) => {
                        const isDues = record.type === "product_send" || record.type === "purchase" || record.type === "send";
                        const amt = Number(record.amount || record.total_amount || 0);
                        const date = record.created_at?.toDate ? record.created_at.toDate() : new Date(record.created_at);
                        
                        return (
                            <tr key={record.id} className="hover:bg-[#108587]/5 transition group">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-500">
                                    {format(date, "dd MMM yyyy, hh:mm a")}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <p className="text-sm font-semibold text-slate-700">{record.customerName}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm text-gray-600 truncate max-w-[150px] font-medium">
                                        {isDues ? (record.product_name || record.productName || "Purchase") : (record.payment_method || record.paymentMethod || "Payment")}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{isDues ? "Credit Sale" : "Receipt"}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <p className={`text-sm font-semibold ${isDues ? "text-[#108587]" : "text-[#108587]"}`}>
                                        {isDues ? "+" : "-"} Rs {amt.toLocaleString()}
                                    </p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isDues ? "bg-[#108587]/10 text-[#108587]" : "bg-emerald-100 text-[#108587]"}`}>
                                        {isDues ? "Pending" : "Cleared"}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/40 flex items-center justify-between bg-white/30">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Showing {Math.min(filteredHistory.length, (currentPage - 1) * RECORDS_PER_PAGE + 1)}-{Math.min(filteredHistory.length, currentPage * RECORDS_PER_PAGE)} of {filteredHistory.length}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 rounded-lg border border-white/60 bg-white/50 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:text-[#108587] hover:border-[#108587]/30 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center px-4 bg-[#108587] rounded-lg text-white text-xs font-bold shadow-sm">
                  {currentPage} / {totalPages}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 rounded-lg border border-white/60 bg-white/50 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:text-[#108587] hover:border-[#108587]/30 transition-all shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
