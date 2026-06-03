import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/AuthContext";
import { useNotification } from "../../hooks/NotificationContext";
import { Flame } from "lucide-react";
import { LogOut, Settings, User } from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

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
      <header className="header fixed top-0 left-0 bg-zinc-950 border-b border-zinc-900 z-100 text-sm shadow-sm flex px-5 sm:px-10 h-[60px] w-full justify-between flex-row items-center">
        <div className="flex items-center flex-row gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-500 text-white shadow-sm shadow-indigo-500/20">
            <Flame size={18} fill="white" />
          </div>
          <span className="text-slate-900 text-lg font-semibold dark:text-white">
            FlashChat
          </span>

          <span className="text-slate-500 dark:text-white text-xs dark:bg-zinc-800/50 bg-slate-200/50 px-2 py-1 rounded-md">
            v2.3.0
          </span>
        </div>

        {/* Navigation Links */}
        <nav className={`nav-links ${menuOpen ? "open" : ""} flex flex-row gap-4`}>


          {user ? (
            <>
              {/* Profile Section */}
              <div className="relative" ref={dropdownRef}>
                <div
                  className="profile flex gap-3 items-center py-1 px-7 bg-zinc-100 dark:bg-zinc-900 rounded-md cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <img src={getImageUrl(user?.pfp)} className="pfp w-8 h-8 rounded-full" alt="Profile" />
                  <p className="name hidden sm:block dark:text-white">{user?.name}</p>
                  <img className={`${dropdownOpen ? "rotate-180" : ""} transition duration-300`} src="/imgs/dropdown-icon.png" alt="dropdown-icon"></img>
                </div>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 shadow-lg rounded-md z-10">
                    <ul className="py-2">
                      <li className="flex items-center px-4 gap-5 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition" onClick={() => navigate('/chats/profile')}>
                        <User size={20} /> <span> Profile</span>
                      </li>

                      <li className="flex items-center gap-4 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition" onClick={handleLogout}>
                        <LogOut size={20} /> Logout
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="px-6 py-2 text-sm font-normal hidden md:block dark:bg-primary-1 bg-primary hover:bg-primary dark:hover:bg-primary-1 transition duration-300 text-white rounded-md"
                onClick={() => { setMenuOpen(false); navigate("/register") }}>Register</button>

              <button className="px-7 py-2 border-1 font-light text-sm hover:bg-primary hover:text-white border-primary transition duration-300 dark:text-white rounded-md"
                onClick={() => { setMenuOpen(false); navigate("/login"); }}>Login</button>
            </>
          )}
        </nav>
      </header>
    </>
  );
}