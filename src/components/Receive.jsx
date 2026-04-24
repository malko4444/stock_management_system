import React, { useContext, useState, useEffect } from "react";
import { customerDataDataContext } from "../pages/CustomerContext";
import { db } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { Wallet, Loader2 } from "lucide-react";

function Receive({ onComplete }) {
  const [receivedAmount, setReceivedAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [totalBalance, setTotalBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const { customerId } = useContext(customerDataDataContext);
  const adminId = localStorage.getItem("adminId");

  useEffect(() => {
    const fetchBalance = async () => {
      if (!customerId) return;
      setLoadingBalance(true);
      try {
        const recordsQuery = query(
          collection(db, "customerRecord"),
          where("customer_id", "==", customerId),
          where("admin_id", "==", adminId)
        );
        const snap = await getDocs(recordsQuery);
        let balance = 0;
        snap.docs.forEach((d) => {
          const r = d.data();
          if (r.type === "send") balance += Number(r.total_amount) || 0;
          else if (r.type === "receive") balance -= Number(r.amount) || 0;
        });
        setTotalBalance(balance);
      } catch (err) {
        console.error("Error fetching balance:", err);
        toast.error("Failed to fetch balance");
      } finally {
        setLoadingBalance(false);
      }
    };
    fetchBalance();
  }, [customerId, adminId]);

  const validate = () => {
    const next = {};
    if (!customerId) next.form = "No customer selected. Go back and choose one.";
    if (!receivedAmount) next.amount = "Amount is required";
    else if (Number.isNaN(Number(receivedAmount)))
      next.amount = "Amount must be a number";
    else if (Number(receivedAmount) <= 0)
      next.amount = "Amount must be greater than 0";

    if (!paymentMethod) next.paymentMethod = "Please select a payment method";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleReceivePayment = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const amount = Number(receivedAmount);
      await addDoc(collection(db, "customerRecord"), {
        customer_id: customerId,
        admin_id: adminId,
        amount,
        payment_method: paymentMethod,
        created_at: new Date(),
        type: "receive",
        previous_balance: totalBalance,
        remaining_balance: totalBalance - amount,
      });

      setTotalBalance((prev) => prev - amount);
      setReceivedAmount("");
      setPaymentMethod("");
      setErrors({});
      toast.success("Payment recorded");
      if (typeof onComplete === "function") onComplete();
    } catch (err) {
      console.error("Error recording payment:", err);
      toast.error("Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
      hasError ? "border-red-400" : "border-slate-300"
    }`;

  return (
    <form onSubmit={handleReceivePayment} className="space-y-5" noValidate>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
          <Wallet size={18} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Receive payment</h3>
          <p className="text-xs text-slate-500">Record a payment from the selected customer</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm text-slate-600">Current balance</span>
        <span className={`text-lg font-semibold ${totalBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>
          {loadingBalance ? "..." : `Rs ${totalBalance.toLocaleString()}`}
        </span>
      </div>

      {errors.form && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {errors.form}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Payment amount</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={receivedAmount}
          onChange={(e) => {
            setReceivedAmount(e.target.value);
            setErrors((prev) => ({ ...prev, amount: "" }));
          }}
          className={fieldClass(errors.amount)}
          placeholder="Enter amount"
        />
        {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Payment method</label>
        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setErrors((prev) => ({ ...prev, paymentMethod: "" }));
          }}
          className={fieldClass(errors.paymentMethod)}
        >
          <option value="">Select payment method</option>
          <option value="cash">Cash</option>
          <option value="jazzcash">JazzCash</option>
          <option value="easypaisa">EasyPaisa</option>
          <option value="bank">Bank Transfer</option>
        </select>
        {errors.paymentMethod && <p className="mt-1 text-xs text-red-600">{errors.paymentMethod}</p>}
      </div>

      {receivedAmount && paymentMethod && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-emerald-800">Method</span>
            <span className="font-medium text-emerald-900">{paymentMethod.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-800">New balance</span>
            <span className="font-semibold text-emerald-900">
              Rs {(totalBalance - Number(receivedAmount || 0)).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? "Recording..." : "Record payment"}
      </button>
    </form>
  );
}

export default Receive;
