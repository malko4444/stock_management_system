import React, {
  useState,
  useEffect,
  useContext,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { AdminDataContext } from "../pages/AdminContext";
import { Link } from "react-router-dom";
import { customerDataDataContext } from "../pages/CustomerContext";
import {
  Search,
  ArrowDownUp,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";

const LOW_STOCK_THRESHOLD = 10;

const InventoryProducts = forwardRef(function InventoryProducts(_, ref) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const { setUpdatedData } = useContext(AdminDataContext);
  const { setInventoryItem } = useContext(customerDataDataContext);

  const adminId = localStorage.getItem("adminId");

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "inventory"),
        where("adminId", "==", adminId)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setInventory(list);
      setInventoryItem(list);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({ fetchInventory }));

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteProductFromInventory = async (product) => {
    const ok = window.confirm(
      `Delete "${product.productName}"? This cannot be undone.`
    );
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "inventory", product.id));
      setInventory((prev) => prev.filter((item) => item.id !== product.id));
      toast.success("Product deleted");
    } catch (err) {
      console.error("Error deleting product:", err);
      toast.error("Failed to delete product");
    }
  };

  const editHandler = (item) => setUpdatedData(item);

  const filtered = useMemo(() => {
    let list = [...inventory];

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((item) =>
        [item.productName, item.category, item.sku]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s))
      );
    }

    list = list.filter((item) => {
      const q = Number(item.quantity) || 0;
      const threshold = Number(item.lowStockThreshold) || LOW_STOCK_THRESHOLD;
      if (stockFilter === "out") return q === 0;
      if (stockFilter === "low") return q > 0 && q <= threshold;
      if (stockFilter === "inStock") return q > threshold;
      return true;
    });

    if (sortKey === "name") {
      list.sort((a, b) =>
        String(a.productName || "").localeCompare(String(b.productName || ""))
      );
    } else if (sortKey === "quantity") {
      list.sort(
        (a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0)
      );
    } else if (sortKey === "newest") {
      list.sort((a, b) => {
        const aT = a.createdAt?.toDate ? a.createdAt.toDate() : 0;
        const bT = b.createdAt?.toDate ? b.createdAt.toDate() : 0;
        return bT - aT;
      });
    }

    return list;
  }, [inventory, search, stockFilter, sortKey]);

  const stockBadge = (item) => {
    const q = Number(item.quantity) || 0;
    const threshold = Number(item.lowStockThreshold) || LOW_STOCK_THRESHOLD;
    if (q === 0)
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
          <AlertTriangle size={12} />
          Out of stock
        </span>
      );
    if (q <= threshold)
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
          <AlertTriangle size={12} />
          Low stock
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
        In stock
      </span>
    );
  };

  const formatPrice = (v) => {
    if (v === undefined || v === null || v === "") return "-";
    return `Rs ${Number(v).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
            <Package size={18} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Inventory ({filtered.length})
            </h3>
            <p className="text-xs text-slate-500">Search, filter and manage your products</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, SKU or category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-72 pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All stock</option>
            <option value="inStock">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
          <div className="relative">
            <ArrowDownUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="name">Name (A-Z)</option>
              <option value="quantity">Quantity (high to low)</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 grid place-items-center mb-3">
            <Package size={18} className="text-slate-400" />
          </div>
          <p className="text-sm">No products match your filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">Product</th>
                <th className="text-left font-medium px-5 py-3">Category</th>
                <th className="text-left font-medium px-5 py-3">Quantity</th>
                <th className="text-left font-medium px-5 py-3">Price</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3">Added</th>
                <th className="text-right font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{item.productName}</div>
                    {item.sku && <div className="text-xs text-slate-500">SKU: {item.sku}</div>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{item.category || "-"}</td>
                  <td className="px-5 py-3 text-slate-900 font-medium">{item.quantity}</td>
                  <td className="px-5 py-3 text-slate-700">{formatPrice(item.price)}</td>
                  <td className="px-5 py-3">{stockBadge(item)}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : "-"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link to="/inventoryItem">
                        <button
                          onClick={() => editHandler(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium transition-colors"
                        >
                          <Edit2 size={13} />
                          Edit
                        </button>
                      </Link>
                      <button
                        onClick={() => deleteProductFromInventory(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition-colors"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export default InventoryProducts;
