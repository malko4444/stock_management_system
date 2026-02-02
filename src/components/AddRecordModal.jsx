import React, { useContext, useState, useEffect } from "react";
import { customerDataDataContext } from "../pages/CustomerContext";
import { customerRecordsApi, inventoryApi, accountReceivableApi, accountPayableApi } from "../services/firebaseApi";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { format } from "date-fns";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "bank", label: "Bank Transfer" },
];

export default function AddRecordModal({ isOpen, onClose, customerId, customerName, onSuccess }) {
  const { setCustomerId, setCustomerData, inventoryItem } = useContext(customerDataDataContext);
  const adminId = localStorage.getItem("adminId");

  const [transactionType, setTransactionType] = useState("send");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [currentBalance, setCurrentBalance] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const inventoryList = Array.isArray(inventoryItem) ? inventoryItem : [];
  const filteredProducts = productSearch
    ? inventoryList.filter((p) => p.productName?.toLowerCase().includes(productSearch.toLowerCase()))
    : inventoryList;

  useEffect(() => {
    if (!isOpen || !customerId || !adminId) return;
    setCustomerId(customerId);
    const fetchBalance = async () => {
      try {
        const records = await customerRecordsApi.getByCustomerAndAdmin(customerId, adminId);
        const balance = records.reduce((sum, r) => {
          if (r.type === "send") return sum + (r.total_amount || 0);
          if (r.type === "receive") return sum - (r.amount || 0);
          return sum;
        }, 0);
        setCurrentBalance(balance);
      } catch (e) {
        setCurrentBalance(0);
      }
    };
    fetchBalance();
  }, [isOpen, customerId, adminId, setCustomerId]);

  useEffect(() => {
    if (!isOpen) return;
    setTransactionType("send");
    setProductSearch("");
    setSelectedProduct("");
    setQuantity("");
    setPrice("");
    setPaymentAmount("");
    setPaymentMethod("");
    setTransactionDate(format(new Date(), "yyyy-MM-dd"));
    setErrors({});
  }, [isOpen]);

  const selectedProductData = selectedProduct ? inventoryList.find((p) => p.id === selectedProduct) : null;
  const totalAmount = selectedProductData && quantity && price ? Number(quantity) * Number(price) : 0;
  const remainingBalance = currentBalance - Number(paymentAmount || 0);

  const validateSend = () => {
    const e = {};
    if (!selectedProduct) e.product = "Select a product";
    if (!quantity || Number(quantity) <= 0) e.quantity = "Valid quantity required";
    if (selectedProductData && Number(quantity) > selectedProductData.quantity) e.quantity = "Not enough stock";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateReceive = () => {
    const e = {};
    if (!paymentAmount || Number(paymentAmount) <= 0) e.amount = "Valid amount required";
    if (!paymentMethod) e.paymentMethod = "Select payment method";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!customerId || !adminId) return;
    setSaving(true);
    try {
      const created_at = transactionDate ? new Date(transactionDate + "T12:00:00") : new Date();
      if (transactionType === "send") {
        if (!validateSend()) {
          setSaving(false);
          return;
        }
        const qty = Number(quantity);
        const unitPrice = Number(price) || 0;
        const total = qty * unitPrice;
        await customerRecordsApi.add({
          customer_id: customerId,
          admin_id: adminId,
          product_name: selectedProductData.productName,
          quantity: qty,
          price: unitPrice,
          product_id: selectedProduct,
          total_amount: total,
          created_at,
          type: "send",
        });
        await inventoryApi.updateQuantity(selectedProduct, selectedProductData.quantity - qty);
        // Create a matching receivable (pending) so Account Receivable stays in sync
        try {
          await accountReceivableApi.add({
            admin_id: adminId,
            customer_id: customerId,
            customer_name: customerName,
            description: `Product sent: ${selectedProductData.productName}`,
            amount: total,
            status: "pending",
            created_at,
          });
        } catch (e) {
          console.error("Failed to create receivable entry:", e);
        }
        toast.success("Product sent successfully!");
      } else {
        if (!validateReceive()) {
          setSaving(false);
          return;
        }
        await customerRecordsApi.add({
          customer_id: customerId,
          admin_id: adminId,
          amount: Number(paymentAmount),
          payment_method: paymentMethod,
          created_at,
          type: "receive",
          previous_balance: currentBalance,
          remaining_balance: remainingBalance,
        });
        // Apply payment to pending receivables. If surplus remains, register a payable (customer credit)
        try {
          const remainder = await accountReceivableApi.applyPayment(adminId, customerId, Number(paymentAmount));
          if (remainder > 0) {
            await accountPayableApi.add({
              admin_id: adminId,
              payee_id: customerId,
              payee: customerName,
              description: "Overpayment / Customer Credit",
              amount: Number(remainder),
              status: "pending",
              created_at,
            });
          }
        } catch (e) {
          console.error("Failed to apply payment:", e);
        }
        toast.success("Payment recorded successfully!");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(transactionType === "send" ? "Failed to send product" : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 pointer-events-auto border border-[#E8F8F9]">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold text-[#108587]">Add Record</h2>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#108587] mb-1">Transaction Type</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full border border-[#20dbdf] rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#108587] focus:border-[#17BCBE] text-gray-900"
              >
                <option value="send">Send Product</option>
                <option value="receive">Receive Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#108587] mb-1">Date</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full border border-[#20dbdf] rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#108587] focus:border-[#17BCBE] text-gray-900"
              />
            </div>

            {transactionType === "send" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#108587] mb-1">Name / Product</label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      if (!e.target.value) setSelectedProduct("");
                    }}
                    placeholder="Enter product name"
                    className="w-full border border-[#20dbdf] rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#108587] focus:border-[#17BCBE] text-gray-900"
                  />
                  {filteredProducts.length > 0 && (
                    <ul className="mt-1 border border-gray-200 rounded-lg shadow max-h-40 overflow-y-auto">
                      {filteredProducts.map((p) => (
                        <li
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct(p.id);
                            setProductSearch(p.productName);
                            setPrice(String(p.price ?? 0));
                            setErrors((prev) => ({ ...prev, product: "" }));
                          }}
                          className={`px-3 py-2 cursor-pointer hover:bg-[#E8F8F9] ${selectedProduct === p.id ? "bg-[#E8F8F9] text-[#108587]" : "text-gray-700"}`}
                        >
                          {p.productName} {p.quantity !== undefined ? `(Stock: ${p.quantity})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {errors.product && <p className="mt-1 text-sm text-red-600">{errors.product}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#108587] mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full border border-[#20dbdf] rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#108587] focus:border-[#17BCBE] text-gray-900"
                    placeholder="0"
                  />
                  {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#108587] mb-1">Price</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-[#20dbdf] rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#108587] focus:border-[#17BCBE] text-gray-900"
                    placeholder="0"
                  />
                </div>
                {selectedProduct && quantity && price && (
                  <div className="bg-[#E8F8F9] rounded-lg p-4 border border-[#20dbdf]">
                    <p className="text-sm font-medium text-[#108587]">Order Summary</p>
                    <p className="text-sm text-gray-800 mt-1">Product: {selectedProductData?.productName}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">Total Amount: Rs {totalAmount.toLocaleString()}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="bg-[#E8F8F9] rounded-lg p-4 border border-[#20dbdf]">
                  <p className="text-sm font-medium text-[#108587]">Current Balance</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">Rs {currentBalance.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#108587] mb-1">Payment Amount</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full border border-[#20dbdf] rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#108587] focus:border-[#17BCBE] text-gray-900"
                    placeholder="0"
                  />
                  {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#108587] mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-[#20dbdf] rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#108587] focus:border-[#17BCBE] text-gray-900"
                  >
                    <option value="">Select payment method</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  {errors.paymentMethod && <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>}
                </div>
                {paymentAmount && paymentMethod && (
                  <div className="bg-[#E8F8F9] rounded-lg p-4 border border-[#20dbdf]">
                    <p className="text-sm text-[#108587]">Payment Method: <span className="font-medium text-gray-900">{PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}</span></p>
                    <p className="text-sm text-[#108587] mt-1">Remaining Balance: <span className="font-semibold text-gray-900">Rs {remainingBalance.toLocaleString()}</span></p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#108587] text-white rounded-lg hover:bg-[#0e7274] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
