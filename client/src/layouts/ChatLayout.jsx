import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ChatsList from "../components/ChatsList";

export default function ChatLayout() {
    const [isSidebarDragging, setIsSidebarDragging] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(350);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    const location = useLocation();
    const isChatOpen = location.pathname.includes("/chats/") && !location.pathname.includes("/chats/profile");

    // Responsive check
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Drag-to-resize for desktop
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

    // 📱 MOBILE: Show only the chat (or chat list) without sidebar or resizer
    if (isMobile) {
        return (
            <div className="h-screen w-full bg-white dark:bg-zinc-900">
                {isChatOpen ? (
                    <Outlet />
                ) : (
                    <ChatsList />
                )}
            </div>
        );
    }

    // 💻 DESKTOP: Full resizable layout
    return (
        <div className="chat-container h-screen w-full flex">
            {/* Sidebar */}
            <div
                style={{
                    width: sidebarWidth,
                    transition: isSidebarDragging ? "none" : "width 0.1s ease",
                }}
                className="sidebar bg-white dark:bg-zinc-800 h-full"
            >
                <ChatsList />
            </div>

            {/* Resizer */}
            <div
                className="w-1 cursor-col-resize hover:bg-zinc-400 dark:hover:bg-zinc-700 bg-zinc-200 dark:bg-zinc-800"
                onMouseDown={() => setIsSidebarDragging(true)}
            ></div>

            {/* Main Chat Area */}
            <div
                className="chat-content overflow-hidden flex h-screen justify-center items-center"
                style={{ width: `calc(100% - ${sidebarWidth}px)` }}
            >
                <Outlet />
            </div>
        </div>
    );
}
