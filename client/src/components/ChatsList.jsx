import React, { useEffect, useState } from 'react'
import ChatListHeader from './ChatListHeader'
import { useChat } from '../hooks/ChatsContext'
import { usePopUp } from '../hooks/PopUpContext';


export default function ChatsList() {
    const [chatList, setChatList] = useState([]);
    const { chats } = useChat();
    const { setShowSearchUsers } = usePopUp();
    useEffect(() => {
    }, [])
    return (
        <div className="chats-list dark:bg-gray-950 h-full border-r-1 border-gray-300 dark:border-gray-900 flex flex-col">
            <ChatListHeader />
            <div className="chats-list-header bg-slate-100 dark:bg-slate-900 flex flex-row items-center h-15 px-10 justify-between">
                <h3 className="dark:text-white text-center py-2">Chats</h3>
                <button className="dark:text-white text-sm" onClick={() => { setShowSearchUsers(true) }}><i className="fa-solid fa-user-plus"></i></button>
            </div>

            {chatList?.map((chat, index) => (
                <>
                    <div onClick={() => { selectedChat.chat }} className="chat-list-item flex cursor-pointer dark:hover:bg-gray-900 items-center gap-5 py-4 px-5 border-b-1 dark:border-gray-700 border-gray-300">
                        <div className="pfp-user-details flex items-center gap-5">
                            <div className="pfp-wrapper relative">
                                <img src={user.pfp} className="w-12 h-12 rounded-full" alt="" />
                                <span className="w-3 h-3 rounded-full bg-green-700 absolute bottom-0 right-1"></span>
                            </div>
                            <div className="user-details flex flex-col">
                                <p className="user-name dark:text-white text-md">Aditya Raj</p>
                                <p className="user-username dark:text-primary-1 gray-200 text-sm">adi-mws</p>
                            </div>
                        </div>

                    </div>
                </>
            ))}


        </div>
    )
}
