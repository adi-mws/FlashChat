import React, { useState, useEffect, useRef } from 'react'
import { getImageUrl } from '../../lib/imageUtils';
import { useAuth } from '../../hooks/AuthContext';
import { MonitorSmartphone, History, LogOut, MessageSquare, Sparkles, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MARKETING_ROUTES, SETTINGS_ROUTES } from '../../../routes/routes';

export default function NavigationBar() {
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [sliderMenu, setSliderMenu] = useState(false);
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout(); 
        navigate(MARKETING_ROUTES.login);
    }

    const isActive = (path) => {
        return location.pathname.startsWith(path);
    }

    const isChatsActive = location.pathname.startsWith('/app/chats') || location.pathname.startsWith('/chat/');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setSliderMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="bg-slate-50 dark:bg-zinc-950 border-t border-slate-200/60 dark:border-zinc-900/60 flex flex-row items-center h-20 px-4 justify-between w-full">
            {user && (
                <div className="relative flex flex-row gap-3 items-center" ref={dropdownRef}>
                    <div
                        className="profile flex items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800 p-0.5 cursor-pointer hover:scale-105 transition-all duration-300 ring-2 ring-slate-200/20 dark:ring-zinc-700/30"
                        onClick={() => setSliderMenu(!sliderMenu)}
                    >
                        <img src={getImageUrl(user?.pfp)} className="w-10 h-10 object-cover rounded-full" alt="Profile" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-zinc-200 text-sm truncate max-w-28">{user.name || user.username}</p>
                        <p className="text-emerald-500 flex gap-1 text-[11px] items-center font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Online
                        </p>
                    </div>
                    {/* Slider Menu */}
                    <div
                        className={`fixed left-4 ${sliderMenu ? 'bottom-22 opacity-100 scale-100' : 'bottom-[-100px] opacity-0 scale-95 pointer-events-none'} transition-all duration-300 w-48 bg-white dark:bg-zinc-900 shadow-xl border border-slate-100 dark:border-zinc-800/80 rounded-xl z-50`}
                    >
                        <ul className="py-1">
                            <li onClick={() => { setSliderMenu(false); navigate(SETTINGS_ROUTES.profile); }} className="flex items-center px-4 gap-3 py-2.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition">
                                <i className="fa-solid fa-user text-slate-400 dark:text-zinc-500"></i> <span>Profile Settings</span>
                            </li>
                            <li onClick={() => { setSliderMenu(false); navigate(SETTINGS_ROUTES.linkedDevices); }} className="flex items-center px-4 gap-3 py-2.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition">
                                <MonitorSmartphone size={15} className="text-slate-400 dark:text-zinc-500" /> <span>Linked Devices</span>
                            </li>
                            <li onClick={() => { setSliderMenu(false); navigate(SETTINGS_ROUTES.updateHistory); }} className="flex items-center px-4 gap-3 py-2.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition">
                                <History size={15} className="text-slate-400 dark:text-zinc-500" /> <span>Update History</span>
                            </li>
                            <li
                                className="flex items-center gap-3 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition border-t border-slate-100 dark:border-zinc-800/80"
                                onClick={handleLogout}
                            >
                                <LogOut size={15} /> Logout
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            <div className="flex gap-2 items-center">
                {/* Chats Link */}
                <button
                    className={`p-2 rounded-xl transition cursor-pointer ${
                        isChatsActive
                            ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 animate-pulse-once'
                            : 'hover:bg-slate-200/50 dark:hover:bg-zinc-900/60 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    onClick={() => navigate('/app/chats')}
                    title="Chats"
                >
                    <MessageSquare size={17} />
                </button>

                {/* Sparks Link */}
                <button
                    className={`p-2 rounded-xl transition cursor-pointer ${
                        isActive('/app/sparks')
                            ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                            : 'hover:bg-slate-200/50 dark:hover:bg-zinc-900/60 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    onClick={() => navigate('/app/sparks')}
                    title="Sparks"
                >
                    <Sparkles size={17} />
                </button>

                {/* Contacts Link */}
                <button
                    className={`p-2 rounded-xl transition cursor-pointer ${
                        isActive('/app/contacts')
                            ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                            : 'hover:bg-slate-200/50 dark:hover:bg-zinc-900/60 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                    onClick={() => navigate('/app/contacts')}
                    title="Contacts"
                >
                    <Users size={17} />
                </button>
            </div>
        </div>
    )
}
