import React, { useState } from "react";
import { Link, parsePath, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useForm } from "react-hook-form";
import axios from "axios";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { admin, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();



  const handleLogout = () => {
    logout();
    showNotification("success", 'Logout Successful!')
    navigate('/login');
  }
  return (
    <header className="header bg-white dark:bg-black text-sm shadow-sm flex h-[60px] px-4 w-screen justify-between flex-row items-center">
      <div className="flex items-center flex-row gap-5">
        <div className="menu-icon dark:text-white sm-inline-block md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </div>
        <div className="logo text-lg dark:text-white">QuickRTC</div>
      </div>


      {/* Hamburger Menu Icon */}


      {/* Navigation Links */}
      <nav className={`nav-links ${menuOpen ? "open" : ""} flex flex-row gap-4`}>
        <button className="w-[40px] h-[40px] hidden xs:block sm:me-5 md:me-10 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-300 dark:text-white rounded-full"><i className="fa-solid fa-moon text-md"></i></button>
        {admin ?
          <>
            {admin ?
              <p>Welcome {admin?.name}</p>
              : <></>
            }
            <Link to="/chat" onClick={() => setMenuOpen(false)}>Chat</Link>
            <div className="user-profile">

            </div>

            <Link to="" onClick={() => { setMenuOpen(false); handleLogout() }}>Logout</Link>
          </>
          :
          <>
            <button className="px-12 py-2 hidden md:block bg-orange-500 hover:bg-orange-600 transition duration-300 text-white rounded-md" onClick={() => { setMenuOpen(false); navigate("/register") }}>Register</button>

            <button className="px-12 py-2 border-1 border-orange-500 transition duration-300 hover:bg-orange-600 hover:text-white dark:text-white rounded-md" onClick={() => { setMenuOpen(false); navigate("/login"); }}>Login</button>
          </>
        }
      </nav>
    </header>
  );
}
