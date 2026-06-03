import React, { useState, useEffect } from 'react'
import MobileNavigationBar from '../components/layout/MobileNavigationBar';
import NavigationBar from '../components/layout/NavigationBar';
import { Outlet } from 'react-router-dom';
export default function AppLayout() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className="h-screen w-full bg-white dark:bg-zinc-950">
            <Outlet />
            {isMobile ? (
                <MobileNavigationBar />
            ) : (
                <NavigationBar />
            )}


        </div>
    )
}
