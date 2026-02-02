import React, { useState, useEffect } from "react";
import { reportsApi } from "../services/firebaseApi";
import AddTheCustomer from "../components/AddTheCustomer";
import InventoryProducts from "../components/InventoryProducts";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Payroll from "./Payroll";
import AccountReceivable from "./AccountReceivable";
import AccountPayable from "./AccountPayable";
import Reports from "./Reports";
import Reviews from "./Reviews";
import CustomerDetails from "./CustomerDetails";
import InventoryItemAdd from "./InventoryItemAdd";
import { DeleteHistory } from "./DeleteHistory";

const SEARCH_TYPES = {
  inventory: "products",
  customers: "customers",
  "customer-details": "customers",
  "inventory-item": "products",
};

const Home = () => {
  const [activeComponent, setActiveComponent] = useState("inventory");
  const [searchTerm, setSearchTerm] = useState("");

  const searchType = SEARCH_TYPES[activeComponent] || "products";
  const showSearch = ["inventory", "customers", "customer-details", "inventory-item"].includes(activeComponent);

  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const adminId = localStorage.getItem('adminId');
      if (!adminId) return;
      try {
        const d = await reportsApi.getDashboardStats(adminId);
        setDashboard(d);
      } catch (e) {}
    };
    fetchDashboard();

    const handlerNav = (e) => {
      const component = e?.detail?.component;
      if (component) setActiveComponent(component);
    };
    const handlerFinancial = () => { fetchDashboard(); };

    window.addEventListener('navigateTo', handlerNav);
    window.addEventListener('financialChange', handlerFinancial);
    return () => {
      window.removeEventListener('navigateTo', handlerNav);
      window.removeEventListener('financialChange', handlerFinancial);
    };
  }, []);

  const renderContent = () => {
    switch (activeComponent) {
      case "inventory":
        return <InventoryProducts searchTerm={searchTerm} />;      case "customers":
        return <AddTheCustomer searchTerm={searchTerm} />;
      case "customer-details":
        return <CustomerDetails embedded />;
      case "inventory-item":
        return <InventoryItemAdd embedded />;
      case "payroll":
        return <Payroll embedded />;
      case "account-receivable":
        return <AccountReceivable embedded />;
      case "account-payable":
        return <AccountPayable embedded />;
      case "reports":
        return <Reports embedded />;
      case "reviews":
        return <Reviews embedded />;
      case "delete-history":
        return <DeleteHistory embedded />;
      default:
        return <InventoryProducts searchTerm={searchTerm} />;
    }
  };

  return (
    <main className="flex h-screen max-w-screen-2xl mx-auto overflow-hidden bg-gray-50">
      <Sidebar activeComponent={activeComponent} setActiveComponent={setActiveComponent} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onSearch={setSearchTerm}
          searchType={searchType}
          showSearch={showSearch}
        />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Dashboard summary */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total Receivables (Pending)</div>
                <div className="text-2xl font-semibold text-[#108587]">Rs {dashboard ? (dashboard.receivablePending || 0).toLocaleString('en-PK') : '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Payables (Pending)</div>
                <div className="text-2xl font-semibold text-[#108587]">Rs {dashboard ? (dashboard.payablePending || 0).toLocaleString('en-PK') : '—'}</div>
              </div>
            </div>
          </div>

          {renderContent()}
        </div>
      </div>
    </main>
  );
};

export default Home;
