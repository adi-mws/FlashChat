import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react';

export default function AppHeader({ title, children }) {
    const navigate = useNavigate();
    return (
        <div className="h-[75px] flex items-center px-4 py-2 sm:px-8 border-b border-slate-200/50 dark:border-zinc-900 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md sticky top-0 z-10 justify-between">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
                    title="Go Back"
                >
                    <ArrowLeft size={20} />
                </button>
                <p className="dark:text-white font-semibold text-md">{title}</p>
            </div>

            {children}

        </div>


    )
}
