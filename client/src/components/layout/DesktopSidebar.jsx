import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  MessageSquare,
  Sparkles,
  Users,
  Settings,
  Shield,
  MonitorSmartphone,
  History,
  User,
  LogOut,
  Flame,
} from "lucide-react";
import { selectUser, logoutUser } from "../../redux/slices/authSlice";
import { selectChats } from "../../redux/slices/chatsSlice";
import { getImageUrl } from "../../lib/imageUtils";
import {
  CHAT_ROUTES,
  SPARK_ROUTES,
  ACCOUNT_ROUTES,
  SETTINGS_ROUTES,
  ADMIN_ROUTES,
  MARKETING_ROUTES,
} from "../../../routes/routes";

export default function DesktopSidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useSelector(selectUser);
  const chats = useSelector(selectChats);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const profileBtnRef = useRef(null);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // Total unread messages across all chats
  const totalUnreadCount = Array.isArray(chats)
    ? chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
    : 0;

  // Active route checks
  const isChatsActive =
    location.pathname.startsWith("/app/chats") ||
    location.pathname.startsWith("/chat/");
  const isSparksActive = location.pathname.startsWith(SPARK_ROUTES.root);
  const isContactsActive = location.pathname.startsWith(ACCOUNT_ROUTES.contacts);
  const isSettingsActive = location.pathname.startsWith("/settings");
  const isAdminActive = location.pathname.startsWith(ADMIN_ROUTES.dashboard);

  const handleLogout = () => {
    setShowProfileMenu(false);
    dispatch(logoutUser()).then(() => navigate(MARKETING_ROUTES.login));
  };

  // Close dropup when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <aside className="w-16 h-full bg-slate-50 dark:bg-zinc-950 border-r border-slate-200/70 dark:border-zinc-900 flex flex-col items-center py-3.5 select-none z-30 flex-shrink-0 relative">
      {/* Top Section: Logo & Feature Navigation Icons */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Logo Button */}
        <button
          type="button"
          onClick={() => navigate(CHAT_ROUTES.root)}
          className="relative group p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none"
          title="FlashChat"
          aria-label="FlashChat Home"
        >
          <Flame size={20} className="fill-white" />
        </button>

        <div className="w-7 h-px bg-slate-200/80 dark:bg-zinc-800/80 my-0.5" />

        {/* Feature navigation icons touching top below logo */}
        <nav className="flex flex-col items-center gap-2 w-full">
          {/* Chats */}
          <div className="relative w-full flex items-center justify-center group">
            {isChatsActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
            )}
            <button
              type="button"
              onClick={() => navigate(CHAT_ROUTES.root)}
              className={`relative p-2.5 rounded-2xl transition-all duration-200 cursor-pointer focus:outline-none ${isChatsActive
                ? "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-900"
                }`}
              aria-label="Chats"
            >
              <MessageSquare size={20} />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 flex items-center justify-center bg-emerald-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white dark:ring-zinc-950 shadow-sm animate-pulse">
                  {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                </span>
              )}
            </button>
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-0 px-2.5 py-1 bg-zinc-900/90 text-white text-[11px] font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0">
              Chats
            </span>
          </div>

          {/* Sparks */}
          <div className="relative w-full flex items-center justify-center group">
            {isSparksActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
            )}
            <button
              type="button"
              onClick={() => navigate(SPARK_ROUTES.root)}
              className={`relative p-2.5 rounded-2xl transition-all duration-200 cursor-pointer focus:outline-none ${isSparksActive
                ? "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-900"
                }`}
              aria-label="Sparks"
            >
              <Sparkles size={20} />
            </button>
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-0 px-2.5 py-1 bg-zinc-900/90 text-white text-[11px] font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0">

              Sparks
            </span>
          </div>

          {/* Contacts */}
          <div className="relative w-full flex items-center justify-center group">
            {isContactsActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
            )}
            <button
              type="button"
              onClick={() => navigate(ACCOUNT_ROUTES.contacts)}
              className={`relative p-2.5 rounded-2xl transition-all duration-200 cursor-pointer focus:outline-none ${isContactsActive
                ? "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-900"
                }`}
              aria-label="Contacts"
            >
              <Users size={20} />
            </button>
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-0 px-2.5 py-1 bg-zinc-900/90 text-white text-[11px] font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0">

              Contacts
            </span>
          </div>

          {/* Settings */}
          <div className="relative w-full flex items-center justify-center group">
            {isSettingsActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
            )}
            <button
              type="button"
              onClick={() => navigate(SETTINGS_ROUTES.profile)}
              className={`relative p-2.5 rounded-2xl transition-all duration-200 cursor-pointer focus:outline-none ${isSettingsActive
                ? "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-900"
                }`}
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-0 px-2.5 py-1 bg-zinc-900/90 text-white text-[11px] font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0">
              Settings
            </span>
          </div>

          {/* Admin Console (If Admin) */}
          {isAdmin && (
            <div className="relative w-full flex items-center justify-center group">
              {isAdminActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />
              )}
              <button
                type="button"
                onClick={() => navigate(ADMIN_ROUTES.dashboard)}
                className={`relative p-2.5 rounded-2xl transition-all duration-200 cursor-pointer focus:outline-none ${isAdminActive
                  ? "bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-400 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                  }`}
                aria-label="Admin Console"
              >
                <Shield size={20} />
              </button>
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-0 px-2.5 py-1 bg-zinc-900/90 text-white text-[11px] font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0">
                Admin Console
              </span>
            </div>
          )}
        </nav>
      </div>

      {/* Bottom Section: User Profile Avatar & Dropup */}
      <div className="mt-auto relative flex flex-col items-center">
        {user && (
          <>
            <div className="relative group">
              <button
                ref={profileBtnRef}
                type="button"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="relative rounded-full p-0.5 focus:outline-none cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Profile and options"
                aria-expanded={showProfileMenu}
              >
                <img
                  src={getImageUrl(user?.pfp)}
                  alt={user.name || user.username}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-zinc-800 hover:ring-indigo-500 transition-all duration-200 shadow-sm"
                />
                {/* Online indicator */}
                <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-950" />
              </button>

              {!showProfileMenu && (
                <span className="pointer-events-none absolute left-full ml-2 px-2.5 py-1 bg-zinc-900/90 text-white text-[11px] font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0">
                  Profile & Menu
                </span>
              )}
            </div>

            {/* Profile Dropup Menu */}
            {showProfileMenu && (
              <div
                ref={profileMenuRef}
                className="fixed left-[72px] bottom-3 w-64 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800 shadow-2xl rounded-2xl p-1.5 z-50 animate-scale-in"
              >
                {/* User Info Header */}
                <div className="flex items-center gap-3 p-3 bg-slate-50/80 dark:bg-zinc-800/50 rounded-xl mb-1 border border-slate-100 dark:border-zinc-800/60">
                  <div className="relative flex-shrink-0">
                    <img
                      src={getImageUrl(user?.pfp)}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-zinc-700"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-1 ring-white dark:ring-zinc-900" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-zinc-100 text-xs truncate">
                      {user.name || user.username}
                    </p>
                    <p className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium truncate">
                      @{user.username}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                        Online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Options List */}
                <ul className="space-y-0.5 text-xs text-slate-700 dark:text-zinc-300">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate(SETTINGS_ROUTES.profile);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition cursor-pointer text-left"
                    >
                      <User size={15} className="text-slate-400 dark:text-zinc-500" />
                      <span className="font-medium">Profile Settings</span>
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate(SETTINGS_ROUTES.linkedDevices);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition cursor-pointer text-left"
                    >
                      <MonitorSmartphone
                        size={15}
                        className="text-slate-400 dark:text-zinc-500"
                      />
                      <span className="font-medium">Linked Devices</span>
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate(SETTINGS_ROUTES.updateHistory);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition cursor-pointer text-left"
                    >
                      <History size={15} className="text-slate-400 dark:text-zinc-500" />
                      <span className="font-medium">Update History</span>
                    </button>
                  </li>

                  {isAdmin && (
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate(ADMIN_ROUTES.dashboard);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400 transition cursor-pointer text-left"
                      >
                        <Shield size={15} />
                        <span className="font-medium">Admin Console</span>
                      </button>
                    </li>
                  )}
                </ul>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-zinc-800/80 my-1" />

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/25 transition cursor-pointer text-left"
                >
                  <LogOut size={15} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
