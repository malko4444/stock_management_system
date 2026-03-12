import React, { useState, useEffect, useContext } from "react";
import { LoanContext } from "../contexts/LoanContext";
import AddTheCustomer from "../components/AddTheCustomer";
import InventoryProducts from "../components/InventoryProducts";
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
        const customersData = await fetchCustomers(adminId);
        const totalDues = customersData.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
        setDashboard({
          totalCustomers: customersData.length,
          totalDues,
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
    <main className="flex h-screen max-w-screen-2xl mx-auto overflow-hidden bg-gray-50">
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
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Dashboard summary - Hide on Loan Summary page to avoid duplication */}
          {activeComponent !== "loan-summary" && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Active Customers</div>
              <div className="text-3xl font-bold text-[#108587] mt-2">
                {dashboard ? dashboard.totalCustomers : <Skeleton className="h-9 w-12" />}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Total Customer Dues</div>
              <div className="text-3xl font-bold text-[#d97706] mt-2">
                {dashboard ? `Rs ${dashboard.totalDues.toLocaleString('en-PK')}` : <Skeleton className="h-9 w-32" />}
              </div>
            </div>
          </div>
          )}

          {renderContent()}
        </div>
      </div>
    </main>
  );
};

export default Home;
