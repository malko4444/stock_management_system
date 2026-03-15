import React, { useState, useEffect, useContext } from "react";
import { LoanContext } from "../contexts/LoanContext";
import AddTheCustomer from "../components/AddTheCustomer";
import InventoryProducts from "../components/InventoryProducts";
import { Users, Wallet, Box } from "lucide-react";
import { inventoryApi } from "../services/firebaseApi";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CustomerDetails from "./CustomerDetails";
import InventoryItemAdd from "./InventoryItemAdd";
import LoanSummary from "./LoanSummary";

const SEARCH_TYPES = {
  inventory: "products",
  customers: "customers",
  "inventory-item": "products",
};

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

const Home = () => {
  const [activeComponent, setActiveComponent] = useState("inventory");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [persistedCustomerId, setPersistedCustomerId] = useState("");
  const { user, customers, inventory } = useContext(LoanContext);

  const searchType = SEARCH_TYPES[activeComponent] || "products";
  const showSearch = ["inventory", "customers", "inventory-item"].includes(activeComponent);

  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    if (!user) return;

    const customersData = customers || [];
    const inventoryData = inventory || [];
    
    const totalReceivables = customersData.reduce((sum, c) => sum + Math.max(0, Number(c.balance) || 0), 0);
    const totalAdvance = customersData.reduce((sum, c) => sum + Math.abs(Math.min(0, Number(c.balance) || 0)), 0);
    const totalItemsValue = inventoryData.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price || 0)), 0);
    const totalStock = inventoryData.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const outOfStockCount = inventoryData.filter(item => Number(item.quantity || 0) === 0).length;

    setDashboard({
      totalCustomers: customersData.length,
      totalReceivables,
      totalAdvance,
      totalStock,
      outOfStockCount,
      totalItemsValue
    });
  }, [user, customers, inventory]);

  useEffect(() => {
    const handlerNav = (e) => {
      const component = e?.detail?.component;
      const cid = e?.detail?.customerId;
      
      if (component) setActiveComponent(component);
      if (cid) setPersistedCustomerId(cid);
    };

    window.addEventListener('navigateTo', handlerNav);
    return () => {
      window.removeEventListener('navigateTo', handlerNav);
    };
  }, []);

  const renderContent = () => {
    switch (activeComponent) {
      case "inventory":
        return <InventoryProducts searchTerm={searchTerm} />;
      case "customers":
        return <AddTheCustomer searchTerm={searchTerm} />;
      case "customer-details":
        return <CustomerDetails embedded targetCustomerId={persistedCustomerId} />;
      case "inventory-item":
        return <InventoryItemAdd embedded />;
      case "loan-summary":
        return <LoanSummary />;
      default:
        return <InventoryProducts searchTerm={searchTerm} />;
    }
  };

  return (
    <main className="flex h-screen max-w-none mx-auto overflow-hidden bg-gray-50">
      <Sidebar 
        activeComponent={activeComponent} 
        setActiveComponent={setActiveComponent} 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onSearch={setSearchTerm}
          searchType={searchType}
          showSearch={showSearch}
          isCollapsed={isCollapsed}
        />
        <div className="flex-1 overflow-auto p-4 md:p-6 relative">
          {/* Dashboard summary - Hide on Loan Summary page */}
          {activeComponent !== "loan-summary" && (
            <div className="mb-2 relative overflow-hidden bg-white/50 p-4 rounded-2xl">
              {/* Artistic Background Decor */}
              <div className="absolute -top-10 -left-10 w-64 h-64 bg-[#108587]/5 rounded-full blur-[100px] animate-float pointer-events-none" />
              <div className="absolute -bottom-20 -right-10 w-80 h-80 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {/* Active Customers Card */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#108587]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl -m-0.5 blur-lg" />
                  <div className="glass-card rounded-2xl p-5 relative overflow-hidden transition-all duration-500 hover:translate-y-[-2px] hover:shadow-xl border border-white/60">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                       <Users size={100} />
                    </div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#108587] to-[#14a3a6] flex items-center justify-center text-white shadow-md shadow-[#108587]/10 transition-transform duration-500">
                        <Users size={24} className="stroke-[2px]" />
                      </div>
                      <span className="px-2 py-1 rounded-full bg-emerald-50 text-[#108587] text-[8px] font-bold uppercase tracking-wider">Active Partners</span>
                    </div>
                    <div className="h-[60px] flex flex-col justify-end">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-blinker" />
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Profiles</p>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-[#108587] tracking-tight">
                          {dashboard ? dashboard.totalCustomers : "..."}
                        </h3>
                        <span className="text-[10px] font-medium text-[#108587]/60">Verified</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Receivables Card */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#108587]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl -m-0.5 blur-lg" />
                  <div className="glass-card rounded-2xl p-5 relative overflow-hidden transition-all duration-500 hover:translate-y-[-2px] hover:shadow-xl border border-white/60">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                       <Wallet size={100} />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#108587] to-[#14a3a6] flex items-center justify-center text-white shadow-md shadow-[#108587]/10 transition-transform duration-500">
                        <Wallet size={24} className="stroke-[2px]" />
                      </div>
                      <span className="px-2 py-1 rounded-full bg-emerald-50 text-[#108587] text-[8px] font-bold uppercase tracking-wider">Account Status</span>
                    </div>
                    
                    <div className="flex items-end justify-between gap-4 h-[60px]">
                      {(dashboard?.totalAdvance > 0 || (!dashboard?.totalAdvance && !dashboard?.totalReceivables)) && (
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            {dashboard?.totalAdvance > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-blinker" />}
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                Net Advance
                            </p>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-semibold text-[#108587]">Rs</span>
                            <h3 className="text-xl font-bold text-[#108587] tracking-tight truncate">
                              {(dashboard?.totalAdvance || 0).toLocaleString('en-PK')}
                            </h3>
                          </div>
                        </div>
                      )}
                      
                      {dashboard?.totalReceivables > 0 && (
                        <div className="flex-1 border-l border-gray-100 pl-4">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-blinker" />
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                Receivables
                            </p>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-semibold text-red-600">Rs</span>
                            <h3 className="text-xl font-bold text-red-600 tracking-tight truncate">
                              {dashboard.totalReceivables.toLocaleString('en-PK')}
                            </h3>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock Status Card */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#108587]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl -m-0.5 blur-lg" />
                  <div className="glass-card rounded-2xl p-5 relative overflow-hidden transition-all duration-500 hover:translate-y-[-2px] hover:shadow-xl border border-white/60">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                       <Box size={100} />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#108587] to-[#14a3a6] flex items-center justify-center text-white shadow-md shadow-[#108587]/10 transition-transform duration-500">
                        <Box size={24} className="stroke-[2px]" />
                      </div>
                      <span className="px-2 py-1 rounded-full bg-emerald-50 text-[#108587] text-[8px] font-bold uppercase tracking-wider">Inventory</span>
                    </div>
                    <div className="h-[60px] flex items-end justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-blinker" />
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Current Stock</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <h3 className="text-xl font-bold text-[#108587] tracking-tight">
                            {dashboard ? dashboard.totalStock.toLocaleString() : "..."}
                          </h3>
                          <span className="text-[10px] font-medium text-[#108587]/60 text-nowrap">Units</span>
                        </div>
                      </div>

                      {dashboard?.outOfStockCount > 0 && (
                        <div className="flex-1 border-l border-gray-100 pl-4">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-blinker" />
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                Out of Stock
                            </p>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <h3 className="text-xl font-bold text-red-600 tracking-tight">
                              {dashboard.outOfStockCount}
                            </h3>
                            <span className="text-[10px] font-medium text-red-600/60 text-nowrap">Items</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative z-10 transition-all duration-500">
            {renderContent()}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;
