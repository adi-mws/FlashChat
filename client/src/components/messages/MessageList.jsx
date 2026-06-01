import React from 'react'
import { useAuth } from '../../hooks/AuthContext';
import Message from './Message';
export default function MessageList({ loading, messages, messagesEndRef, handleShowMessageOptions }) {
    const { user } = useAuth();
    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-zinc-950 p-4 sm:p-6 space-y-4">
            {loading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-3 animate-pulse ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`space-y-2 max-w-[60%] ${i % 2 === 0 ? "items-end flex flex-col" : ""}`}>
                                <div className="h-9 w-44 bg-slate-200 dark:bg-zinc-900 rounded-2xl" />
                                <div className="h-2 w-10 bg-slate-200 dark:bg-zinc-900 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                messages.map((msg, i) => {
                    const isSender = msg.sender?._id === user.id;
                    const time = new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    });

                    const isMultiLine =
                        msg.content.includes("\n") || msg.content.length > 65;
                    return (
                        <Message key={msg._id} isSender={isSender} message={msg} time={time} isMultiLine={isMultiLine} handleShowMessageOptions={handleShowMessageOptions} />
                    );
                })
            )}
            <div ref={messagesEndRef} />
        </div>


    )
}
