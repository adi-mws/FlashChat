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
import ProfileForm from "../components/forms/ProfileForm";

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
    const { chats, setChats, sendMessage, setSelectedChat, selectedChat, messages, onlineUsers, setMessages } = useChat();
    const navgiate = useNavigate();
    const [isSidebarDragging, setIsSidebarDragging] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(350);
    // Form onSubmit
    const onSubmit = () => {
        // Calling api function for message sending
        // console.log(selectedChat, user.id)
        if (message.trim().length > 0) {
            sendMessage(message, selectedChat.participant._id, user.id, selectedChat)
            setMessage('')
        }
    }

    useState(() => {
        console.log(chats);
        console.log(messages)
    }, [loading])


    const createNewChat = (participant) => {
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


    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isSidebarDragging) return;
            console.log(e.clientX)
            const newWidth = e.clientX;
            if (newWidth > 250 && newWidth < 700) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            if (isSidebarDragging) {
                setIsSidebarDragging(false);
                document.body.style.userSelect = "auto"; // Re-enable selection
            }
        };

        if (isSidebarDragging) {
            document.body.style.userSelect = "none"; // Prevent text selection
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            document.body.style.userSelect = "auto";
        };
    }, [isSidebarDragging]);

    const messagesEndRef = useRef(null);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, selectedChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };



    if (loading) {
        return <span className="animate-spin border-2 ms-2 block border-white rounded-full w-3 h-3 border-t-transparent"></span>
    }
    return (
        <>
            <div className={`chat-container h-screen w-full flex`}>
                <div
                    style={{ width: sidebarWidth, transition: isSidebarDragging ? 'none' : 'width 0.1s ease' }}
                    className={`sidebar bg-white dark:bg-zinc-800 h-full`}
                >
                    <ChatsList />
                </div>

                <div
                    className="w-1 cursor-col-resize hover:bg-zinc-400 dark:hover:bg-zinc-700 dark:bg-zinc-800 bg-zinc-200"
                    onMouseDown={() => setIsSidebarDragging(true)}
                ></div>
                <div className="chat-box-wrapper overflow-hidden flex h-screen justify-center align-center" style={{ width: `calc(100% - ${sidebarWidth}px)` }}>
                    {chats.length === 0 ?
                        <NoChatsFound setShowSearchUsers={setShowSearchUsers} />
                        : selectedChat ? (
                            <>
                                <div className="chat-box grid grid-rows-[70px_calc(100%-130px)_60px] items-center h-screen w-full ">

                                    <div className="chat-header bg-gray-100 p-2 w-full h-20 flex dark:bg-zinc-900 gap-5 items-center px-10 ">
                                        <img src={`${import.meta.env.VITE_BACKEND_URL}/${selectedChat?.participant?.pfp}`} alt="" className="w-10 h-10 rounded-full" />
                                        <div className="chat-header-labels flex gap-1 flex-col">
                                            <p className="chat-user-username dark:text-gray-400 text-sm">{selectedChat?.participant?.username}</p>
                                            {onlineUsers.includes(selectedChat?.participant._id) ? <p className="chat-user-name text-green-500 flex gap-1 text-xs items-center"><span className="h-2 w-2 rounded-full bg-green-500 block"></span>Online</p> : <></>}

                                        </div>
                                    </div>
                                    <div className="message-container h-full w-full flex flex-col dark:bg-zinc-950">
                                        <div className="flex-grow"></div> {/* Empty tag for pushing message at the bottom */}
                                        <div className="overflow-y-auto scrollbar-thin flex flex-col-reverse scrollbar-thumb-zinc-400 scrollbar-track-transparent">
                                            <div>
                                                {(messages[selectedChat._id] || []).map((msg, index) => (
                                                    <div key={index} className="message">
                                                        <div className={`dark:text-white p-1 flex ${msg?.sender?._id === user?.id ? 'justify-end' : 'justify-start'}`}>
                                                            <span className={`bg-orange-200 ${msg?.sender?._id === user?.id ? 'dark:bg-primary-2 bg-primary-2 text-white' : 'dark:bg-zinc-800 bg-zinc-200'} p-3 rounded-xl text-sm block max-w-[60%] w-auto`}>
                                                                {msg?.content}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div ref={messagesEndRef} />
                                            </div>
                                        </div>
                                    </div>
                                    <form
                                        className="chat-input-wrapper dark:bg-zinc-900 bg-zinc-200 items-center w-full flex justify-between px-5 py-2"
                                        onSubmit={(e) => {
                                            onSubmit();
                                        }}
                                    >
                                        <button type="button" className="text-zinc-500">
                                            <i className="fa-solid fa-paperclip"></i>
                                        </button>

                                        <textarea
                                            className="chat-input outline-0 resize-none overflow-auto scrollbar-none text-black text-sm w-[90%] placeholder-zinc-700 dark:text-white dark:placeholder-zinc-400 p-4 rounded-lg max-h-30"
                                            placeholder="Type a message..."
                                            value={message}
                                            rows={1}

                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    onSubmit();
                                                }
                                            }}
                                        />

                                        <button type="button" onClick={() => onSubmit()} className="send-btn rounded-full scroll-m-1 w-12 h-12 dark:text-zinc-300 text-zinc-700">
                                            <i className="fa-solid fa-paper-plane"></i>
                                        </button>
                                    </form>
                                </div>
                                <ProfileForm />
                            </>
                        ) : (

                            <SelectChat />
                        )}
                </div>
            </div>
            <SearchUsers setShowSearchUsers={setShowSearchUsers} showSearchUsers={showSearchUsers} createNewChat={createNewChat} />

        </>
    );
}


