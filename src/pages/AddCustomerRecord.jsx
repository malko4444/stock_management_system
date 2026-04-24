import React, { useContext, useRef, useState } from "react";
import Send from "../components/Send";
import Receive from "../components/Receive";
import { customerDataDataContext } from "./CustomerContext";
import InventoryProducts from "../components/InventoryProducts";
import { NavBar } from "../components/NavBar";
import { PackageOpen, Wallet, User } from "lucide-react";

function AddCustomerRecord() {
  const { customerData, customerId } = useContext(customerDataDataContext);
  const [tab, setTab] = useState("send");
  const inventoryRef = useRef(null);

  const selectedCustomer = Array.isArray(customerData)
    ? customerData.find((c) => c.id === customerId)
    : null;

  const refreshInventory = () => {
    inventoryRef.current?.fetchInventory?.();
  };

  const tabClasses = (active) =>
    [
      "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
    ].join(" ");

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">New transaction</h1>
          <p className="text-sm text-slate-500 mt-1">Send a product or record an incoming payment</p>
        </div>

        {selectedCustomer && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <User size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-500">Customer</div>
              <div className="font-semibold text-slate-900">{selectedCustomer.name}</div>
              {selectedCustomer.phone && (
                <div className="text-xs text-slate-500">{selectedCustomer.phone}</div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mb-6 max-w-sm">
            <button onClick={() => setTab("send")} className={tabClasses(tab === "send")} type="button">
              <PackageOpen size={14} />
              Send product
            </button>
            <button onClick={() => setTab("receive")} className={tabClasses(tab === "receive")} type="button">
              <Wallet size={14} />
              Receive payment
            </button>
          </div>

          <div className="animate-fade-in">
            {tab === "send" ? <Send onComplete={refreshInventory} /> : <Receive />}
          </div>
        </div>

        <InventoryProducts ref={inventoryRef} />
      </div>
    </div>
  );
}

export default AddCustomerRecord;
