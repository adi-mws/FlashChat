import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { useNotification } from "../hooks/NotificationContext";
import { useTheme } from "../hooks/ThemeContext";
import { LogOut, Settings, User } from "lucide-react";
import { getImageUrl } from "../utils/imageUtils";

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
          <Link to="/" className="logo text-lg dark:text-white flex gap-2 items-center"><img className="h-10 w-10 rounded-full text-xs" src='/imgs/logo.png' alt='logo'/>FlashChat <span className="bg-zinc-800 text-sm font-secondary text-white px-2 py-0.5 rounded-md ml-2">v2.1</span>
</Link>
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
                        <User size={20}/> <span> Profile</span>
                      </li>
                     
                      <li className="flex items-center gap-4 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition" onClick={handleLogout}>
                        <LogOut size={20}/> Logout
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