// src/pages/ChatPage.jsx

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChat } from "../hooks/ChatsContext";
import { useAuth } from "../hooks/AuthContext";
import { useNotification } from "../hooks/NotificationContext";
import { useNetwork } from "../hooks/NetworkContext";
import { ArrowLeft, Trash, Send, EllipsisVertical } from "lucide-react";
import SelectChat from "../components/SelectChat";
import NoChatsFound from "../components/NoChatsFound";
import axios from "axios";
import { getImageUrl } from "../utils/imageUtils";
import MessageList from "./messages/MessageList";

export default function ChatPage() {
    const { isOnline } = useNetwork();
    const { showNotification } = useNotification();
    const { chatId } = useParams();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    
    const {
        chats,
        setSelectedChat,
        setChats,
        selectedChat,
        sendMessage,
        onlineUsers,
        emitSeenMessages,
        joinChat,
        socket,
    } = useChat();
    const { user } = useAuth();

    const [message, setMessage] = useState("");
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [localMessages, setLocalMessages] = useState([]);
    const [sendingMessages, setSendingMessages] = useState([]);
    const navigate = useNavigate();
    const [showChatOptions, setShowChatOptions] = useState(false);

    const [showMessageOptions, setShowMessageOptions] = useState({ clientX: 0, clientY: 0, show: false, messageId: null });

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView();
        }, 100);
    };


    const textareaRef = useRef(null);

    const handleChange = (e) => {
        setMessage(e.target.value);

        const textarea = textareaRef.current;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    };

    useEffect(() => {
        if (!chatId || chats.length === 0) return;

        const chat = chats.find((c) => c._id === chatId);
        if (chat) {
            setSelectedChat(chatId);
            joinChat(chatId);
        }
    }, [chatId, chats, setSelectedChat, joinChat]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!chatId) return;
            setLoadingMessages(true);

            try {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/chats/get-messages/${chatId}`, {
                    withCredentials: true,
                });
                setLocalMessages(data.messages || []);
                emitSeenMessages(chatId, data.messages);
            } catch (err) {
                showNotification("Failed to load messages", "error");
                console.error(err);
            } finally {
                setLoadingMessages(false);
            }
        };

        fetchMessages();
    }, [chatId]);

    useEffect(() => {
        const handleIncomingMessage = (newMessage) => {
            if (newMessage.chat === chatId) {
                setLocalMessages((prev) => [...prev, newMessage]);
                emitSeenMessages(chatId, [newMessage]);
                setSendingMessages((prev) => prev.filter((m) => m.content !== newMessage.content));
            }
        };

        socket?.on("newMessage", handleIncomingMessage);
        return () => socket?.off("newMessage", handleIncomingMessage);
    }, [socket, chatId]);

    useEffect(() => {
        scrollToBottom();
    }, [localMessages, sendingMessages]);

    const onSubmit = () => {
        if (!isOnline) {
            showNotification("You are offline. Message not sent.", "error");
            return;
        }

        if (message.trim().length > 0 && selectedChat) {
            const receiverId = getReceiverId();
            const tempMessage = {
                chat: chatId,
                content: message.trim(),
                sender: { _id: user.id },
                createdAt: new Date().toISOString(),
                isSending: false,
            };

            setSendingMessages((prev) => [...prev, tempMessage]);
            sendMessage(chatId, message.trim(), receiverId);
            setMessage("");
        }
    };

    const getReceiverId = () => {
        const chat = chats.find((c) => c._id === chatId);
        return chat?.participant?._id;
    };

    const handleDelete = async (id) => {
        const confirmed = confirm("Do you want to delete this message?");
        if (!confirmed) return;

        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/chats/delete-message/${id}`, {
                withCredentials: true,
            });

            // Locally remove message
            setLocalMessages((prev) => prev.filter((msg) => msg._id !== id));
            // Update lastMessage in chat list if needed
            setChats((prev) =>
                prev.map((c) => {
                    if (c._id !== chatId) return c;

                    if (c.lastMessage && c.lastMessage._id === id) {
                        const updatedMessages = localMessages.filter((msg) => msg._id !== id);
                        const newLast = updatedMessages[updatedMessages.length - 1];

                        return {
                            ...c,
                            lastMessage: newLast || null,
                        };
                    }

                    return c;
                })
            );
        } catch (error) {
            showNotification("Failed to delete message", "error");
        }
    };

    useEffect(() => {
        const handleMessageDeleted = ({ messageId, chatId }) => {
            setLocalMessages(prev => prev.filter(msg => msg._id !== messageId));
        };

        socket?.on("message-deleted", handleMessageDeleted);
        return () => {
            socket?.off("message-deleted", handleMessageDeleted);
        };
    }, [socket]);

    const chat = chats.find((c) => c._id === chatId);
    if (!chat) return <NoChatsFound />;
    if (!selectedChat) return <SelectChat />;

    const allMessages = [...localMessages, ...sendingMessages];

    const MessageOptions = () => {
        const { messageId } = showMessageOptions;
        if (!showMessageOptions.show) return null;
        return (
            <div
                className="fixed w-36 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-xl rounded-xl z-50 py-1.5 animate-scale-in"
                style={{ top: showMessageOptions.clientY, left: showMessageOptions.clientX }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => {
                        handleDelete(messageId);
                        setShowMessageOptions({ show: false });
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 transition"
                >
                    <Trash size={14} /> Delete
                </button>
            </div>
        );
    };

    const handleShowMessageOptions = (e, type, id) => {
        const left = type === 'sender' ? e.clientX - 160 : e.clientX;
        const top = e.clientY;
        setShowMessageOptions({ clientX: left, clientY: top, show: true, messageId: id });
    };

    const handleDeleteAllMessages = async () => {
        if (confirm('Do you want to delete all the chats? This action will permanently delete all the messages of this chat.')) {
            try {
                const chat_id = selectedChat;
                const response = await axios.delete(`${import.meta.env.VITE_API_URL}/chats/messages/delete-all`, {
                    data: { chatId: chat_id },
                    withCredentials: true
                });
                if (response.status === 200) {
                    setLocalMessages([]);
                    showNotification('success', 'All messages deleted successfully');
                    setChats((prev) =>
                        prev.map((item) =>
                            item._id === chat_id
                                ? { ...item, lastMessage: {} }
                                : item
                        )
                    );
                }
            } catch (error) {
                console.error("Error deleting messages:", error?.response?.data?.message || error.message);
            }
        }
    };

    const handleDeleteContact = async () => {
        if (confirm('Do you want to delete this contact? This action will remove the user from your friend list and delete all the messages as well!')) {
            try {
                const cId = selectedChat;
                const response = await axios.delete(`${import.meta.env.VITE_API_URL}/chats/contacts`, {
                    data: { chatId: cId },
                    withCredentials: true
                });
                if (response.status === 200) {
                    setChats((prev) => prev.filter(c => c._id !== cId));
                    setSelectedChat('');
                    setLocalMessages([]);
                    showNotification("info", "Contact deleted successfully");
                    navigate('/chats');
                }
            } catch (error) {
                console.error("Error deleting contact:", error.response?.data || error.message);
            }
        }
    };

    const ChatOptions = () => {
        if (!showChatOptions) return null;
        return (
            <div
                className="absolute right-4 top-[68px] w-48 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-xl rounded-xl z-50 py-1.5 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => {
                        handleDeleteAllMessages();
                        setShowChatOptions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition"
                >
                    <Trash size={14} /> Clear Chat
                </button>
                <button
                    onClick={() => {
                        handleDeleteContact();
                        setShowChatOptions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2.5 transition border-t border-slate-100 dark:border-zinc-800/80"
                >
                    <Trash size={14} /> Delete Contact
                </button>
            </div>
        );
    };

    return (
        <div
            className="chat-box flex flex-col h-screen overflow-hidden w-full relative"
            onClick={() => { setShowMessageOptions({ show: false }); setShowChatOptions(false); }}
        >
            {/* Header */}
            <div className="h-[64px] flex items-center px-4 sm:px-8 bg-white/95 dark:bg-zinc-950/95 border-b border-slate-200/50 dark:border-zinc-900/80 backdrop-blur-md z-10 flex-shrink-0 justify-between">
                <div className="flex gap-4 items-center min-w-0">
                    <div className="flex gap-2 items-center flex-shrink-0">
                        <ArrowLeft
                            className="w-5 h-5 text-slate-600 dark:text-zinc-400 sm:hidden cursor-pointer"
                            onClick={() => { navigate(-1); }}
                        />
                        <div className="relative cursor-pointer" onClick={() => navigate(`/chats/profile/${getReceiverId()}`)}>
                            <img
                                src={getImageUrl(chat.participant?.pfp)}
                                alt={chat.participant?.name || "User"}
                                className="w-10 h-10 object-cover rounded-full border border-slate-100 dark:border-zinc-800"
                            />
                            {chat.participant?._id && onlineUsers.includes(chat.participant._id) && (
                                <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950 absolute bottom-0 right-0 animate-pulse" />
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col min-w-0 gap-0.5">
                        <p className="text-slate-800 dark:text-zinc-100 text-xs truncate">{chat.participant?.name || "Deleted User"}</p>
                        <p className="text-2xs text-slate-400 dark:text-zinc-500 truncate">
                            {chat.participant?._id && onlineUsers.includes(chat.participant._id) ? (
                                <span className="text-emerald-500 font-medium">Active now</span>
                            ) : (
                                <span>Offline</span>
                            )}
                        </p>
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); setShowChatOptions(true); }}
                    className="p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900"
                >
                    <EllipsisVertical size={20} />
                </button>
            </div>

            {/* Messages Area */}
            <MessageList loading={loadingMessages} messages={allMessages} messagesEndRef={messagesEndRef} handleShowMessageOptions={handleShowMessageOptions} />
            {/* Input Area */}
            <div className="bg-white dark:bg-zinc-950 border-t border-slate-200/50 dark:border-zinc-900 flex-shrink-0">
                <form
                    onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
                    className="flex items-center gap-2.5 max-w-5xl mx-auto bg-slate-100 dark:bg-zinc-900/60 p-1.5 pl-4 border border-transparent focus-within:border-indigo-500/30 dark:focus-within:border-indigo-500/20 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all duration-200"
                >
                    <textarea
                        ref={textareaRef}
                        className="flex-1 bg-transparent text-xs outline-none resize-none text-slate-800 dark:text-zinc-100 py-2.5 min-h-[46px] max-h-40 overflow-y-auto placeholder-slate-400 dark:placeholder-zinc-500"
                        rows={1}
                        placeholder="Type a message..."
                        value={message}
                        onChange={handleChange}
                        onKeyDown={(e) => {
                            if (!isMobile && e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                onSubmit();
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!message.trim()}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500 text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-700 hover:bg-indigo-600 transition flex-shrink-0 cursor-pointer"
                    >
                        <Send size={15} fill={message.trim() ? "white" : "none"} />
                    </button>
                </form>
            </div>

            {/* Context menus */}
            <MessageOptions />
            <ChatOptions />
        </div>
    );
}