import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { CHAT_ROUTES } from "../../../routes/routes";
import ChatList from "../chats/ChatList";
import SelectChat from "../chats/SelectChat";

export default function ChatsOverview() {
    
    const [isSidebarDragging, setIsSidebarDragging] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(350);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    const location = useLocation();
    const isChatOpen = location.pathname !== CHAT_ROUTES.root;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

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

    // Show only the chat  without sidebar or resizer
    if (isMobile) {
        return (
            <div className="h-screen w-full bg-white dark:bg-zinc-900">
                    <ChatList />
            </div>
        );
    }

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
                <ChatList />
            </div>

            {/* Resizer */}
            <div
                className="w-1 cursor-col-resize hover:bg-zinc-400 dark:hover:bg-zinc-700 bg-zinc-200 dark:bg-zinc-800"
                onMouseDown={() => setIsSidebarDragging(true)}
            ></div>

            {/* Main Chat Area */}
            <div
                className="chat-content overflow-hidden flex justify-center items-center"
                style={{ width: `calc(100% - ${sidebarWidth}px)` }}
            >
              <SelectChat />
              
            </div>
        </div>
    );
}
