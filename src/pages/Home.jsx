import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Users,
  AlertTriangle,
  Layers,
  ArrowRight,
  Plus,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import AddTheCustomer from "../components/AddTheCustomer";
import { NavBar } from "../components/NavBar";

const LOW_STOCK_THRESHOLD = 10;

const StatCard = ({ label, value, icon: Icon, tone, helper }) => {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <div className={`h-9 w-9 rounded-xl grid place-items-center ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
      {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
    </div>
  );
};

const ActionCard = ({ to, title, description, icon: Icon }) => (
  <Link
    to={to}
    className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
  >
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-900">{title}</h4>
          <ArrowRight
            size={16}
            className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
          />
        </div>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  </Link>
);

const Home = () => {
  const adminId = localStorage.getItem("adminId");
  const [stats, setStats] = useState({
    customers: 0,
    inventoryItems: 0,
    totalUnits: 0,
    lowStock: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const [custSnap, invSnap] = await Promise.all([
        getDocs(query(collection(db, "customers"), where("adminId", "==", adminId))),
        getDocs(query(collection(db, "inventory"), where("adminId", "==", adminId))),
      ]);

      let totalUnits = 0;
      let lowStock = 0;
      invSnap.docs.forEach((d) => {
        const q = Number(d.data().quantity) || 0;
        totalUnits += q;
        if (q <= LOW_STOCK_THRESHOLD) lowStock += 1;
      });

      setStats({
        customers: custSnap.size,
        inventoryItems: invSnap.size,
        totalUnits,
        lowStock,
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
              Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Overview of your customers and inventory
            </p>
          </div>
          <Link
            to="/inventoryItem"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors self-start sm:self-auto"
          >
            <Plus size={16} />
            Add inventory
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Customers" value={loading ? "…" : stats.customers} icon={Users} tone="indigo" helper="Active clients" />
          <StatCard label="Inventory items" value={loading ? "…" : stats.inventoryItems} icon={Package} tone="sky" helper="Distinct SKUs" />
          <StatCard label="Total units" value={loading ? "…" : stats.totalUnits} icon={Layers} tone="emerald" helper="Across all products" />
          <StatCard label="Low stock" value={loading ? "…" : stats.lowStock} icon={AlertTriangle} tone="amber" helper={`\u2264 ${LOW_STOCK_THRESHOLD} units`} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard to="/inventoryItem" title="Manage inventory" description="Add, edit and search your stock" icon={Package} />
            <ActionCard to="/details" title="Customer records" description="View customers, balances and history" icon={Users} />
            <ActionCard to="/addRecord" title="Record a transaction" description="Send product or receive payment" icon={Layers} />
          </div>
        </div>

        <AddTheCustomer onAdded={loadStats} />
      </div>
    </div>
  );
};

export default Home;
