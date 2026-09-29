import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import ChatList from "../components/chats/chatlist/ChatList";
import DesktopSidebar from "../components/layout/DesktopSidebar";

const STORAGE_KEY = "flashchat_desktop_chatlist_width";
const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 280;
const MAX_WIDTH = 520;
const SIDEBAR_THIN_STRIP_WIDTH = 64; // w-16 = 64px

export default function DesktopLayout() {
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      return parsed;
    }
    return DEFAULT_WIDTH;
  });

  // Handle resizing between Panel 2 (ChatList) and Panel 3 (Outlet)
  useEffect(() => {
    if (!isSidebarDragging) return;

    const handleMouseMove = (e) => {
      const newWidth = e.clientX - SIDEBAR_THIN_STRIP_WIDTH;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsSidebarDragging(false);
      document.body.style.userSelect = "auto";
      document.body.style.cursor = "default";
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "auto";
      document.body.style.cursor = "default";
    };
  }, [isSidebarDragging]);

  // Save width preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white dark:bg-zinc-950">
      {/* Panel 1: WhatsApp-style Thin Vertical Navigation Strip */}
      <DesktopSidebar />

      {/* Panel 2: ChatList (Middle Panel) */}
      <div
        style={{
          width: sidebarWidth,
          transition: isSidebarDragging ? "none" : "width 0.15s ease",
        }}
        className="h-full flex flex-col bg-white dark:bg-zinc-950 flex-shrink-0 overflow-hidden"
      >
        <ChatList />
      </div>

      {/* Column Resizer between Panel 2 and Panel 3 */}
      <div
        onMouseDown={() => setIsSidebarDragging(true)}
        className={`w-1 cursor-col-resize transition-colors duration-150 flex-shrink-0 group relative select-none z-10 ${
          isSidebarDragging
            ? "bg-indigo-500 shadow-sm"
            : "bg-slate-200/70 dark:bg-zinc-900 hover:bg-indigo-400 dark:hover:bg-indigo-500/80"
        }`}
        title="Drag to resize panel"
      >
        {/* Expanded grab hitbox */}
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Panel 3: Content / Details Area (Outlet) */}
      <main className="flex-1 h-full min-w-0 overflow-hidden bg-slate-50/40 dark:bg-zinc-950 relative">
        <Outlet />
      </main>
    </div>
  );
}
