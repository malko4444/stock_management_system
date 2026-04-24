import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { onHelperEvent } from "./lib/scanner";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Surface helper diagnostic events in DevTools so scanner issues are
  // visible without digging into the Electron terminal.
  useEffect(() => {
    return onHelperEvent((msg) => {
      if (msg?.event_ === "log") {
        console.info("[scanner-helper]", msg.text);
      } else if (msg?.event_) {
        console.info("[scanner-event]", msg);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return user ? <Dashboard user={user} /> : <Login />;
}
