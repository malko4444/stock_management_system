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
  const { fetchCustomers, getCustomersWithDues } = useContext(LoanContext);

  const searchType = SEARCH_TYPES[activeComponent] || "products";
  const showSearch = ["inventory", "customers", "inventory-item"].includes(activeComponent);

  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const adminId = localStorage.getItem('adminId');
      if (!adminId) return;
      try {
        const [customersData, inventoryData] = await Promise.all([
          fetchCustomers(adminId),
          inventoryApi.getByAdmin(adminId)
        ]);
        
        const totalDues = customersData.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
        const totalItemsValue = inventoryData.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price || 0)), 0);
        const totalStock = inventoryData.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

        setDashboard({
          totalCustomers: customersData.length,
          totalDues,
          totalStock,
          totalItemsValue
        });
      } catch (e) {
        console.error('Error fetching dashboard:', e);
      }
    };
    fetchDashboard();

    const handlerNav = (e) => {
      const component = e?.detail?.component;
      if (component) setActiveComponent(component);
    };

    window.addEventListener('navigateTo', handlerNav);
    return () => {
      window.removeEventListener('navigateTo', handlerNav);
    };
  }, [fetchCustomers]);

  const renderContent = () => {
    switch (activeComponent) {
      case "inventory":
        return <InventoryProducts searchTerm={searchTerm} />;
      case "customers":
        return <AddTheCustomer searchTerm={searchTerm} />;
      case "customer-details":
        return <CustomerDetails embedded />;
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
                    <div className="relative">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Total Profiles</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-bold text-[#108587] tracking-tight">
                          {dashboard ? dashboard.totalCustomers : "..."}
                        </h3>
                        <span className="text-xs font-medium text-[#108587]/60">Verified</span>
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
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#108587] to-[#14a3a6] flex items-center justify-center text-white shadow-md shadow-[#108587]/10 transition-transform duration-500">
                        <Wallet size={24} className="stroke-[2px]" />
                      </div>
                      <span className="px-2 py-1 rounded-full bg-emerald-50 text-[#108587] text-[8px] font-bold uppercase tracking-wider">Receivables</span>
                    </div>
                    <div className="relative">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Total Balance</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-semibold text-[#108587]">Rs</span>
                        <h3 className="text-3xl font-bold text-[#108587] tracking-tight">
                          {dashboard ? dashboard.totalDues.toLocaleString('en-PK') : "..."}
                        </h3>
                      </div>
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
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#108587] to-[#14a3a6] flex items-center justify-center text-white shadow-md shadow-[#108587]/10 transition-transform duration-500">
                        <Box size={24} className="stroke-[2px]" />
                      </div>
                      <span className="px-2 py-1 rounded-full bg-emerald-50 text-[#108587] text-[8px] font-bold uppercase tracking-wider">Inventory</span>
                    </div>
                    <div className="relative">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Current Stock</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-bold text-[#108587] tracking-tight">
                          {dashboard ? dashboard.totalStock : "..."}
                        </h3>
                        <span className="text-xs font-medium text-[#108587]/60 text-nowrap">Units on Hand</span>
                      </div>
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
