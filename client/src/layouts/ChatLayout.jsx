import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import ChatsList from "../components/ChatsList";

export default function ChatLayout() {
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
        <div className="chat-container h-screen w-full flex">
            {/* Sidebar */}
            <div
                style={{ width: sidebarWidth, transition: isSidebarDragging ? 'none' : 'width 0.1s ease' }}
                className="sidebar bg-white dark:bg-zinc-800 h-full"
            >
                <ChatsList />
            </div>

            {/* Resizer */}
            <div
                className="w-1 cursor-col-resize hover:bg-zinc-400 dark:hover:bg-zinc-700 bg-zinc-200 dark:bg-zinc-800"
                onMouseDown={() => setIsSidebarDragging(true)}
            ></div>

            {/* Outlet */}
            <div
                className="chat-content overflow-hidden flex h-screen justify-center items-center"
                style={{ width: `calc(100% - ${sidebarWidth}px)` }}
            >
                <Outlet />
            </div>
        </div>
    );
}
