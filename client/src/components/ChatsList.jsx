import React, { useEffect, useState } from 'react'
import ChatListHeader from './ChatListHeader'
import { useChat } from '../hooks/ChatsContext'
import { usePopUp } from '../hooks/PopUpContext';
import { useAuth } from '../hooks/AuthContext';
import { useRef } from 'react';
import { useTheme } from '../hooks/ThemeContext';
import axios from 'axios';


export default function ChatsList() {
    const { chats, setChats, loading, setSelectedChat, fetchMessages, onlineUsers } = useChat();
    const { setShowSearchUsers } = usePopUp();
    const { user, logout } = useAuth();
    const [sliderMenu, setSliderMenu] = useState(false);
    const dropdownRef = useRef(null);
    const { theme, setTheme } = useTheme();


    const handleLogout = () => {
        logout();
        showNotification("success", "Logout Successful!");
        navigate("/login");
    };


    useEffect(() => {

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setSliderMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleReadCount = async (chatId, userId) => {

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/chats/message-read`,
                { chatId: chatId, userId: userId },
                { withCredentials: true }
            );
            if (response.status === 200) {
                setChats(prev => prev.map(chat => {
                    if (chat._id === chatId) {
                        return { ...chat, unreadCount: 0 };
                    }
                    return chat;
                }));
            } else {
                console.warn(response.data.message);
            }
        }
        catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        console.log(chats)
    }, [])
    return (
        <div className="chats-list dark:bg-zinc-900 h-full border-r-1 border-zinc-300 dark:border-zinc-900 flex flex-col justify-between ">
            <ChatListHeader />
            {/* <div className="chat-list-categories flex flex-row p-2 ">
                <span className='block py-2 px-3 border-1 border-primary dark:text-white rounded-full font-semibold text-xs cursor-pointer'>Unread</span>
            </div> */}
            <div className="chat-list-container flex flex-col items-center h-full">
                {!loading && Array.isArray(chats) && chats.map((chat, index) => (
                    <div onClick={() => { setSelectedChat(chat); handleReadCount(chat._id, user.id); fetchMessages(chat._id); }} key={chat._id} className="chat-list-item flex w-full cursor-pointer dark:hover:bg-zinc-950 items-center gap-5 py-4 px-5 border-b-1 dark:border-zinc-800 border-zinc-300">
                        <div className="pfp-user-details flex justify-between w-full gap-5">
                            <div className="flex items-center gap-4">
                                <div className="pfp-wrapper relative">
                                    <img src={chat.participant?.pfp} className="w-10 h-10 rounded-full" alt="" />
                                    {onlineUsers.includes(chat.participant?._id) ? <span className="w-3 h-3 rounded-full bg-green-700 absolute bottom-0 right-1"></span> : <></>}
                                </div>
                                <div className="user-details flex flex-col gap-1">
                                    <p className="user-name dark:text-white text-sm">{chat.participant?.name}</p>
                                    <p className="user-username dark:text-zinc-400 font-bold zinc-200 text-xs">{chat.participant?.username}</p>
                                </div>
                            </div>

                            <div className="read-count-wrapper flex justify-end items-center">
                                {chat.unreadCount > 0 ? <span className="unread-count bg-primary rounded-full text-white w-5 h-5 justify-center items-center flex text-xs">{chat.unreadCount}</span> : <></>}

                            </div>
                        </div>

                    </div>
                ))}
            </div>
            <div className="chats-list-header bg-slate-100 dark:bg-zinc-900 border-t-1 border-zinc-800 flex flex-row items-center h-21 px-5 justify-between">
                {user ?
                    <>
                        {/* Profile Section */}
                        <div className="relative flex flex-row gap-2 items-center" ref={dropdownRef}>
                            <div
                                className="profile flex gap-3 items-center rounded-full bg-zinc-200 p-1 dark:bg-zinc-800 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                                onClick={() => setSliderMenu(!sliderMenu)}
                            >
                                <img src={user?.pfp} className="pfp w-12 h-12 rounded-full" alt="Profile" />
                            </div>
                            <div className="chat-header-labels flex gap-1 flex-col">
                                <p className="chat-user-username dark:text-gray-400 text-sm">{user.username}</p>
                                <p className="chat-user-name text-green-500 flex gap-1 text-xs items-center"><span className="h-2 w-2 rounded-full bg-green-500 block"></span>Online</p>

                            </div>
                            {/* Dropdown Menu */}
                            {(
                                <div className={`fixed left-0 ${sliderMenu ? 'bottom-0' : 'bottom-[-400px]'} transition-all duration-500 mt-2 w-48 bg-white dark:bg-zinc-800 shadow-lg rounded-md z-10`}>
                                    <ul className="py-2">
                                        <li className="flex items-center px-4 gap-5 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600 cursor-pointer transition">
                                            <i className="fas fa-user"></i> <span> Profile</span>
                                        </li>
                                        <li className="flex items-center px-4 gap-5 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600 cursor-pointer transition" onClick={() => { theme === 'light' ? setTheme('dark') : setTheme('light') }}>
                                            <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'}`}></i> <span> Appearence</span>
                                        </li>

                                        <li className="flex items-center gap-4 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600 cursor-pointer transition">
                                            <i className="fas fa-cog"></i> <span> Settings</span>
                                        </li>
                                        <li className="flex items-center gap-4 px-4 py-2 text-sm text-red-500 hover:bg-zinc-300 dark:hover:bg-zinc-600 cursor-pointer transition" onClick={handleLogout}>
                                            <i className="fas fa-sign-out-alt"></i> Logout
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </>
                    : <></>}
                <button className="dark:text-white text-sm me-5" onClick={() => { setShowSearchUsers(true) }}><i className="fa-solid fa-user-plus"></i></button>
            </div>


        </div>
    )
}
