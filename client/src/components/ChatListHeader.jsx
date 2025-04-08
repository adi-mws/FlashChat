import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { useNotification } from "../hooks/NotificationContext";
import { useTheme } from "../hooks/ThemeContext";

export default function ChatListHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const dropdownRef = useRef(null);
  useEffect(() => {
    console.log(user?.pfp)
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
      <div className="ChatHeader flex bg-white z-100 w-[350px] dark:bg-black text-sm shadow-sm px-5 sm:px-10 h-[60px] justify-between flex-row items-center">
        <div className="flex items-center flex-row gap-5">
          <div className="menu-icon dark:text-white sm-inline-block md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            <i className="fa-solid fa-bars"></i>
          </div>
          <Link to="/" className="logo text-lg dark:text-white">FlashChat</Link>
        </div>

        {/* Navigation Links */}
        <nav className={`nav-links ${menuOpen ? "open" : ""} flex flex-row gap-4`}>
          <button className="w-[40px] h-[40px] hidden dark:bg-gray-800 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-300 dark:text-white rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <i className={`fa-solid fa-${theme === "dark" ? "sun" : "moon"} text-md`}></i>
          </button>

          {user ?
            <>
              {/* Profile Section */}
              <div className="relative" ref={dropdownRef}>
                <div
                  className="profile flex gap-3 items-center py-1 px-7 bg-gray-100 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <img src={user?.pfp} className="pfp w-8 h-8 rounded-full" alt="Profile" />
                  <img className={`${dropdownOpen ? "rotate-180" : ""} transition duration-300`} src="/imgs/dropdown-icon.png" alt="dropdown-icon"></img>
                </div>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md z-10">
                    <ul className="py-2">
                      <li className="flex items-center px-4 gap-5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition">
                        <i className="fas fa-user"></i> <span> Profile</span>
                      </li>
                      <li className="flex items-center px-4 gap-5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition" onClick={() => {theme === 'light' ? setTheme('dark') : setTheme('light')}}>
                        <i className={`fas fa-${theme ==='dark'?  'sun' : 'moon'}`}></i> <span> Appearence</span>
                      </li>
                      
                      <li className="flex items-center gap-4 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition">
                        <i className="fas fa-cog"></i> <span> Settings</span>
                      </li>
                      <li className="flex items-center gap-4 px-4 py-2 text-sm text-red-500 hover:bg-red-100 dark:hover:bg-gray-100 cursor-pointer transition" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i> Logout
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </>
            : <></>}
        </nav>
      </div>
    </>
  );
}