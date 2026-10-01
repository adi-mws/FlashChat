import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame, MoreVertical, UserPlus, LogIn } from "lucide-react";
import { CHAT_ROUTES, SETTINGS_ROUTES } from "../../../routes/routes";

export default function ChatListHeader({ onCreateGroup }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        btnRef.current &&
        !btnRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setShowMenu(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="ChatHeader flex bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md z-10 w-full border-b border-slate-200/50 dark:border-zinc-900 text-sm px-4 h-[64px] items-center justify-between flex-shrink-0 relative">
      {/* App Brand */}
      <Link
        to={CHAT_ROUTES.root}
        className="logo text-lg font-bold dark:text-white flex gap-2 items-center tracking-tight select-none"
      >
      
        <span className="text-slate-900 dark:text-white font-bold">FlashChat</span>
      </Link>

      {/* Triple Dot Vertical Ellipses Menu Button */}
      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setShowMenu((prev) => !prev)}
          className={`p-2 rounded-xl transition-all cursor-pointer focus:outline-none ${
            showMenu
              ? "bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100"
              : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-900"
          }`}
          title="More options"
          aria-label="More options"
          aria-expanded={showMenu}
        >
          <MoreVertical size={18} />
        </button>

        {/* Dropdown Options */}
        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-0 mt-2 w-48 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl p-1.5 z-50 animate-scale-in text-xs"
          >
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                if (onCreateGroup) onCreateGroup();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/70 rounded-xl transition cursor-pointer text-left font-medium"
            >
              <span>Create Group Chat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate(SETTINGS_ROUTES.linkedDevices);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/70 rounded-xl transition cursor-pointer text-left font-medium"
            >
              <span>Linked Devices</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
