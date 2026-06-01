import React from 'react';
import { Flame, MessageSquare } from 'lucide-react';

export default function SelectChat() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-950/40 p-8 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl rounded-full w-48 h-48 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />
        
        {/* Modern glowing icon container */}
        <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-indigo-500 shadow-xl shadow-indigo-500/20 text-white animate-bounce-slow">
          <Flame size={44} className="animate-pulse" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-2xl bg-emerald-500 border-4 border-white dark:border-zinc-950 flex items-center justify-center text-white">
            <MessageSquare size={12} fill="white" />
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-zinc-100">
        Welcome to <span className="text-indigo-500">FlashChat</span>
      </h3>
      
      <p className="mt-2 text-slate-500 dark:text-zinc-400 max-w-sm text-sm">
        Select a conversation from the sidebar or find a contact to start messaging instantly.
      </p>

      {/* Decorative details */}
      <div className="mt-12 flex items-center gap-6 text-xs text-slate-400 dark:text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" /> End-to-end encrypted
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-800" />
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Real-time active
        </span>
      </div>
    </div>
  );
}