import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { useNotification } from "../hooks/NotificationContext";
import { useTheme } from "../hooks/ThemeContext";

export default function ChatListHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <>
      <div className="ChatHeader flex bg-white z-100 w-full dark:bg-zinc-900 border-b-1 dark:border-zinc-800 border-zinc-100 text-sm shadow-sm px-2 h-[60px] justify-between flex-row items-center">
        <div className="flex items-center flex-row gap-5">
          {/* <div className="menu-icon dark:text-white sm-inline-block md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            <i className="fa-solid fa-bars"></i>
          </div> */}
           <Link to="/" className="logo text-lg dark:text-white flex gap-2 items-center"><img className="h-10 w-10 rounded-full text-xs" src='/imgs/logo.png' alt='logo'/>FlashChat</Link>

        </div>

        {/* Navigation Links */}
        <nav className={`nav-links ${menuOpen ? "open" : ""} flex flex-row gap-4`}>
          <button className="w-[40px] h-[40px] hidden dark:bg-gray-800 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-300 dark:text-white rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <i className={`fa-solid fa-${theme === "dark" ? "sun" : "moon"} text-md`}></i>
            
          </button>


        </nav>
      </div>
    </>
  );
}