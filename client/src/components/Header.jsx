import React, { useState } from "react";
import { Link, parsePath, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useTheme } from "../contexts/ThemeContext";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();


  const handleLogout = () => {
    logout();
    showNotification("success", 'Logout Successful!')
    navigate('/login');
  }
  return (
    <>

      <div className="header-relative h-[60px] w-full"></div>
      <header className="header fixed top-0 left-0 bg-white z-100 dark:bg-black text-sm shadow-sm flex px-5 sm:px-10 h-[60px] w-full justify-between flex-row items-center">
        <div className="flex items-center flex-row gap-5">
          <div className="menu-icon dark:text-white sm-inline-block md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            <i className="fa-solid fa-bars"></i>
          </div>
          <Link to='/' className="logo text-lg dark:text-white">FlashChat</Link>
        </div>

        {/* Hamburger Menu Icon */}


        {/* Navigation Links */}
        <nav className={`nav-links ${menuOpen ? "open" : ""} flex flex-row gap-4`}>
          <button className="w-[40px] h-[40px] hidden 2xs:block sm:me-5 md:me-10 dark:bg-gray-800 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-300 dark:text-white rounded-full" onClick={() => {theme === 'dark' ? setTheme('light') : setTheme('dark')}}><i className={`fa-solid fa-${theme == 'dark' ? 'sun' : 'moon'} text-md`}></i></button>
          {user ?
            <>
              {user ?
                <p>Welcome {user?.name}</p>
                : <></>
              }
              <Link to="/chat" onClick={() => setMenuOpen(false)}>Chat</Link>
              <div className="user-profile">

              </div>

              <Link to="" onClick={() => { setMenuOpen(false); handleLogout() }}>Logout</Link>
            </>
            :
            <>
              <button className="px-12 py-2 hidden md:block dark:bg-primary-1 bg-primary hover:bg-primary dark:hover-bg-primary-1 transition duration-300 text-white rounded-md" onClick={() => { setMenuOpen(false); navigate("/register") }}>Register</button>

              <button className="px-12 py-2 border-1 hover:bg-primary hover:text-white border-primary transition duration-300 dark:text-white rounded-md" onClick={() => { setMenuOpen(false); navigate("/login"); }}>Login</button>
            </>
          }
        </nav>
      </header>
    </>
  );
}
