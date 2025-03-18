import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react"; // Icon library for menu

export const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const logOutUser = () => {
    localStorage.removeItem("adminId");
    window.location.reload();
  };

  return (
    <nav className="bg-blue-500 shadow-md rounded-lg p-4">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <h1 className="text-white text-lg font-bold">Stock Management</h1>

        {/* Hamburger Menu (Mobile) */}
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Navigation Links */}
        <ul
          className={`md:flex items-center space-x-6 ${
            isOpen ? "block" : "hidden"
          } md:flex-row md:space-x-6 absolute md:static bg-blue-500 w-full left-0 md:w-auto md:bg-transparent top-[60px] md:top-auto md:p-0 p-4`}
        >
          <li>
            <Link to="/home" className="text-white font-semibold hover:text-gray-300">
              Home
            </Link>
          </li>
          {/* <li>
            <Link to="/details" className="text-white font-semibold hover:text-gray-300">
              Customers
            </Link>
          </li> */}
          <li>
            <Link to="/inventoryItem" className="text-white font-semibold hover:text-gray-300">
              Inventory
            </Link>
          </li>
          <li>
            <Link to="/details" className="text-white font-semibold hover:text-gray-300">
              Customer Details
            </Link>
          </li>
          <li>
            <button
              onClick={logOutUser}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-md"
            >
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};
