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
    const { user, loading } = useAuth();
    const { chats, setChats, setSelectedChat, selectedChat, messages, setMessages } = useChat();
    const navgiate = useNavigate();
    

    // Form onSubmit
    const onSubmit = async () => {
        console.log(message)
    }

    useState(() => {
        console.log(messages)
    }, [loading])


    const createNewChat = (participant) => {
        console.log(participant)
        setChats(prev => [
            {

                _id: null,
                participant: {
                    _id: participant.id,
                    username: participant.username,
                    name: participant.name,
                    pfp: participant.pfp
                }
            }
            , ...prev
        ])

        setSelectedChat({

            _id: null,
            participant: {
                _id: participant.id,
                username: participant.username,
                name: participant.name,
                pfp: participant.pfp
            }
        })
    }

    
    if (loading) {
        return <span className="animate-spin border-2 ms-2 block border-white rounded-full w-3 h-3 border-t-transparent"></span>
    }
    return (
        <>
            <div className="chat-container h-screen w-full grid grid-cols-[350px_calc(100%-350px)]">
                <ChatsList />
                <div className="chat-box flex flex-col items-center justify-center">
                    {chats.length === 0 ?
                        <NoChatsFound setShowSearchUsers={setShowSearchUsers} />
                        : selectedChat ? (
                            <>
                                <div className="chat-header bg-gray-100 p-2 w-full h-20 flex dark:bg-black gap-5 items-center px-10 ">
                                    <img src={selectedChat?.participant?.pfp} alt="" className="w-10 h-10 rounded-full" />
                                    <div className="chat-header-labels flex gap-1 flex-col">
                                        <p className="chat-user-username dark:text-gray-400 text-sm">@{selectedChat?.participant?.username}</p>
                                        <p className="chat-user-name text-green-500 flex gap-1 text-xs items-center"><span className="h-2 w-2 rounded-full bg-green-500 block"></span>Online</p>

                                    </div>

                                </div>
                                <div className="message-container h-full w-full flex flex-col justify-end dark:bg-gray-950">
                                    {/* {console.log(messages)} */}
                                    {(messages|| []).map((msg, index) => (
                                        <div
                                            key={index}
                                            className={`message ${msg.sender === user?.id ? "sent" : "received"}`}
                                        >
                                            <div className={`dark:text-white p-2 flex ${msg.sender === user?.id ? 'justify-start': 'justify-end' }`}>
                                                 <span className="bg-orange-200 dark:bg-primary-2 p-5 rounded-xl text-sm ">{msg.content}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <form
                                    className="chat-input-wrapper dark:bg-gray-900 bg-gray-200 items-center w-full flex justify-between px-5 py-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        onSubmit();
                                        // send message logic
                                    }}
                                >
                                    <button type="button" className="text-gray-500">
                                        <i className="fa-solid fa-paperclip"></i>
                                    </button>

                                    <textarea
                                        className="chat-input outline-0 resize-none overflow-auto scrollbar-none text-black text-sm w-[90%] placeholder-gray-700 dark:text-white dark:placeholder-gray-400 p-4 rounded-lg max-h-30"
                                        placeholder="Type a message..."
                                        value={message}
                                        rows={1}
                                        
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                // send message logic
                                            }
                                        }}
                                    />

                                    <button type="submit" className="send-btn rounded-full scroll-m-1 w-12 h-12 bg-primary-1 dark:bg-primary-1">
                                        <i className="fa-solid fa-paper-plane"></i>
                                    </button>
                                </form>

                            </>
                        ) : (

                            <SelectChat />
                        )}
                </div>
            </div >
            <SearchUsers setShowSearchUsers={setShowSearchUsers} showSearchUsers={showSearchUsers} createNewChat={createNewChat} />

        </>
    );
}


