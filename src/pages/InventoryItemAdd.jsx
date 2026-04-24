import React, {
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import InventoryProducts from "../components/InventoryProducts";
import { AdminDataContext } from "./AdminContext";
import { NavBar } from "../components/NavBar";
import { toast } from "react-toastify";
import { Package, Loader2, XCircle, Save } from "lucide-react";

const DEFAULT_LOW_STOCK = 10;

function InventoryItemAdd() {
  const { updatedData, setUpdatedData } = useContext(AdminDataContext);

  const [form, setForm] = useState({
    productName: "",
    sku: "",
    category: "",
    quantity: "",
    price: "",
    lowStockThreshold: String(DEFAULT_LOW_STOCK),
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const adminId = localStorage.getItem("adminId");
  const inventoryRef = useRef(null);

  const isEdit = !!(updatedData && updatedData.id);

  useEffect(() => {
    if (isEdit) {
      setForm({
        productName: updatedData.productName || "",
        sku: updatedData.sku || "",
        category: updatedData.category || "",
        quantity: updatedData.quantity ?? "",
        price: updatedData.price ?? "",
        lowStockThreshold:
          updatedData.lowStockThreshold ?? String(DEFAULT_LOW_STOCK),
      });
    }
  }, [updatedData, isEdit]);

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const resetForm = useCallback(() => {
    setForm({
      productName: "",
      sku: "",
      category: "",
      quantity: "",
      price: "",
      lowStockThreshold: String(DEFAULT_LOW_STOCK),
    });
    setErrors({});
    setUpdatedData(null);
  }, [setUpdatedData]);

  const validate = async () => {
    const next = {};

    if (!form.productName.trim()) {
      next.productName = "Product name is required";
    } else if (form.productName.trim().length < 2) {
      next.productName = "Name must be at least 2 characters";
    }

    if (form.quantity === "" || form.quantity === null) {
      next.quantity = "Quantity is required";
    } else if (!/^\d+$/.test(String(form.quantity))) {
      next.quantity = "Quantity must be a whole number";
    } else if (Number(form.quantity) < 0) {
      next.quantity = "Quantity cannot be negative";
    }

    if (form.price !== "" && form.price !== null) {
      const priceNum = Number(form.price);
      if (Number.isNaN(priceNum)) {
        next.price = "Price must be a number";
      } else if (priceNum < 0) {
        next.price = "Price cannot be negative";
      }
    }

    if (form.lowStockThreshold !== "" && form.lowStockThreshold !== null) {
      if (!/^\d+$/.test(String(form.lowStockThreshold))) {
        next.lowStockThreshold = "Threshold must be a whole number";
      } else if (Number(form.lowStockThreshold) < 0) {
        next.lowStockThreshold = "Threshold cannot be negative";
      }
    }

    if (form.sku && form.sku.trim().length > 32) {
      next.sku = "SKU must be 32 characters or fewer";
    }

    if (!next.productName) {
      try {
        const snap = await getDocs(
          query(collection(db, "inventory"), where("adminId", "==", adminId))
        );
        const normalized = form.productName.trim().toLowerCase();
        const duplicate = snap.docs.find((d) => {
          const existing = String(d.data().productName || "").trim().toLowerCase();
          if (existing !== normalized) return false;
          if (isEdit && d.id === updatedData.id) return false;
          return true;
        });
        if (duplicate) {
          next.productName = "A product with this name already exists";
        }
      } catch (err) {
        console.warn("Duplicate check skipped:", err);
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const ok = await validate();
    if (!ok) {
      setSubmitting(false);
      toast.error("Please fix the highlighted fields");
      return;
    }

    const payload = {
      productName: form.productName.trim(),
      sku: form.sku.trim() || null,
      category: form.category.trim() || null,
      quantity: Number(form.quantity),
      price: form.price === "" ? null : Number(form.price),
      lowStockThreshold:
        form.lowStockThreshold === ""
          ? DEFAULT_LOW_STOCK
          : Number(form.lowStockThreshold),
    };

    try {
      if (!isEdit) {
        await addDoc(collection(db, "inventory"), {
          ...payload,
          adminId,
          createdAt: new Date(),
        });
        toast.success("Product added to inventory");
      } else {
        await updateDoc(doc(db, "inventory", updatedData.id), {
          ...payload,
          updatedAt: new Date(),
        });
        toast.success("Product updated");
      }
      resetForm();
      if (inventoryRef.current?.fetchInventory) {
        await inventoryRef.current.fetchInventory();
      }
    } catch (err) {
      console.error("Error saving inventory:", err);
      toast.error(isEdit ? "Failed to update product" : "Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
      hasError ? "border-red-400" : "border-slate-300"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEdit ? "Update the details of an existing product" : "Add new products and keep an eye on your stock levels"}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isEdit ? "Edit product" : "Add a product"}
              </h2>
              <p className="text-xs text-slate-500">
                Fields marked with <span className="text-red-500">*</span> are required
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2" noValidate>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.productName}
                onChange={update("productName")}
                placeholder="e.g. PVC Pipe 1 inch"
                className={fieldClass(errors.productName)}
              />
              {errors.productName && <p className="mt-1 text-xs text-red-600">{errors.productName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={update("sku")}
                placeholder="Optional internal code"
                className={fieldClass(errors.sku)}
              />
              {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={update("category")}
                placeholder="e.g. Pipes, Fittings"
                className={fieldClass(false)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={update("quantity")}
                placeholder="0"
                className={fieldClass(errors.quantity)}
              />
              {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price per unit (Rs)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={update("price")}
                placeholder="0.00"
                className={fieldClass(errors.price)}
              />
              {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Low-stock threshold</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.lowStockThreshold}
                onChange={update("lowStockThreshold")}
                placeholder={String(DEFAULT_LOW_STOCK)}
                className={fieldClass(errors.lowStockThreshold)}
              />
              <p className="mt-1 text-xs text-slate-500">Flag the product when quantity drops to this level or below</p>
              {errors.lowStockThreshold && <p className="mt-1 text-xs text-red-600">{errors.lowStockThreshold}</p>}
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {submitting ? (isEdit ? "Updating..." : "Saving...") : (isEdit ? "Update product" : "Add product")}
              </button>
              {isEdit && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  <XCircle size={16} />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <InventoryProducts ref={inventoryRef} />
      </div>
    </div>
  );
}

export default InventoryItemAdd;
