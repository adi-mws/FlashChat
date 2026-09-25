import React from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../redux/slices/authSlice';
import Message from './Message';
import { Lock } from 'lucide-react';

const getRelativeDateString = (dateString) => {
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
        return "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    } else {
        return d.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

const E2EEInfoBadge = () => (
    <div className="flex justify-center my-4 animate-fade-in select-none">
        <div className="flex items-center gap-2 max-w-[320px] sm:max-w-md px-4 py-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 text-amber-600 dark:text-amber-400/80 text-[10px] font-semibold text-center shadow-sm leading-normal">
            <Lock size={12} className="shrink-0 text-amber-500" />
            <span>
                Messages are end-to-end encrypted. No one outside of this chat, not even FlashChat, can read or listen to them.
            </span>
        </div>
    </div>
);

export default function MessageList({ loading, messages, messagesEndRef, handleShowMessageOptions }) {
    const user = useSelector(selectUser);

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-zinc-950 p-4 sm:p-6 space-y-2">
            {loading ? (
                <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
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
                <>
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-center px-6 py-12 animate-fade-in select-none">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center mb-4">
                                <Lock size={20} />
                            </div>
                            <h3 className="text-slate-800 dark:text-zinc-200 text-sm font-semibold mb-1">End-to-End Encrypted</h3>
                            <p className="text-slate-500 dark:text-zinc-400 text-xs max-w-sm leading-relaxed">
                                Messages and attachments in this chat are secured with end-to-end encryption. No one outside of this chat, not even FlashChat, can read or download them.
                            </p>
                        </div>
                    ) : (
                        <>
                            <E2EEInfoBadge />
                            {messages.map((msg, i) => {
                                const isSender = msg.sender?._id === user.id;
                                const time = new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                });

                                // Determine the message type
                                const type = msg.type || "text";
                                const isMultiLine =
                                    type === "text" && (msg.content?.includes("\n") || (msg.content?.length || 0) > 65);

                                const msgDateStr = new Date(msg.createdAt).toDateString();
                                const prevMsg = i > 0 ? messages[i - 1] : null;
                                const prevMsgDateStr = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
                                const showDateHeader = msgDateStr !== prevMsgDateStr;

                                return (
                                    <React.Fragment key={msg._id || `sending-${i}`}>
                                        {showDateHeader && (
                                            <div className="flex justify-center my-6 sticky top-2 z-10 animate-fade-in">
                                                <span className="px-3.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-zinc-900/90 text-slate-500 dark:text-zinc-400 text-[11px] font-semibold tracking-wide select-none shadow-sm backdrop-blur-sm border border-slate-200/20 dark:border-zinc-800/20">
                                                    {getRelativeDateString(msg.createdAt)}
                                                </span>
                                            </div>
                                        )}
                                        <Message
                                            isSender={isSender}
                                            message={msg}
                                            time={time}
                                            isMultiLine={isMultiLine}
                                            handleShowMessageOptions={handleShowMessageOptions}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </>
                    )}
                </>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
