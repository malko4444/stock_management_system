import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import { DeleteHistory } from "./pages/DeleteHistory";
import CustomerDetails from "./pages/CustomerDetails";
import AddCustomerRecord from "./pages/AddCustomerRecord";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AdminProtectedWrapper from "./pages/adminProtectedWrapper";
import InventoryItemAdd from "./pages/InventoryItemAdd";
import Employees from "./pages/Employees";
import Kiosk from "./pages/Kiosk";
import Attendance from "./pages/Attendance";
import Payroll from "./pages/Payroll";
import EmployeeAttendance from "./pages/EmployeeAttendance";

export const App = () => {
  return (
    <BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <main>
        <Routes>
          <Route path="/home" element={<AdminProtectedWrapper><Home /></AdminProtectedWrapper>} />
          <Route path="/addRecord" element={<AdminProtectedWrapper><AddCustomerRecord /></AdminProtectedWrapper>} />
          <Route path="/details" element={<AdminProtectedWrapper><CustomerDetails /></AdminProtectedWrapper>} />
          <Route path="/deletehistory" element={<AdminProtectedWrapper><DeleteHistory /></AdminProtectedWrapper>} />
          <Route path="/inventoryItem" element={<AdminProtectedWrapper><InventoryItemAdd /></AdminProtectedWrapper>} />
          <Route path="/employees" element={<AdminProtectedWrapper><Employees /></AdminProtectedWrapper>} />
          <Route path="/kiosk" element={<AdminProtectedWrapper><Kiosk /></AdminProtectedWrapper>} />
          <Route path="/attendance" element={<AdminProtectedWrapper><Attendance /></AdminProtectedWrapper>} />
          <Route path="/employee-attendance" element={<AdminProtectedWrapper><EmployeeAttendance /></AdminProtectedWrapper>} />
          <Route path="/employee-attendance/:employeeId" element={<AdminProtectedWrapper><EmployeeAttendance /></AdminProtectedWrapper>} />
          <Route path="/payroll" element={<AdminProtectedWrapper><Payroll /></AdminProtectedWrapper>} />

          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};
