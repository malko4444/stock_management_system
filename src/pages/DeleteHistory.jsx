import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { NavBar } from "../components/NavBar";
import { History } from "lucide-react";

export const DeleteHistory = () => {
  const [deleteHistory, setDeleteHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const snap = await getDocs(collection(db, "deleted_records"));
        setDeleteHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching deleted records:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
            <History size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Deletion history</h1>
            <p className="text-sm text-slate-500">Records that were removed from your inventory or sales</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
            </div>
          ) : deleteHistory.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No deleted records found.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {deleteHistory.map((item) => (
                <li key={item.id} className="px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span className="text-slate-700">{item.quantity ?? "-"} kg</span>
                  <span className="text-slate-700">Rate: Rs {item.rate ?? "-"}</span>
                  <span className="text-slate-900 font-medium">Total: Rs {item.totalAmount ?? "-"}</span>
                  <span className="ml-auto text-slate-500 text-xs">
                    {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : "No timestamp"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
