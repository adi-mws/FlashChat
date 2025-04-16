import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { useNotification } from "../hooks/NotificationContext";
import { useTheme } from "../hooks/ThemeContext";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    showNotification("success", "Logout Successful!");
    navigate("/login");
  };

  return (
    <>
      <div className="header-relative h-[60px] w-full"></div>
      <header className="header fixed top-0 left-0 bg-white z-100 dark:bg-black text-sm shadow-sm flex px-5 sm:px-10 h-[60px] w-full justify-between flex-row items-center">
        <div className="flex items-center flex-row gap-5">
          <div className="menu-icon dark:text-white sm-inline-block md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            <i className="fa-solid fa-bars"></i>
          </div>
          <Link to="/" className="logo text-lg dark:text-white flex dark:hidden gap-2 items-center"><img className="h-10 w-10 rounded-full text-xs" src='/imgs/logo.png' alt='logo'/>FlashChat</Link>
          <Link to="/" className="logo text-lg dark:text-white dark:flex gap-2 hidden  items-center"><img className="h-10 w-10 rounded-full text-xs" src='/imgs/logo-dark.png' alt='logo'/>FlashChat</Link>
        </div>

        {/* Navigation Links */}
        <nav className={`nav-links ${menuOpen ? "open" : ""} flex flex-row gap-4`}>
          <button className="w-[40px] h-[40px] hidden 2xs:block sm:me-5 md:me-10 dark:bg-gray-800 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-300 dark:text-white rounded-full" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <i className={`fa-solid fa-${theme === "dark" ? "sun" : "moon"} text-md`}></i>
          </button>
                        
          {user ? (
            <>
              {/* Profile Section */}
              <div className="relative" ref={dropdownRef}>
                <div 
                  className="profile flex gap-3 items-center py-1 px-7 bg-gray-100 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <img src={user?.pfp} className="pfp w-8 h-8 rounded-full" alt="Profile" />
                  <p className="name dark:text-white">{user?.name}</p>
                  <img className={`${dropdownOpen ? "rotate-180" : ""} transition duration-300`} src="/imgs/dropdown-icon.png" alt="dropdown-icon"></img>
                </div>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md z-10">
                    <ul className="py-2">
                      <li className="flex items-center px-4 gap-5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition">
                        <i className="fas fa-user"></i> <span> Profile</span>
                      </li>
                      <li className="flex items-center gap-4 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition">
                        <i className="fas fa-cog"></i> <span> Settings</span>
                      </li>
                      <li className="flex items-center gap-4 px-4 py-2 text-sm text-red-500 hover:bg-red-100 dark:hover:bg-red-600 cursor-pointer transition" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i> Logout
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="px-12 py-2 hidden md:block dark:bg-primary-1 bg-primary hover:bg-primary dark:hover:bg-primary-1 transition duration-300 text-white rounded-md" 
                onClick={() => { setMenuOpen(false); navigate("/register") }}>Register</button>

              <button className="px-12 py-2 border-1 hover:bg-primary hover:text-white border-primary transition duration-300 dark:text-white rounded-md" 
                onClick={() => { setMenuOpen(false); navigate("/login"); }}>Login</button>
            </>
          )}
        </nav>
      </header>
    </>
  );
}