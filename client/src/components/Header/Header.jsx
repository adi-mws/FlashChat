import React, { useState } from "react";
import { Link, parsePath, useNavigate } from "react-router-dom";
import "./Header.css";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
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
    <header className="header">
      <div className="logo">ChatApp</div>
      {admin ? 
      <p>Welcome {admin?.name}</p>
      : <></>  
    }

      {/* Hamburger Menu Icon */}
      <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </div>

      {/* Navigation Links */}
      <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
        {admin ?
          <>
            
            <Link to="/chat" onClick={() => setMenuOpen(false)}>Chat</Link>
            <Link to="" onClick={() => { setMenuOpen(false); handleLogout() }}>Logout</Link>
          </>
          :
          <>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
          </>
        }
      </nav>
    </header>
  );
}
