// context/ChatContext.js
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from "socket.io-client";
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

// Create socket instance ONCE outside component scope
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
    autoConnect: false,
    withCredentials: true

});

export const ChatProvider = ({ children }) => {
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState({});
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const { showNotification } = useNotification();
    const { user } = useAuth();
    const selectedChatRef = useRef(null);
    const chatsRef = useRef(null);
    const messagesRef = useRef(messages);
    useEffect(() => {
        chatsRef.current = chats;
    }, [chats]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages])

    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

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
                console.log('If condition is running!')
                const newChat = {
                    _id: data.chat,
                    lastMessage: data.messageData,
                    participant: data.participant,
                    updatedAt: data.chatUpdatedAt,
                    unreadCount: data.unreadCount
                }


                setMessages(prev => ({
                    [data.chat]: [
                        ...(prev[data.chat] || []),
                        data.messageData
                    ],
                    ...prev,

                }));

                if (data.messageData.sender._id === user.id) {

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
                // If it is an old chat 
                // Setting the message Count live 
                if (selectedChatRef.current._id != data.chat) {
                    console.log("Chat id  ", data.chat)
                    const receivedChat = chatsRef.current.find((chat) => chat._id === data.chat)
                    receivedChat.unreadCount = data.unreadCount;
                    const remainingChats = chatsRef.current.filter((chat) => chat._id !== data.chat);
                    if (receivedChat) {
                        setChats([receivedChat, ...remainingChats])
                    }
                } else {
                    // if user is selected the current message chat then the seen count should be updated 
                    // in the server through the emit below
                    if (data.sender._id !== user.id) {
                        socket.emit('seenMessage', {
                            messageId: data._id,
                            chatId: data.chat,
                            senderId: data.sender._id,
                            userId: user.id
                        })
                    }
                }

                setMessages(prev => ({
                    ...prev,
                    [data.chat]: [
                        ...(prev[data.chat] || []),
                        data
                    ],
                }));



                // setChats(prev => {
                //     const updatedChat = prev.filter((chat) => chat._id == data.chat);
                //     const prevChats = prev.filter(chat => chat._id != data.chat);
                //     console.log(updatedChat, prevChats)
                //     return [updatedChat, prevChats];
                // })

            }
        }

        const handleReceiverSeenMessage = (data) => {
            console.log('Chat Id: ', data.chatId);
            console.log("Message Id: ", data.messageId)

            setMessages(prev => ({
                ...prev,
                [data.chatId]: prev[data.chatId].map(message =>
                    message._id === data.messageId
                        ? {
                            ...message,
                            readBy: Array.isArray(message.readBy)
                                ? [...message.readBy, data.receiverId]
                                : [data.receiverId]
                        }
                        : message
                )
            }))
        }


        socket.off("receiveMessage"); // remove ALL previous listeners
        socket.on("receiveMessage", handleReceiveMessage);
        socket.on("receiverSeenMessage", handleReceiverSeenMessage);


        const handleUserOnline = (users) => {
            setOnlineUsers(users)
        };

        socket.on("onlineUsers", handleUserOnline);
        return () => {
            socket.off("receiveMessage", handleReceiveMessage);
            socket.off("receiverSeenMessage", handleReceiverSeenMessage);
            socket.off("onlineUsers", handleUserOnline);

            socket.disconnect();
        };
    }, [user?.id]);


    const emitSeenMessages = (chatId) => {
        console.log("Function Emit seeen messages triggered!");
        // Filter unread messages
        if (Object.keys(messages).includes(chatId)) {
            const unreadMessages = messages[chatId].filter(message =>
                !message.readBy.includes(user.id) // Assuming readBy is an array of userIds that have read the message
            );
            console.log("Unread Messages : ", unreadMessages);

            // Emit the 'seenMessage' event for each unread message
            unreadMessages.forEach(message => {
                socket.emit('seenMessage', {
                    messageId: message._id,
                    chatId: chatId,
                    senderId: message.sender._id,
                });
            })
        }
    }


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
    const sendMessage = async (message, receiverId, senderId) => {
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

                // setChats(prev => {
                //     const updatedChats = prev.filter(chat => chat._id !== selectedChat._id);
                //     return [
                //         { ...selectedChat, lastMessage: messageData, updatedAt: new Date() },
                //         ...updatedChats,
                //     ];
                // });
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
                emitSeenMessages,
                onlineUsers,
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
