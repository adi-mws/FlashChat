import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus2 } from 'lucide-react';

export default function NoChatsFound({ children }) {
  const navigate = useNavigate();
  return (
    <div className="nochatsfound-wrapper flex-1 h-full flex items-center justify-center p-8 bg-slate-50/50 dark:bg-zinc-950/40 animate-fade-in">
      <div className="w-full max-w-sm p-6 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl shadow-xl flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-500 mb-4">
          <UserPlus2 size={24} />
        </div>
        
        <h4 className="text-base font-bold text-slate-800 dark:text-zinc-100">No Chats Active</h4>
        
        {children}
        
        <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          It looks like you don't have any conversations yet. Search for friends using their username to start chatting.
        </p>
        
        <button 
          className="mt-6 w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-medium text-sm rounded-xl shadow-md shadow-indigo-500/10 transition-all duration-200"
          onClick={() => navigate('/chats/contacts')}
        >
          Add Contacts
        </button>
      </div>
    </div>
  );
}
