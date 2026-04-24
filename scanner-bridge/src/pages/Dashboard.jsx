import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import {
  Boxes,
  Fingerprint,
  LogOut,
  ScanLine,
  UserCog,
} from "lucide-react";
import { toast } from "react-toastify";
import EnrollTab from "./tabs/EnrollTab";
import ScanTab from "./tabs/ScanTab";
import { ScannerStatusPill } from "../components/ScannerStatus";

const TABS = [
  { id: "enroll", label: "Enroll fingerprint", icon: UserCog },
  { id: "scan", label: "Attendance mode", icon: ScanLine },
];

export default function Dashboard({ user }) {
  const [tab, setTab] = useState("enroll");

  const logOut = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out");
    } catch (err) {
      console.error(err);
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white grid place-items-center shadow-sm relative">
                <Boxes size={20} />
                <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-lg bg-emerald-500 text-white grid place-items-center ring-2 ring-white">
                  <Fingerprint size={10} />
                </span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-900">
                  Scanner Bridge
                </div>
                <div className="text-[11px] text-slate-500">
                  Plastic Factory
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <ScannerStatusPill />
              <span className="text-xs text-slate-500">
                {user?.email}
              </span>
            </div>

            <button
              onClick={logOut}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
          <div className="sm:hidden pb-3">
            <ScannerStatusPill />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-fade-in">
          {tab === "enroll" && <EnrollTab user={user} />}
          {tab === "scan" && <ScanTab user={user} />}
        </div>
      </div>
    </div>
  );
}
