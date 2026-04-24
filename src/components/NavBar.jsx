import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  Package,
  Users,
  UserCog,
  ClipboardList,
  Calculator,
  KeyRound,
  LogOut,
  Boxes,
  CalendarDays,
} from "lucide-react";

const links = [
  { to: "/home", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventoryItem", label: "Inventory", icon: Package },
  { to: "/details", label: "Customers", icon: Users },
  { to: "/employees", label: "Employees", icon: UserCog },
  { to: "/kiosk", label: "Kiosk", icon: KeyRound },
  { to: "/attendance", label: "Log", icon: ClipboardList },
  { to: "/employee-attendance", label: "By employee", icon: CalendarDays },
  { to: "/payroll", label: "Payroll", icon: Calculator },
];

export const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const logOutUser = () => {
    localStorage.removeItem("adminId");
    navigate("/login");
  };

  const linkClasses = ({ isActive }) =>
    [
      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
      isActive
        ? "bg-indigo-50 text-indigo-700"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    ].join(" ");

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          <Link to="/home" className="flex items-center gap-2 flex-shrink-0">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white grid place-items-center shadow-sm">
              <Boxes size={20} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">Stock Manager</div>
              <div className="text-[11px] text-slate-500">Plastic Factory</div>
            </div>
          </Link>

          <div className="hidden xl:flex items-center gap-1 overflow-x-auto">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClasses}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>

          <div className="hidden xl:flex items-center flex-shrink-0">
            <button
              onClick={logOutUser}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>

          <button
            className="xl:hidden inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {isOpen && (
          <div className="xl:hidden pb-4 animate-fade-in">
            <div className="flex flex-col gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={linkClasses}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
              <button
                onClick={logOutUser}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
