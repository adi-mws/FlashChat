// context/ChatContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from "socket.io-client";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([

        {
            _id: "msg1",
            chatId: "chat123",
            content: "Hello!",
            sender: {
                _id: "userA",
                name: "Alice",
                avatar: "/images/alice.jpg"
            },
            createdAt: "2025-04-08T10:00:00.000Z",
            isRead: true
        },
        {
            _id: "msg2",
            chatId: "chat123",
            content: "Hi Alice, how are you?",
            sender: {
                _id: "userB",
                name: "Bob",
                avatar: "/images/bob.jpg"
            },
            createdAt: "2025-04-08T10:01:00.000Z",
            isRead: false
        }


    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        console.log(messages);
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
        try {
            setLoading(true);
            const { data } = await axios.get('/api/chats/get');
            setChats(data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch messages for a specific chat
    const fetchMessages = async (chatId) => {
        try {
            if (!chatId) return;

            setLoading(true);
            const { data } = await axios.get(`/api/chats/${chatId}/messages`);
            setMessages(data);
            setSelectedChat(chatId);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    // Send a new message
    const sendMessage = async (content) => {
        try {
            const { data } = await axios.post(`/api/chats/${selectedChat}/messages`, { content });

            // Update messages locally
            setMessages(prev => [...prev, data]);

            // Update chat list to move this chat to top
            setChats(prev => {
                const updatedChats = prev.filter(chat => chat._id !== selectedChat);
                const thisChat = prev.find(chat => chat._id === selectedChat);
                return [
                    { ...thisChat, lastMessage: data, updatedAt: new Date() },
                    ...updatedChats
                ];
            });

            return data;
        } catch (err) {
            setError(err.response?.data?.message || err.message);
            throw err;
        }
    };

    useEffect(() => {
        // fetchChats();
    }, []);

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