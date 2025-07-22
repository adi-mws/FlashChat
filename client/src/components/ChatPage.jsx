// src/pages/ChatPage.jsx

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChat } from "../hooks/ChatsContext";
import { useAuth } from "../hooks/AuthContext";
import { useNotification } from "../hooks/NotificationContext";
import { useNetwork } from "../hooks/NetworkContext";
import { ArrowLeft, CheckSquare, Trash, ImagePlus, Send, EllipsisVertical } from "lucide-react";
import SelectChat from "../components/SelectChat";
import NoChatsFound from "../components/NoChatsFound";
import axios from "axios";
import { getImageUrl } from "../utils/imageUtils";

export default function ChatPage() {
    const { isOnline } = useNetwork();
    const { showNotification } = useNotification();
    const { chatId } = useParams();
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

    const [showMessageOptions, setShowMessageOptions] = useState({ clientX: 0, clientY: 0, show: false, messageId: null });

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
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
                prev.map((chat) => {
                    if (chat._id !== chatId) return chat;

                    if (chat.lastMessage && chat.lastMessage._id === id) {
                        const updatedMessages = localMessages.filter((msg) => msg._id !== id);
                        const newLast = updatedMessages[updatedMessages.length - 1];

                        return {
                            ...chat,
                            lastMessage: newLast || null,
                        };
                    }

                    return chat;
                })
            );

        } catch (error) {
            showNotification("Failed to delete message", "error");
        }
    };




    useEffect(() => {
        const handleMessageDeleted = ({ messageId, chatId }) => {
            // console.log("Message deleted:", messageId, "in chat:", chatId);
            setLocalMessages(prev => prev.filter(msg => msg._id !== messageId));
        };

        socket.on("message-deleted", handleMessageDeleted);

        return () => {
            socket.off("message-deleted", handleMessageDeleted); // ✅ cleanup on unmount
        };
    }, []);

    const chat = chats.find((c) => c._id === chatId);
    if (!chat) return <NoChatsFound />;
    if (!selectedChat) return <SelectChat />;

    const allMessages = [...localMessages, ...sendingMessages];

    const MessageOptions = () => {
        const { messageId } = showMessageOptions;
        return (
            <div
                className={`w-auto h-auto fixed dark:bg-zinc-800 flex-col p-5 px-10 gap-6 rounded-md ${showMessageOptions.show ? "flex" : "hidden"} items-center`}
                style={{ top: showMessageOptions.clientY, left: showMessageOptions.clientX }}
            >
                <button
                    onClick={() => handleDelete(messageId)}
                    className="w-full flex justify-center items-center gap-2 dark:text-zinc-300"
                >
                    <Trash size={15} /> Delete
                </button>
                <button className="w-full flex justify-center items-center gap-2 dark:text-zinc-300">
                    <CheckSquare size={15} /> Select
                </button>
            </div>
        );
    };

    const handleShowMessageOptions = (e, type, id) => {
        const left = type === 'sender' ? e.clientX - 150 : e.clientX;
        const top = e.clientY;
        setShowMessageOptions({ clientX: left, clientY: top, show: true, messageId: id });
    };

    return (
        <div className="chat-box flex flex-col h-screen overflow-hidden w-full" onClick={() => setShowMessageOptions({ show: false })}>
            <div className="h-[70px] flex items-center gap-5 px-4 sm:px-10 bg-gray-100 dark:bg-zinc-900">
                <div className="flex gap-2 items-center">
                    <ArrowLeft className="w-5 h-5 text-zinc-800 sm:hidden dark:text-white" onClick={() => {navigate(-1);  setSelectedChat(null)}} />
                    <img
                        onClick={() => navigate(`/chats/profile/${getReceiverId()}`)}
                        src={getImageUrl(chat.participant.pfp)}
                        alt="Profile"
                        className="w-10 h-10 cursor-pointer rounded-full"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-sm dark:text-gray-400">{chat.participant.username}</p>
                    {onlineUsers.includes(chat.participant._id) && (
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 block"></span>Online
                        </p>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden dark:bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-700 py-2">
                {loadingMessages ? (
                    <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-fit sm:max-w-[60%] rounded-xl px-2 py-3 ${i % 2 === 0 ? "ml-auto bg-primary-200 dark:bg-primary-900" : "bg-zinc-300 dark:bg-neutral-700"} animate-pulse`}
                            >
                                <div className="h-4 w-28 mb-2 bg-slate-400 dark:bg-neutral-600 rounded" />
                                <div className="h-3 w-40 bg-slate-300 dark:bg-neutral-500 rounded" />
                            </div>
                        ))}
                    </div>
                ) : (
                    allMessages.map((msg, i) => {
                        const isSender = msg.sender._id === user.id;
                        const isShort = msg.content.length < 30;
                        return (
                            <div
                                key={i}
                                className={`w-full flex px-4 items-center h-auto py-1 ${isSender ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`relative flex sm:max-w-[70%] ${isSender ? "justify-end" : "justify-start"} items-center gap-2 group`}>
                                    <EllipsisVertical onClick={(e) => { e.stopPropagation(); handleShowMessageOptions(e, 'sender', msg._id); }} size={20} className={`cursor-pointer dark:text-zinc-300 ${isSender ? "group-hover:opacity-100" : 'hidden'} opacity-0`} />

                                    <div
                                        className={`relative rounded-2xl px-4 py-2 max-w-[100%] text-sm whitespace-pre-wrap break-all ${isSender ? "bg-primary-2 text-white dark:bg-primary-2" : "bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white"} ${msg.isSending ? "opacity-60" : ""} flex ${isShort ? "items-end gap-2" : "flex-col"}`}
                                    >
                                        <span>{msg.content}</span>
                                        <span className={`text-[10px] text-gray-400 ${isShort ? "" : "mt-1 self-end"}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            })}
                                        </span>
                                    </div>

                                    {/* <EllipsisVertical size={20} onClick={(e) => { e.stopPropagation(); handleShowMessageOptions(e, 'receiver', msg._id); }} className={`cursor-pointer min-w-4 dark:text-zinc-300 ${!isSender ? "group-hover:opacity-100" : 'hidden'} opacity-0`} /> */}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-wrapper dark:bg-zinc-900 bg-zinc-200 w-full flex items-center justify-between px-5 py-2">
                {/* <button type="button" className="text-zinc-500">
                    <ImagePlus />
                </button> */}
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
                    <Send />
                </button>
            </form>
            <MessageOptions />
        </div>
    );
}