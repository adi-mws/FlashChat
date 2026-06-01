import React, { useEffect, useState, useRef } from 'react';
import ChatListHeader from './ChatListHeader';
import { useChat } from '../hooks/ChatsContext';
import { usePopUp } from '../hooks/PopUpContext';
import { useAuth } from '../hooks/AuthContext';
import { useTheme } from '../hooks/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getImageUrl } from '../utils/imageUtils';
import { LogOut, UserRoundPlus, Search } from 'lucide-react';

export default function ChatsList() {
    const {
        chats,
        setChats,
        loading,
        setSelectedChat,
        emitSeenMessages,
        selectedChat,
        onlineUsers,
        socket
    } = useChat();

    const { setShowSearchUsers } = usePopUp();
    const { user, logout } = useAuth();

    const [sliderMenu, setSliderMenu] = useState(false);
    const dropdownRef = useRef(null);
    const sideBarRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const [filteredChats, setFilteredChats] = useState([]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

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

    const handleReadCount = async (chatId, userId) => {
        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/chats/message-read`,
                { chatId: chatId, userId: userId },
                { withCredentials: true }
            );
            if (response.status === 200) {
                setChats(prev =>
                    prev.map(chat => (chat._id === chatId ? { ...chat, unreadCount: 0 } : chat))
                );
            } else {
                console.warn(response.data.message);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleChatClick = (chat) => {
        setSelectedChat(chat);
        handleReadCount(chat._id, user.id);
        emitSeenMessages(chat._id);
        navigate(`/chats/${chat._id}`);
    };

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (newMessage) => {
            const chatId = newMessage.chat;
            const isCurrentChat = selectedChat && (typeof selectedChat === 'string' ? selectedChat === chatId : selectedChat._id === chatId);
            const isMessageFromSelf = newMessage.sender._id === user.id;

            // Making this chat to appear on top if a message is sent or received
            setChats(prev => {
                const updated = prev.map(chat =>
                    chat._id === chatId
                        ? { ...chat, lastMessage: newMessage }
                        : chat
                );

                const updatedChat = updated.find(chat => chat._id === chatId);
                if (!updatedChat) return prev; // If not in active chats
                const others = updated.filter(chat => chat._id !== chatId);

                return [updatedChat, ...others];
            });

            // Managing the readCounts when a new message is received
            setChats(prevChats => {
                return prevChats.map(chat => {
                    if (chat._id === chatId) {
                        if (!isMessageFromSelf && !isCurrentChat) {
                            return {
                                ...chat,
                                latestMessage: newMessage,
                                unreadCount: (chat.unreadCount || 0) + 1
                            };
                        } else {
                            return {
                                ...chat,
                                latestMessage: newMessage
                            };
                        }
                    }
                    return chat;
                });
            });
        };

        socket.on('newMessage', handleNewMessage);
        return () => {
            socket.off('newMessage', handleNewMessage);
        };
    }, [socket, selectedChat, user.id]);

    useEffect(() => {
        const search = searchTerm.trim().toLowerCase();

        const filtered = chats.filter(chat => {
            const name = chat?.participant?.name?.toLowerCase() || "";
            const username = chat?.participant?.username?.toLowerCase() || "";

            return name.includes(search) || username.includes(search);
        });

        setFilteredChats(filtered);
    }, [chats, searchTerm]);

    return (
        <div
            ref={sideBarRef}
            className="chats-list bg-white dark:bg-zinc-950 h-[100dvh] border-r border-slate-200/60 dark:border-zinc-900/80 flex flex-col"
        >
            {/* Header */}
            <ChatListHeader />

            {/* Search bar */}
            <div className="px-1 py-2.5 relative">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                    <Search size={16} />
                </div>
                <input
                    type="text"
                    placeholder="Search chats..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 hover:bg-slate-200/50 focus:bg-white dark:bg-zinc-900 dark:hover:bg-zinc-900/80 dark:focus:bg-zinc-900 dark:text-zinc-200 rounded-xl outline-none border border-transparent focus:border-indigo-500/30 dark:focus:border-indigo-500/20 transition-all duration-200 placeholder-slate-400 dark:placeholder-zinc-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Chat list (scrollable section) */}
            <div className="flex-1 overflow-y-auto min-h-0 py-1 space-y-1">
                {loading && (
                    <div className="flex flex-col gap-2 p-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-1/3" />
                                    <div className="h-2.5 bg-slate-200 dark:bg-zinc-800 rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && Array.isArray(filteredChats) && filteredChats.map((chat) => {
                    const isSelected = selectedChat && (typeof selectedChat === 'string' ? selectedChat === chat._id : selectedChat._id === chat._id);
                    if (chat.lastMessage && chat.lastMessage.createdAt) {
                        const time = new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                    }

                    return (
                        <div
                            key={chat._id}
                            onClick={() => handleChatClick(chat)}
                            className={`chat-list-item flex items-center gap-3.5 px-1 py-2 cursor-pointer transition-all duration-200 ${isSelected
                                ? "bg-indigo-50/70 dark:bg-indigo-950/20 shadow-sm"
                                : "hover:bg-slate-100/50 dark:hover:bg-zinc-900/40"
                                }`}
                        >
                            <div className="relative flex-shrink-0">
                                <img
                                    src={getImageUrl(chat.participant?.pfp)}
                                    className="h-11 w-11 rounded-full object-cover border border-slate-100 dark:border-zinc-800"
                                    alt={chat.participant?.name || "User"}
                                />
                                {onlineUsers.includes(chat.participant?._id) && (
                                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950 absolute bottom-0 right-0" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between mb-0.5">
                                    <h4 className={`text-xs truncate ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-800 dark:text-zinc-200"}`}>
                                        {chat.participant?.name}
                                    </h4>
                                    <span className="text-2xs text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                                        {chat?.lastMessage && chat?.lastMessage?.createdAt && time}

                                    </span>
                                </div>

                                {chat?.lastMessage && user?.showLastMessageInList ? (
                                    <p className="text-xs text-slate-400 dark:text-zinc-400 truncate pr-4">
                                        {chat?.lastMessage?.sender?._id === user.id && (
                                            <span className="text-slate-500 dark:text-zinc-300 font-medium">You: </span>
                                        )}
                                        {chat?.lastMessage?.content}
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium truncate">
                                        @{chat.participant?.username}
                                    </p>
                                )}
                            </div>

                            {chat.unreadCount > 0 && (
                                <span className="flex-shrink-0 bg-indigo-600 text-white font-bold rounded-full min-w-5 h-5 px-1.5 flex justify-center items-center text-[10px] shadow-sm shadow-indigo-500/20">
                                    {chat.unreadCount}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer (Profile section) */}
            <div className="bg-slate-50 dark:bg-zinc-950 border-t border-slate-200/60 dark:border-zinc-900/60 flex flex-row items-center h-20 px-4 justify-between">
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
                                <li onClick={() => { setSliderMenu(false); navigate('/chats/profile'); }} className="flex items-center px-4 gap-3 py-2.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition">
                                    <i className="fa-solid fa-user text-slate-400 dark:text-zinc-500"></i> <span>Profile Settings</span>
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

                <div className="flex gap-2">
                    <button
                        className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                        onClick={() => navigate('/chats/contacts')}
                        title="Add Contacts"
                    >
                        <UserRoundPlus size={17} />
                    </button>
                </div>
            </div>
        </div>
    );
}
