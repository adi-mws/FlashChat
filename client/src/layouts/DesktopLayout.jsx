import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import ChatList from "../components/chats/ChatList";
import NavigationBar from "../components/layout/NavigationBar";

export default function DesktopLayout() {
    const [isSidebarDragging, setIsSidebarDragging] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(350);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isSidebarDragging) return;
            const newWidth = e.clientX;
            if (newWidth > 250 && newWidth < 700) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsSidebarDragging(false);
            document.body.style.userSelect = "auto";
        };

        if (isSidebarDragging) {
            document.body.style.userSelect = "none";
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            document.body.style.userSelect = "auto";
        };
    }, [isSidebarDragging]);

    return (
        <div className="h-screen w-full flex overflow-hidden bg-white dark:bg-zinc-950">
            {/* Column 1: Sidebar with ChatList and NavigationBar */}
            <div
                style={{
                    width: sidebarWidth,
                    transition: isSidebarDragging ? "none" : "width 0.1s ease",
                }}
                className="flex flex-col h-full bg-white dark:bg-zinc-950 flex-shrink-0"
            >
                <div className="flex-1 overflow-hidden">
                    <ChatList />
                </div>
                <NavigationBar />
            </div>

            {/* Resizer */}
            <div
                className="w-1 cursor-col-resize hover:bg-indigo-500/35 dark:hover:bg-indigo-500/20 bg-slate-200/60 dark:bg-zinc-900/60 transition-colors duration-150 flex-shrink-0"
                onMouseDown={() => setIsSidebarDragging(true)}
            ></div>

            {/* Column 2: Content Area */}
            <div
                className="flex-1 h-full overflow-hidden"
            >
                <Outlet />
            </div>
        </div>
    );
}
