// src/pages/ChatPage.jsx

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useChat } from "../hooks/ChatsContext";
import { useAuth } from "../hooks/AuthContext";
import { useNotification } from "../hooks/NotificationContext";
import { useNetwork } from "../hooks/NetworkContext";
import SelectChat from "../components/SelectChat";
import NoChatsFound from "../components/NoChatsFound";
import axios from "axios";

export default function ChatPage() {
    const { isOnline } = useNetwork();
    const { showNotification } = useNotification();
    const { chatId } = useParams();
    const {
        chats,
        setSelectedChat,
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

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

                // Remove from temporary list if it was a sent message
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
                content: message,
                sender: { _id: user.id },
                createdAt: new Date().toISOString(),
                isSending: true,
            };

            setSendingMessages((prev) => [...prev, tempMessage]);
            sendMessage(chatId, message, receiverId);
            setMessage("");
        }
    };

    const getReceiverId = () => {
        const chat = chats.find((c) => c._id === chatId);
        return chat?.participant?._id;
    };

    const chat = chats.find((c) => c._id === chatId);
    if (!chat) return <NoChatsFound />;
    if (!selectedChat) return <SelectChat />;

    const allMessages = [...localMessages, ...sendingMessages];

    return (
        <div className="chat-box grid grid-rows-[70px_calc(100%-130px)_60px] items-center h-screen w-full">
            {/* Header */}
            <div className="chat-header bg-gray-100 p-2 w-full h-20 flex dark:bg-zinc-900 gap-5 items-center px-10">
                <img
                    src={`${import.meta.env.VITE_BACKEND_URL}/${chat.participant.pfp}`}
                    alt="Profile"
                    className="w-10 h-10 rounded-full"
                />
                <div className="flex flex-col gap-1">
                    <p className="text-sm dark:text-gray-400">{chat.participant.username}</p>
                    {onlineUsers.includes(chat.participant._id) && (
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 block"></span>Online
                        </p>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="message-container h-full w-full flex flex-col dark:bg-zinc-950">
                <div className="flex-grow" />
                <div className="flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                    {loadingMessages ? (
                        <div className="p-4 space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-fit max-w-[60%] rounded-xl px-4 py-3 ${i % 2 === 0 ? "ml-auto bg-primary-200 dark:bg-primary-900" : "bg-zinc-300 dark:bg-neutral-700"
                                        } animate-pulse`}
                                >
                                    <div className="h-4 w-28 mb-2 bg-slate-400 dark:bg-neutral-600 rounded" />
                                    <div className="h-3 w-40 bg-slate-300 dark:bg-neutral-500 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        allMessages.map((msg, i) => (
                            <div key={i} className="message group p-1 flex">
                                <span
                                    className={`p-3 rounded-xl text-sm block max-w-[60%] w-auto ${msg.sender._id === user.id
                                            ? "ml-auto bg-primary-2 text-white dark:bg-primary-2"
                                            : "bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white"
                                        } ${msg.isSending ? "opacity-60" : ""}`}
                                >
                                    {msg.content}
                                    <span className="text-xs ms-2 text-gray-500">
                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                        })}
                                    </span>
                                </span>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <form className="chat-input-wrapper dark:bg-zinc-900 bg-zinc-200 w-full flex items-center justify-between px-5 py-2">
                <button type="button" className="text-zinc-500">
                    <i className="fa-solid fa-paperclip"></i>
                </button>
                <textarea
                    className="chat-input outline-none resize-none text-black dark:text-white p-4 rounded-lg text-sm w-[90%] placeholder-zinc-700 dark:placeholder-zinc-400"
                    rows={1}
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSubmit();
                        }
                    }}
                />
                <button
                    type="button"
                    onClick={onSubmit}
                    className="w-12 h-12 text-zinc-700 dark:text-zinc-300"
                >
                    <i className="fa-solid fa-paper-plane"></i>
                </button>
            </form>
        </div>
    );
}
