import { Search, User } from "lucide-react"; 
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const Topbar = ({ onSearch, searchType = "products", showSearch = true, isCollapsed }) => {
  const [searchInput, setSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);
  const [debouncedValue, setDebouncedValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(searchInput);
    }, 300); 

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  const displayName = localStorage.getItem("userDisplayName") || "User";

  useEffect(() => {
    const storedUser = localStorage.getItem("adminId");
    if (storedUser) setUser(storedUser);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const logOutUser = () => {
    localStorage.removeItem("adminId");
    localStorage.removeItem("userDisplayName");
    setUser(null);
    window.location.reload();
  };

  return (
    <div className="w-full min-h-[70px] border-b border-[#17BCBE] flex flex-wrap justify-between items-center gap-2 px-3 py-3 md:px-4 md:py-4 bg-white shrink-0">
      {/* Left Section - Logo (when collapsed) & Search */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {isCollapsed && (
          <span className="text-xl font-bold text-[#108587] leading-tight lg:text-2xl whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-500">
            Stockease
          </span>
        )}
        {showSearch && (
          <div className="relative flex items-center bg-[#E8F8F9] w-full max-w-[280px] md:max-w-[430px] h-[42px] px-3 py-2 rounded-lg border border-[#20dbdf]">
            <Search size={20} className="absolute left-2.5 text-[#17BCBE] shrink-0" />
            <input
              type="text"
              placeholder={searchType === "products" ? "Search products..." : "Search customers..."}
              className="w-full h-full pl-8 pr-8 py-1 rounded-lg border-0 outline-none text-[#108587] bg-transparent focus:ring-0 focus:shadow-none focus:outline-none"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button type="button" onClick={() => setSearchInput('')} className="absolute right-2 font-bold text-[#17BCBE] cursor-pointer" aria-label="Clear">
                ✕
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Right Section (Profile Dropdown) */}
      <div className="relative" ref={dropdownRef}>
        <button
          className={`flex items-center gap-2 p-2 rounded-md transition cursor-pointer 
            ${isDropdownOpen ? "bg-[#108587] text-white" : "bg-[#E8F8F9] text-[#108587] hover:bg-[#108587] hover:text-white"}`}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <User size={20} />
          <span className="hidden sm:block">{user ? displayName : "Guest"}</span>
        </button>

        {isDropdownOpen && (
          <div className="absolute z-17 right-0 mt-2 w-44 bg-white border border-[#17BCBE] rounded-lg shadow-lg">
            <ul className="py-2">
              <li className="px-4 py-2 hover:bg-[#E8F8F9] cursor-pointer text-[#108587]">Profile</li>
              {user ? (
                <li
                  onClick={logOutUser}
                  className="px-4 py-2 text-red-500 hover:bg-red-100 cursor-pointer"
                >
                  Logout
                </li>
              ) : (
                <Link to="/login">
                  <li className="px-4 py-2 text-green-500 hover:bg-green-100 cursor-pointer">
                    Login
                  </li>
                </Link>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;