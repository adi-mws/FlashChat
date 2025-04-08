import React, { useEffect, useState } from 'react'
import ChatListHeader from './ChatListHeader'
import { useChat } from '../hooks/ChatsContext'
import { usePopUp } from '../hooks/PopUpContext';
import { useAuth } from '../hooks/AuthContext';


export default function ChatsList() {
    const { chats, setChats, loading } = useChat();
    const { setShowSearchUsers } = usePopUp();
    const { user } = useAuth();

    // {
    //     "_id": "66113f912312a5a5b3ff11e1",
    //     "participant": {
    //       "_id": "660ff1a0123bde4321f456aa",
    //       "username": "alice123",
    //       "name": "Alice Smith",
    //       "pfp": "https://cdn.example.com/images/alice.jpg"
    //     },
    //     "lastMessage": {
    //       "_id": "66113f9d123987a9fceaa55c",
    //       "content": "Don't forget the meeting at 5 PM.",
    //       "sender": {
    //         "_id": "660ff1a0123bde4321f456aa",
    //         "name": "Alice Smith"
    //       },
    //       "createdAt": "2025-04-06T10:45:00.000Z"
    //     },
    //     "unreadCount": 1,
    //     "updatedAt": "2025-04-06T10:45:00.000Z"
    //   },
    
    useEffect(() => {
        console.log(chats)
    }, [])
    return (
        <div className="chats-list dark:bg-gray-950 h-full border-r-1 border-gray-300 dark:border-gray-900 flex flex-col">
            <ChatListHeader />
            <div className="chats-list-header bg-slate-100 dark:bg-slate-900 flex flex-row items-center h-15 px-10 justify-between">
                <h3 className="dark:text-white text-center py-2">Chats</h3>
                <button className="dark:text-white text-sm" onClick={() => { setShowSearchUsers(true) }}><i className="fa-solid fa-user-plus"></i></button>
            </div>

            {!loading && Array.isArray(chats) && chats.map((chat, index) => (
                <>
                    <div onClick={() => {}} key={index} className="chat-list-item flex cursor-pointer dark:hover:bg-gray-900 items-center gap-5 py-4 px-5 border-b-1 dark:border-gray-700 border-gray-300">
                        <div className="pfp-user-details flex items-center gap-5">
                            <div className="pfp-wrapper relative">
                                <img src={chat.participant?.pfp} className="w-10 h-10 rounded-full" alt="" />
                                <span className="w-3 h-3 rounded-full bg-green-700 absolute bottom-0 right-1"></span>
                            </div>
                            <div className="user-details flex flex-col gap-1">
                                <p className="user-name dark:text-white text-sm">{chat.participant?.name}</p>
                                <p className="user-username dark:text-primary-1 gray-200 text-xs">{chat.participant?.username}</p>
                            </div>
                        </div>

                    </div>
                </>
            ))}


        </div>
    )
}
