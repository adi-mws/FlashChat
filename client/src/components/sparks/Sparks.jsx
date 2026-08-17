import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import AppHeader from '../layout/AppHeader';
import { SETTINGS_ROUTES } from '../../../routes/routes';

export default function Sparks() {
    const navigate = useNavigate();

    return (
        <div className="w-full h-full flex flex-col bg-slate-50/50 dark:bg-zinc-950/40 overflow-y-auto animate-fade-in">
            <AppHeader title={"Sparks"} />
            
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-8 shadow-xl dark:shadow-zinc-950/40 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
                    {/* Sparks Icon */}
                    <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/70 shadow-sm animate-pulse">
                        <Sparkles size={30} />
                    </div>

                    <div className="space-y-3 z-10">
                        <h3 className="text-xl font-black text-slate-800 dark:text-zinc-100 tracking-tight">
                            Sparks
                        </h3>
                        <p className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">
                            Get instant highlights into Sparks
                        </p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                            Sparks will be available in FlashChat 4.0. Stay tuned!
                        </p>
                    </div>

                    <div className="w-full pt-2 z-10">
                        <button
                            onClick={() => navigate(SETTINGS_ROUTES.updateHistory)}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/10 transition-all duration-200 cursor-pointer"
                        >
                            View Version Updates <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
