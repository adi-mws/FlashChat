import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom';
import { CircleUser, MessageSquare, Users } from 'lucide-react';
import { ACCOUNT_ROUTES, CHAT_ROUTES } from '../../../routes/routes';

export default function MobileNavigationBar() {
    const [showMenu, setShowMenu] = useState(true);
    const location = useLocation();
    const isActive = (path) => {
        return location.pathname.startsWith(path);
    }

    return (
        <>
            <div className={`${showMenu ? 'block' : 'hidden'} bg-slate-50 fixed bottom-0 left-0 w-full dark:bg-zinc-950 border-t border-slate-200/60 dark:border-zinc-900/60 flex flex-row items-center h-16 px-4 justify-around sm:hidden`}>
                {/* Mobile Navigation Icons */}

                <Link className={`${isActive(CHAT_ROUTES.root) && location.pathname.endsWith(CHAT_ROUTES.root) ? 'dark:bg-indigo-800/10 dark:text-indigo-600' : 'dark:bg-transparent dark:text-slate-500'} block p-2 px-4 rounded-xl`} to={CHAT_ROUTES.root}>
                    <MessageSquare size={20} />
                </Link>
                <Link className={`${isActive(ACCOUNT_ROUTES.contacts) ? 'dark:bg-indigo-800/10 dark:text-indigo-600' : 'dark:bg-transparent dark:text-slate-500'} block p-2 px-4 rounded-xl`} to={ACCOUNT_ROUTES.contacts}>
                    <Users size={20} />
                </Link>
                <Link className={`${isActive(ACCOUNT_ROUTES.profile) ? 'dark:bg-indigo-800/10 dark:text-indigo-600' : 'dark:bg-transparent dark:text-slate-500'} block p-2 px-4 rounded-xl`} to={ACCOUNT_ROUTES.profile}>
                    <CircleUser size={20} />
                </Link>
            </div>

            {/* relative bar */}
            <div className="bg-slate-50 h-16 w-full"></div>
        </>
    )
}
