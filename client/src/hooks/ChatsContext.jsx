// context/ChatContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from "socket.io-client";
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const { showNotification } = useNotification()
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { user } = useAuth();
    useEffect(() => {
        // console.log(messages);
    }, [])
    const socket = io('http://localhost:3000'); // Connect to backend WebSocket


    // loading States
    // useEffect(() => {

    //     socket.connect();
    //     socket.emit("join",  ?.id);

    //     socket.on("receiveMessage", (data) => {
    //         console.log(data);

    //         // Find the correct chat object
    //         const chat = chats.find((e) => e.chatId === data.chatId);

    //         if (!chat) {
    //             console.warn("Chat ID not found for received message:", data);
    //             return;
    //         }
    //         // if (!user.name === (chats.map((user) => selectedChat.chatId === user.chatId))._id) {
    //         setMessages((prev) => ({
    //             ...prev,
    //             [chat.chatId]: [
    //                 ...(prev[chat.chatId] || []),
    //                 {
    //                     message: data.message,
    //                     read: false, // or true based on logic
    //                     sender: data.sender,
    //                     _id: data._id,
    //                 },
    //             ],
    //         }));
    //         // }
    //     });

    //     return () => {
    //         socket.off("receiveMessage");
    //     };
    // }, [user, useMemo(() => chats, [chats])]);

    // Fetch user's chat list
    const fetchChats = async () => {
        console.log("Selected Chat", selectedChat)

        try {

            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/chats/get-all/${user.id}`, { withCredentials: true });
            console.log('THis is the response from API', response.data);
            if (response.status === 200) {
                const data = response.data;
                setError(null);
                setChats(data.chats);
            } else {
                console.error(response.data)
            }

        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {

        if (user?.id) {
            fetchChats();
        }

    }, [user]);

    // Fetch messages for a specific chat
    const fetchMessages = async (chatId) => {
        try {
            if (!chatId) return;

            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/chats/get-messages/${chatId}`, { withCredentials: true });
            if (response.status === 200) {
                setMessages(response.data.messages);
                setError(null);
            } else {
                showNotification("error", "Something went wrong!");
            }

        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };



    // Send a new message
    const sendMessage = async (message, receiverId, senderId, selectedChat) => {
        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/chats/send-message`,
                {
                    message,
                    receiverId,
                    senderId,
                },
                { withCredentials: true }
            );

            if (response.status === 200) {
                const data = response.data.data;
                // console.log(data.sender)
                // console.log(data)
                const messageData = {
                    chatId: data.chatId,
                    _id: data._id,
                    content: data.content,
                    sender: {
                        _id: data.sender._id,
                        name: data.sender.name,
                    },
                    createdAt: data.createdAt,
                    isRead: false,
                };

                // Update messages locally
                setMessages(prev => [...prev, messageData]);

                // Update chat list to move this chat to the top
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



    return (
        <ChatContext.Provider
            value={{
                chats,
                setChats,
                selectedChat,
                messages,
                loading,
                error,
                fetchChats,
                fetchMessages,
                sendMessage,
                setSelectedChat
            }}
        >

            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);