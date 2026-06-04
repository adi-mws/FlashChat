import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom';
import { CircleUser, MessageSquare, Sparkle, Sparkles, Users } from 'lucide-react';
import { ACCOUNT_ROUTES, CHAT_ROUTES, SETTINGS_ROUTES, SPARK_ROUTES } from '../../../routes/routes';

export default function MobileNavigationBar() {
    const [showMenu, setShowMenu] = useState(true);
    const location = useLocation();
    const isActive = (path) => {
        return location.pathname.startsWith(path);
    }

    return (
        <>
            <div className={
                `${showMenu ? 'block' : 'hidden'} bg-slate-50 
                fixed bottom-0 left-0 w-full dark:bg-zinc-950 border-t
                border-slate-200/60 dark:border-zinc-900/60 flex 
                flex-row items-center h-18 px-4 justify-around sm:hidden`
            }>
                {/* Mobile Navigation Icons */}
                <Link to={CHAT_ROUTES.root} className='flex flex-col justify-center gap-1 items-center'>
                    <div className={`${isActive(CHAT_ROUTES.root) && location.pathname.endsWith(CHAT_ROUTES.root) ? 'dark:bg-indigo-800/10 dark:text-indigo-600' : 'dark:bg-transparent dark:text-slate-500'} p-2 px-4 rounded-xl `}>
                        <MessageSquare size={18} />
                    </div>
                    <p className="text-white text-xs">Chats</p>
                </Link>

                 <Link to={SPARK_ROUTES.root} className='flex flex-col justify-center gap-1 items-center'>
                    <div className={`${isActive(SPARK_ROUTES.root) && location.pathname.endsWith(SPARK_ROUTES.root) ? 'dark:bg-indigo-800/10 dark:text-indigo-600' : 'dark:bg-transparent dark:text-slate-500'} p-2 px-4 rounded-xl `}>
                        <Sparkles size={18} />
                    </div>
                    <p className="text-white text-xs">Sparks</p>
                </Link>
                <Link to={ACCOUNT_ROUTES.contacts} className="flex flex-col justify-center gap-1 items-center">
                    <div className={`${isActive(ACCOUNT_ROUTES.contacts) ? 'dark:bg-indigo-800/10 dark:text-indigo-600' : 'dark:bg-transparent dark:text-slate-500'} block p-2 px-4 rounded-xl`}>
                        <Users size={18} />
                    </div>
                    <p className="text-white text-xs">Contacts</p>
                </Link>
                <Link  to={ACCOUNT_ROUTES.profile} className='flex flex-col justify-center gap-1 items-center'>
                    <div className={`${isActive(ACCOUNT_ROUTES.profile) ? 'dark:bg-indigo-800/10 dark:text-indigo-600' : 'dark:bg-transparent dark:text-slate-500'} block p-2 px-4 rounded-xl`}>
                        <CircleUser size={18} />
                    </div>
                    <p className="text-white text-xs">Profile</p>
                </Link>
            </div>

            {/* relative bar */}
            <div className="bg-slate-50 h-16 w-full"></div>
        </>
    )
}
