import React, { useEffect, useState, useRef } from 'react';
import ChatListHeader from './ChatListHeader';
import { useChat } from '../../hooks/ChatsContext';
import { usePopUp } from '../../hooks/PopUpContext';
import { useAuth } from '../../hooks/AuthContext';
import { useTheme } from '../../hooks/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getImageUrl } from '../../lib/imageUtils';
import { LogOut, MonitorSmartphone, UserRoundPlus, Search, History, Check, CheckCheck, Navigation } from 'lucide-react';
import { decryptMessage } from '../../lib/crypto';
import NavigationBar from '../layout/NavigationBar';
import MobileNavigationBar from '../layout/MobileNavigationBar';
import { CHAT_ROUTES } from '../../../routes/routes';

export default function ChatList() {
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
        navigate(CHAT_ROUTES.chat(chat._id));
    };

    useEffect(() => {
        if (!socket || !user) return;

        const handleNewMessage = async (newMessage) => {
            const chatId = newMessage.chat;
            const isCurrentChat = selectedChat && (typeof selectedChat === 'string' ? selectedChat === chatId : selectedChat._id === chatId);
            const isMessageFromSelf = newMessage.sender._id === user?.id;

            let decryptedMsg = newMessage;
            if (newMessage.encryption?.isEncrypted) {
                try {
                    const decryptedContent = await decryptMessage(newMessage, user?.id, user?.username);
                    decryptedMsg = { ...newMessage, content: decryptedContent };
                } catch (err) {
                    console.error("Failed to decrypt message in ChatsList handleNewMessage:", err);
                }
            }

            setChats(prev => {
                const updated = prev.map(chat => {
                    if (chat._id === chatId) {
                        const newUnreadCount = (!isMessageFromSelf && !isCurrentChat)
                            ? (chat.unreadCount || 0) + 1
                            : (isCurrentChat ? 0 : chat.unreadCount || 0);
                        return {
                            ...chat,
                            lastMessage: decryptedMsg,
                            unreadCount: newUnreadCount
                        };
                    }
                    return chat;
                });

                const updatedChat = updated.find(chat => chat._id === chatId);
                if (!updatedChat) return prev; // If not in active chats
                const others = updated.filter(chat => chat._id !== chatId);

                return [updatedChat, ...others];
            });
        };

        const handleReceiverSeenMessage = ({ chatId, messageId, receiverId }) => {
            setChats(prev => prev.map(chat => {
                if (chat._id === chatId && chat.lastMessage && chat.lastMessage._id === messageId) {
                    const currentReadBy = chat.lastMessage.readBy || [];
                    if (!currentReadBy.includes(receiverId)) {
                        return {
                            ...chat,
                            lastMessage: {
                                ...chat.lastMessage,
                                readBy: [...currentReadBy, receiverId]
                            }
                        };
                    }
                }
                return chat;
            }));
        };

        socket.on('newMessage', handleNewMessage);
        socket.on('receiverSeenMessage', handleReceiverSeenMessage);
        return () => {
            socket.off('newMessage', handleNewMessage);
            socket.off('receiverSeenMessage', handleReceiverSeenMessage);
        };
    }, [socket, selectedChat, user?.id, user?.username]);

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
                    const time = chat.lastMessage ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    }) : null;

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
                                    <p className="text-xs text-slate-400 dark:text-zinc-400 flex items-center gap-1 pr-4 min-w-0">
                                        {chat?.lastMessage?.sender?._id === user?.id && (
                                            <span className="inline-flex items-center gap-1 flex-shrink-0">
                                                {chat.lastMessage.readBy && (
                                                    chat.lastMessage.readBy.includes(chat.participant?._id) ||
                                                    chat.lastMessage.readBy.some(id => id.toString() === chat.participant?._id?.toString())
                                                ) ? (
                                                    <CheckCheck size={14} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                                                ) : (
                                                    <Check size={14} className="text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                                                )}
                                                <span className="text-slate-500 dark:text-zinc-300 font-medium flex-shrink-0">You:</span>
                                            </span>
                                        )}
                                        <span className="truncate min-w-0">{chat?.lastMessage?.content}</span>
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
            {/* Footer Navigation  */}

           
        </div>
    );
}
