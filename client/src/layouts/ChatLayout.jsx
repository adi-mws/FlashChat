import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { CHAT_ROUTES } from "../../routes/routes";
import Conversation from "../components/chats/Conversation"
import ChatList from "../components/chats/ChatList";
export default function ChatLayout() {
    const [sidebarWidth, setSidebarWidth] = useState(350);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    const location = useLocation();
    const isChatOpen = location.pathname !== CHAT_ROUTES.root;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

  

    // Show only the chat  without sidebar or resizer
    if (isMobile) {
        return (
            <div className="h-screen w-full bg-white dark:bg-zinc-900">
                <Conversation />
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
            ></div>

            {/* Main Chat Area */}
            <div
                className="chat-content overflow-hidden flex justify-center items-center"
                style={{width: sidebarWidth ? `calc(100% - ${sidebarWidth}px)` : "100%"}}
            >
                <Conversation />

            </div>
        </div>
    );
}
