import React from 'react';
import { Flame, MessageSquare } from 'lucide-react';

export default function SelectChat() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-950/40 p-8 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl rounded-full w-48 h-48 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />
        
        {/* Glowing Logo */}
        <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-indigo-500 shadow-xl shadow-indigo-500/20 text-white">
          <Flame size={44} fill="white" className="animate-pulse" />
        </div>
      </div>

      <h3 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-zinc-100">
        Welcome to <span className="text-indigo-500">FlashChat</span>
      </h3>
      
      <p className="mt-2 text-slate-500 dark:text-zinc-400 max-w-sm text-sm">
        Select a conversation from the sidebar or find a contact to start messaging instantly.
      </p>

      {/* Decorative details
      <div className="mt-12 flex items-center gap-6 text-xs text-slate-400 dark:text-zinc-600">
        
      </div> */}
    </div>
  );
}