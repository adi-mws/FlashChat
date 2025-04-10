// context/ChatContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from "socket.io-client";
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

// Create socket instance ONCE outside component scope
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
    autoConnect: false,
});

export const ChatProvider = ({ children }) => {
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { showNotification } = useNotification();
    const { user } = useAuth();

    //  Socket connection logic
    useEffect(() => {
        if (!user) return;

        // Connect only if not already connected
        if (!socket.connected) {
            socket.connect();
            socket.emit("join", user.id);

            socket.on("disconnect", () => {
                console.warn('socket disconnected')
            })
        }

        const handleReceiveMessage = (data) => {
            console.log("Received via socket:", data);


            if (data.messageData) {
                const newChat = {
                    _id: data.chat,
                    lastMessage: data.messageData,
                    participant: data.participant,
                    updatedAt: data.chatUpdatedAt,
                    unreadCount: data.unreadCount
                }


                setMessages(prev => ({
                    ...prev,
                    [data.chat]: [
                        ...(prev[data.chat] || []),
                        data.messageData
                    ],
                }));

                if (data.messageData.sender._id === user.id) {
                    console.log("yess!");

                    setChats(prev => {
                        const filtered = prev.filter(chat => chat._id != null);
                        console.log('Filtered value: ', filtered);
                        return [newChat, ...filtered];
                    });
                    setSelectedChat(newChat);

                }
                else {
                    setChats(prev => [newChat, ...prev])
                }
            } else {
                setMessages(prev => ({
                    ...prev,
                    [data.chat]: [
                        ...(prev[data.chat] || []),
                        data
                    ],
                }));

            }
        }




        socket.off("receiveMessage"); // remove ALL previous listeners
        socket.on("receiveMessage", handleReceiveMessage);

        return () => {
            socket.off("receiveMessage", handleReceiveMessage);
            socket.disconnect();
        };
    }, [user?.id]);

    // Fetch all chats
    const fetchChats = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/chats/get-all/${user.id}`, {
                withCredentials: true,
            });

            if (response.status === 200) {
                console.log(response.data)
                setChats(response.data.chats);
                setError(null);
            } else {
                console.error(response.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch messages for a chat
    const fetchMessages = async (chat) => {
        if (!chat) return;

        try {
            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/chats/get-messages/${chat}`, {
                withCredentials: true,
            });

            if (response.status === 200) {

                setMessages(prev => {
                    // If chat already exists in the messages object
                    if (prev[chat]) {
                        return {
                            ...prev,
                            [chat]: response.data.messages, // Replace old messages with new ones
                        };
                    } else {
                        return {
                            ...prev,
                            [chat]: response.data.messages, // Add new chat with its messages
                        };
                    }
                });


                setError(null);
            } else {
                showNotification("error", "Something went wrong!");
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            console.log(messages)
            setLoading(false);
        }
    };

    // Send a message
    const sendMessage = async (message, receiverId, senderId, selectedChat) => {
        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/chats/send-message`,
                {
                    message: message,
                    receiverId: receiverId,
                    senderId: senderId,
                },
                { withCredentials: true }
            );

            if (response.status === 200) {
                const data = response.data.data;

                const messageData = {
                    chat: data.chat, // rename to chat for consistency
                    _id: data._id,
                    content: data.content,
                    sender: {
                        _id: data.sender._id,
                        name: data.sender.name,
                    },
                    createdAt: data.createdAt,
                    isRead: false,
                };

                setChats(prev => {
                    const updatedChats = prev.filter(chat => chat._id !== selectedChat._id);
                    return [
                        { ...selectedChat, lastMessage: messageData, updatedAt: new Date() },
                        ...updatedChats,
                    ];
                });
            }
        } catch (error) {
            console.error("Error sending message: ", error);
            showNotification('error', error.response?.data?.message || "Failed to send message");
        }
    };


    useEffect(() => {
        if (user?.id) fetchChats();
    }, [user])

    return (
        <ChatContext.Provider
            value={{
                chats,
                setChats,
                selectedChat,
                setSelectedChat,
                messages,
                loading,
                error,
                fetchChats,
                fetchMessages,
                sendMessage,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
