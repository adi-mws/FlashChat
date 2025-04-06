import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useNotification } from "../hooks/NotificationContext";
import axios from "axios";
import { useAuth } from "../hooks/AuthContext";
import SelectChat from '../components/SelectChat'
import NoChatsFound from '../components/NoChatsFound'
import SearchUsers from '../components/forms/SearchUsers'
import ChatsList from '../components/ChatsList'
import { usePopUp } from "../hooks/PopUpContext";
import { useChat } from "../hooks/ChatsContext";

export default function ChatLayout() {
    const {
        handleSubmit,
        register,
        reset,

    } = useForm();

    const { showSearchUsers, setShowSearchUsers } = usePopUp();
    const { showNotification } = useNotification();
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState({});
    const { user, loading } = useAuth();
    const { chats, setChats, setSelectedChat, selectedChat } = useChat();
    const navgiate = useNavigate();

    // Form onSubmit
    const onSubmit = async (data) => {
    }
 
    if (loading) {
        return <span className="animate-spin border-2 ms-2 block border-white rounded-full w-3 h-3 border-t-transparent"></span>
    }
    return (
        <>
            <div className="chat-container h-screen w-full grid grid-cols-[350px_calc(100%-350px)]">
                <ChatsList />
                <div className="chat-box place-items-center grid dark:bg-gray-950">
                    {chats.length === 0 ?
                        <NoChatsFound setShowSearchUsers={setShowSearchUsers} />
                        : selectedChat?.chatId ? (
                            <>
                                <div className="chat-header w-full h-50 block dark:bg-black ">
                                    <img src={selectedChat.userId} alt="" className="w-15 h-15 rounded-full" />
                                    <p className="chat-user-name dark:text-white">Aditya Raj</p>
                                    <p className="chat-user-username dark:primary-1">adi-mws</p>
                                </div>
                                <div className="message-container" ref={messageContainer} >
                                    {/* {console.log(messages)} */}
                                    {(messages[selectedChat.chatId] || []).map((msg, index) => (
                                        <div
                                            key={index}
                                            className={`message ${msg.sender === user?.id ? "sent" : "received"}`}
                                        >
                                            {msg.message}
                                        </div>
                                    ))}
                                </div>

                                <form className="chat-input-wrapper" onSubmit={sendMessage}>
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                    <button type="submit">➤</button>
                                </form>
                            </>
                        ) : (

                            <SelectChat />
                        )}
                </div>
            </div >
            <SearchUsers setShowSearchUsers={setShowSearchUsers} showSearchUsers={showSearchUsers} />

        </>
    );
}


