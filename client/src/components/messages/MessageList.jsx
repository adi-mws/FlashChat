import React from 'react'
import { useAuth } from '../../hooks/AuthContext';
import { EllipsisVertical } from "lucide-react";

export default function Message({ loading, messages, messagesEndRef, handleShowMessageOptions }) {
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
                        <div
                            key={i}
                            className={`w-full flex items-end gap-1.5 group ${isSender ? "justify-end" : "justify-start"}`}
                        >
                            {isSender && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleShowMessageOptions(e, 'sender', msg._id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition flex-shrink-0"
                                >
                                    <EllipsisVertical size={14} />
                                </button>
                            )}
                            {/* Actual Messages */}

                            <div
                                className={`relative max-w-[80%] sm:max-w-[60%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isSender
                                    ? "bg-primary-2 text-white rounded-br-none"
                                    : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-100 dark:border-zinc-800/80 rounded-bl-none"
                                    } ${msg.isSending ? "opacity-60" : ""}`}
                            >
                                {isMultiLine ? (
                                    <>
                                        <div className="text-xs whitespace-pre-wrap break-words">
                                            {msg.content}
                                        </div>

                                        <div
                                            className={`mt-1 text-[9px] text-right ${isSender
                                                ? "text-indigo-200"
                                                : "text-slate-400 dark:text-zinc-500"
                                                }`}
                                        >
                                            {time}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-end gap-2">
                                        <span className="text-xs break-words">
                                            {msg.content}
                                        </span>

                                        <span
                                            className={`shrink-0 text-[9px] ${isSender
                                                ? "text-indigo-200"
                                                : "text-slate-400 dark:text-zinc-500"
                                                }`}
                                        >
                                            {time}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {!isSender && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleShowMessageOptions(e, 'receiver', msg._id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition flex-shrink-0"
                                >
                                    <EllipsisVertical size={14} />
                                </button>
                            )}
                        </div>
                    );
                })
            )}
            <div ref={messagesEndRef} />
        </div>


    )
}
