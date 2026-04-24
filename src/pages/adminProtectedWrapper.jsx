import React from "react";
import { Navigate } from "react-router-dom";

function AdminProtectedWrapper({ children }) {
  const adminId = localStorage.getItem("adminId");
  if (!adminId) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default AdminProtectedWrapper;
