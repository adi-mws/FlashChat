import React from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../redux/slices/authSlice';
import Message from './Message';

export default function MessageList({ loading, messages, messagesEndRef, handleShowMessageOptions }) {
    const user = useSelector(selectUser);

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-zinc-950 p-4 sm:p-6 space-y-2">
            {loading ? (
                <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-3 animate-pulse ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`space-y-2 max-w-[60%] ${i % 2 === 0 ? "items-end flex flex-col" : ""}`}>
                                {/* Simulate an image bubble every 3rd message */}
                                {i % 3 === 1 ? (
                                    <div className="h-36 w-52 bg-slate-200 dark:bg-zinc-800 rounded-2xl" />
                                ) : (
                                    <div className="h-9 w-44 bg-slate-200 dark:bg-zinc-800 rounded-2xl" />
                                )}
                                <div className="h-2 w-10 bg-slate-200 dark:bg-zinc-800 rounded" />
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

                    // Determine the message type
                    // Server sends: msg.type ('text'|'image'|'file'), or we fall back to content length check
                    const type = msg.type || "text";
                    const isMultiLine =
                        type === "text" && (msg.content?.includes("\n") || (msg.content?.length || 0) > 65);

                    return (
                        <Message
                            key={msg._id || `sending-${i}`}
                            isSender={isSender}
                            message={msg}
                            time={time}
                            isMultiLine={isMultiLine}
                            handleShowMessageOptions={handleShowMessageOptions}
                        />
                    );
                })
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
