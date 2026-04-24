import React, { useContext, useState, useMemo } from "react";
import { customerDataDataContext } from "../pages/CustomerContext";
import { db } from "../../firebaseConfig";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { PackageOpen, Loader2 } from "lucide-react";

function Send({ onComplete }) {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { customerId, inventoryItem } = useContext(customerDataDataContext);
  const adminId = localStorage.getItem("adminId");

  const inventoryList = useMemo(
    () => (Array.isArray(inventoryItem) ? inventoryItem : []),
    [inventoryItem]
  );

  const selectedProductData = useMemo(
    () => inventoryList.find((item) => item.id === selectedProduct),
    [inventoryList, selectedProduct]
  );

  const handleProductSelect = (e) => {
    const id = e.target.value;
    const selected = inventoryList.find((item) => item.id === id);
    setSelectedProduct(id);
    if (selected && selected.price !== undefined && selected.price !== null) {
      setPrice(String(selected.price));
    } else {
      setPrice("");
    }
    setErrors((prev) => ({ ...prev, product: "" }));
  };

  const validate = () => {
    const next = {};
    if (!customerId) next.form = "No customer selected. Go back and choose one.";
    if (!selectedProduct) next.product = "Please select a product";

    if (quantity === "" || quantity === null) {
      next.quantity = "Quantity is required";
    } else if (!/^\d+$/.test(String(quantity))) {
      next.quantity = "Quantity must be a whole number";
    } else if (Number(quantity) <= 0) {
      next.quantity = "Quantity must be greater than 0";
    } else if (
      selectedProductData &&
      Number(quantity) > Number(selectedProductData.quantity || 0)
    ) {
      next.quantity = `Only ${selectedProductData.quantity} in stock`;
    }

    if (price === "" || price === null) {
      next.price = "Price is required";
    } else if (Number.isNaN(Number(price))) {
      next.price = "Price must be a number";
    } else if (Number(price) < 0) {
      next.price = "Price cannot be negative";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const sendData = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = {
        customer_id: customerId,
        admin_id: adminId,
        product_name: selectedProductData.productName,
        quantity: Number(quantity),
        price: Number(price),
        product_id: selectedProduct,
        total_amount: Number(price) * Number(quantity),
        created_at: new Date(),
        type: "send",
      };

      await addDoc(collection(db, "customerRecord"), data);

      const newQuantity =
        Number(selectedProductData.quantity || 0) - Number(quantity);
      await updateDoc(doc(db, "inventory", selectedProduct), {
        quantity: newQuantity,
      });

      setSelectedProduct("");
      setQuantity("");
      setPrice("");
      setErrors({});
      toast.success("Product sent successfully");
      if (typeof onComplete === "function") onComplete();
    } catch (err) {
      console.error("Error sending:", err);
      toast.error("Failed to send product");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
      hasError ? "border-red-400" : "border-slate-300"
    }`;

  return (
    <form onSubmit={sendData} className="space-y-5" noValidate>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
          <PackageOpen size={18} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Send product</h3>
          <p className="text-xs text-slate-500">This will debit the product from your inventory</p>
        </div>
      </div>

      {errors.form && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {errors.form}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
        <select
          value={selectedProduct}
          onChange={handleProductSelect}
          className={fieldClass(errors.product)}
        >
          <option value="">Choose a product</option>
          {inventoryList.map((item) => (
            <option key={item.id} value={item.id} disabled={Number(item.quantity) === 0}>
              {item.productName} - Stock: {item.quantity}
            </option>
          ))}
        </select>
        {errors.product && <p className="mt-1 text-xs text-red-600">{errors.product}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
          <input
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setErrors((prev) => ({ ...prev, quantity: "" }));
            }}
            className={fieldClass(errors.quantity)}
            placeholder="Enter quantity"
          />
          {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Price per unit</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setErrors((prev) => ({ ...prev, price: "" }));
            }}
            className={fieldClass(errors.price)}
            placeholder="0.00"
          />
          {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
        </div>
      </div>

      {selectedProduct && quantity && price && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-indigo-800">Product</span>
            <span className="font-medium text-indigo-900">{selectedProductData?.productName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-indigo-800">Total</span>
            <span className="font-semibold text-indigo-900">
              Rs {(Number(price || 0) * Number(quantity || 0)).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? "Sending..." : "Send product"}
      </button>
    </form>
  );
}

export default Send;
