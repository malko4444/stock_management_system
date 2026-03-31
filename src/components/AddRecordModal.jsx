import React, { useContext, useState, useEffect, useRef } from "react";
import { LoanContext } from "../contexts/LoanContext";
import { inventoryApi } from "../services/firebaseApi";
import { toast } from "react-toastify";
import { X, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { createPortal } from "react-dom";

export default function AddRecordModal({ isOpen, onClose, customerId, customerName, onSuccess }) {
  const { user, submitTransaction, getCustomerDues, inventory } = useContext(LoanContext);
  const adminId = user?.uid;

  const [transactionType, setTransactionType] = useState("add_dues");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [currentDues, setCurrentDues] = useState(0);
  const [saving, setSaving] = useState(false);

  // New Inventory Fields
  const [inventoryItems, setInventoryItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [currentStock, setCurrentStock] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // New Payment Fields
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [clearanceDate, setClearanceDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const initialDuesLoaded = useRef(false);

  useEffect(() => {
    if (isOpen && customerId && !initialDuesLoaded.current) {
      const dues = getCustomerDues(customerId);
      setCurrentDues(dues);
      initialDuesLoaded.current = true;
    }
    if (!isOpen) {
      initialDuesLoaded.current = false;
    }
  }, [isOpen, customerId, getCustomerDues]);

  useEffect(() => {
    if (!isOpen || !inventory) return;
    setInventoryItems(inventory);
  }, [isOpen, inventory]);

  useEffect(() => {
    if (!isOpen) return;
    setTransactionType("add_dues");
    setAmount("");
    setItemName("");
    setDescription("");
    setTransactionDate(format(new Date(), "yyyy-MM-dd"));
    setSelectedProductId("");
    setCurrentStock(0);
    setQuantity("");
    setPricePerUnit("");
    setPaymentMethod("Cash");
    setClearanceDate(format(new Date(), "yyyy-MM-dd"));
    setShowItemDropdown(false);
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derive amount for product sales
  useEffect(() => {
     if (transactionType === "add_dues" && quantity && pricePerUnit) {
         setAmount(String(Number(quantity) * Number(pricePerUnit)));
     }
  }, [quantity, pricePerUnit, transactionType]);

  const filteredItems = inventoryItems.filter(item => 
    (item.productName || item.name || "").toLowerCase().includes(itemName.toLowerCase())
  );

  const selectItem = (item) => {
      setItemName(item.productName || item.name || "");
      setSelectedProductId(item.id);
      setCurrentStock(Number(item.quantity || 0));
      setPricePerUnit(item.price || "");
      setShowItemDropdown(false);
  };

  const handleSave = async () => {
    if (!customerId || !adminId) return;

    setSaving(true);
    try {
      const isAddingDues = transactionType === "add_dues";
      const type = isAddingDues ? "product_send" : "payment_receive";

      let payload = {
        transactionType: type,
        adminId,
        customerId,
        customerName,
        transactionDate,
        description: description.trim() || undefined,
      };

      if (isAddingDues) {
          if (!itemName || !quantity || !pricePerUnit) {
              toast.error("Please fill in product details completely");
              return;
          }
          if (!selectedProductId) {
              toast.error("Please select a valid item from the inventory list");
              return;
          }
          payload.productId = selectedProductId;
          payload.productName = itemName;
          payload.quantity = Number(quantity);
          payload.pricePerUnit = Number(pricePerUnit);
      } else {
          if (!amount || Number(amount) <= 0) {
              toast.error("Please enter a valid amount");
              return;
          }
          payload.paymentAmount = Number(amount);
          payload.paymentMethod = paymentMethod;
          payload.clearanceDate = clearanceDate;
      }

      await submitTransaction(payload);
      toast.success(`Transaction recorded!`);
      onSuccess?.();
      onClose(); 
    } catch (err) {
      console.error(err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
 
  return createPortal(
    <div 
      className="fixed inset-0 z-[1000] overflow-y-auto bg-black/40 backdrop-blur-md pointer-events-auto"
      onClick={onClose}
    >
      <div 
        className="min-h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-4 md:p-5 border border-[#E8F8F9] pointer-events-auto">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-[#108587]">New Transaction</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition">
              <X size={20} />
            </button>
          </div>
          {/* ... existing modal content ... */}
 
          <div className="bg-[#E8F8F9] rounded-xl p-3 border border-[#20dbdf] mb-3 flex justify-between items-center">
            <div>
                <p className="text-[10px] font-semibold text-[#108587] uppercase tracking-wider">Customer</p>
                <p className="text-base font-semibold text-gray-900">{customerName}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-semibold text-[#108587] uppercase tracking-wider">
                  {currentDues < 0 ? "Advance Balance" : "Current Balance"}
                </p>
                <p className={`text-xl font-semibold ${currentDues < 0 ? "text-cyan-600" : "text-gray-900"}`}>
                  Rs {Math.abs(currentDues).toLocaleString()}
                </p>
            </div>
          </div>
 
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-tight">Transaction Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransactionType("add_dues")}
                  className={`py-2 px-4 rounded-lg font-semibold text-xs border transition-all cursor-pointer ${
                    transactionType === "add_dues"
                      ? "bg-red-50 border-red-500 text-red-700 shadow-sm"
                      : "bg-white border-gray-400 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  Purchase Added (Sell)
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType("receive_payment")}
                  className={`py-2 px-4 rounded-lg font-semibold text-xs border transition-all cursor-pointer ${
                    transactionType === "receive_payment"
                      ? "bg-green-50 border-green-500 text-green-700 shadow-sm"
                      : "bg-white border-gray-400 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  Payment Received
                </button>
              </div>
            </div>
 
            {transactionType === "add_dues" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="relative" ref={dropdownRef}>
                      <label className="block text-xs font-semibold text-[#108587] mb-1 uppercase tracking-tight">Select Inventory Item</label>
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="text"
                            value={itemName}
                            onChange={(e) => {
                                setItemName(e.target.value);
                                setShowItemDropdown(true);
                                setSelectedProductId(""); 
                            }}
                            onFocus={() => setShowItemDropdown(true)}
                            placeholder="Search stock..."
                            className="w-full border border-[#20dbdf] rounded-lg pl-9 pr-8 py-2 text-sm focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] text-gray-900 transition-all cursor-pointer outline-none"
                          />
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      </div>
                      
                      {showItemDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                              {filteredItems.length > 0 ? (
                                  filteredItems.map(item => (
                                      <div 
                                          key={item.id} 
                                          onClick={() => selectItem(item)}
                                          className="px-3 py-2 hover:bg-[#E8F8F9] cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center"
                                      >
                                          <div>
                                              <p className="font-bold text-xs text-gray-900">{item.productName || item.name}</p>
                                              <p className="text-[10px] text-gray-500">Rs {item.price}</p>
                                          </div>
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${Number(item.quantity) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                              {item.quantity} in stock
                                          </span>
                                      </div>
                                  ))
                              ) : (
                                  <div className="p-3 text-center text-gray-500 text-[10px] italic">No matching items</div>
                              )}
                          </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-[#108587] mb-1 uppercase tracking-tight">Quantity</label>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full border border-[#20dbdf] rounded-lg px-3 py-2 text-sm focus:ring-4 focus:ring-[#108587]/10 text-gray-900 outline-none"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#108587] mb-1 uppercase tracking-tight">Rate</label>
                          <input
                            type="number"
                            value={pricePerUnit}
                            onChange={(e) => setPricePerUnit(e.target.value)}
                            className="w-full border border-[#20dbdf] rounded-lg px-3 py-2 text-sm focus:ring-4 focus:ring-[#108587]/10 text-gray-900 outline-none"
                            placeholder="0"
                          />
                        </div>
                    </div>
                  </div>
                  
                </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#108587] mb-1 uppercase tracking-tight">Amount Paid (Rs)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full border border-[#20dbdf] rounded-lg px-3 py-2 text-sm focus:ring-4 focus:ring-[#108587]/10 text-gray-900 font-bold outline-none"
                      placeholder="Enter amount..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                      <div>
                          <label className="block text-xs font-semibold text-[#108587] mb-1 uppercase tracking-tight">Method</label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full border border-[#20dbdf] rounded-lg px-3 py-2 text-xs text-gray-900 bg-white cursor-pointer outline-none"
                          >
                              <option value="Cash">Cash</option>
                              <option value="Bank Transfer">Bank</option>
                              <option value="Online">JazzCash</option>
                              <option value="Cheque">Cheque</option>
                          </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#108587] mb-1 uppercase tracking-tight">Date</label>
                        <input
                          type="date"
                          value={clearanceDate}
                          onChange={(e) => setClearanceDate(e.target.value)}
                          className="w-full border border-[#20dbdf] rounded-lg px-3 py-2 text-xs text-gray-900 cursor-pointer outline-none"
                        />
                      </div>
                  </div>
                </div>
            )}
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-xs font-semibold text-[#108587] mb-1 uppercase tracking-tight">Deal Date</label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full border border-[#20dbdf] rounded-lg px-3 py-2 text-xs text-gray-900 cursor-pointer outline-none"
                  />
                </div>
                {amount && (
                   <div className="px-3 py-2 bg-[#F9FCFC] rounded-xl border border-[#20dbdf]/30 flex flex-col justify-center">
                     <div className="flex justify-between items-center mb-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">
                          {transactionType === "add_dues" ? "Order Total" : "Amount Paid"}
                        </p>
                        <p className="text-xs font-black text-[#108587]">Rs {Number(amount).toLocaleString()}</p>
                     </div>
                     <div className="flex justify-between items-center mb-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">
                          {(currentDues + (transactionType === "add_dues" ? Number(amount) : -Number(amount))) < 0 ? "Projected Advance" : "New Balance Projection"}
                        </p>
                        <p className={`font-black text-sm ${(currentDues + (transactionType === "add_dues" ? Number(amount) : -Number(amount))) < 0 ? "text-cyan-600" : (transactionType === "add_dues" ? "text-red-600" : "text-green-600")}`}>
                           Rs {Math.abs(currentDues + (transactionType === "add_dues" ? Number(amount) : -Number(amount))).toLocaleString()}
                        </p>
                     </div>
                     {transactionType === "add_dues" && selectedProductId && (
                        <div className="flex justify-between items-center border-t border-[#20dbdf]/20 pt-1 mt-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Remaining Stock Preview</p>
                          <p className={`font-black text-sm ${Number(currentStock) - Number(quantity) < 0 ? "text-red-600" : "text-[#108587]"}`}>
                            {(Number(currentStock) - Number(quantity)).toLocaleString()} Units
                          </p>
                        </div>
                      )}
                   </div>
                )}
            </div>
 
            <div>
              <label className="block text-xs font-semibold text-[#108587] mb-1 uppercase tracking-tight">Notes</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={1}
                className="w-full border border-[#20dbdf] rounded-lg px-3 py-2 text-xs focus:ring-4 focus:ring-[#108587]/10 text-gray-900 resize-none outline-none"
                placeholder="Internal notes..."
              />
            </div>
          </div>
 
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-[#DC2626] bg-[#FFE7E7] hover:bg-[#fddada] transition-colors cursor-pointer rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !amount}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all shadow-md cursor-pointer bg-gradient-to-br from-[#108587] to-[#14a3a6] text-white hover:bg-[#108587]/80`}
            >
              {saving ? "Processing..." : "Confirm Transaction"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
