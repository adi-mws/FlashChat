import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="logo">ChatApp</div>

      {/* Hamburger Menu Icon */}
      <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </div>

      {/* Navigation Links */}
      <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
        <Link to="/chat" onClick={() => setMenuOpen(false)}>Chat</Link>
        <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
        <Link to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
        <Link to="/logout" onClick={() => setMenuOpen(false)}>Logout</Link>
      </nav>
    </header>
  );
}
