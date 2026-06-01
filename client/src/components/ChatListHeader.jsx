import React from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";

export default function ChatListHeader() {
  return (
    <div className="ChatHeader flex bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md z-10 w-full border-b border-slate-200/50 dark:border-zinc-900 text-sm px-4 h-[64px] items-center justify-between">
      <Link to="/chats" className="logo text-lg font-bold dark:text-white flex gap-2 items-center tracking-tight">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-500 text-white shadow-sm shadow-indigo-500/20">
          <Flame size={18} fill="white" />
        </div>
        <span className="text-slate-900 dark:text-white">
          FlashChat
        </span>
      </Link>
    </div>
  );
}