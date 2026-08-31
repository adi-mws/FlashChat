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
    <div className="flex justify-center my-3 animate-fade-in">
        <div className="flex items-center gap-2 max-w-[280px] sm:max-w-xs px-3.5 py-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 text-amber-600 dark:text-amber-400/80 text-[10px] font-semibold text-center shadow-3xs leading-normal">
            <Lock size={11} className="shrink-0 text-amber-500" />
            <span>
                Messages are end-to-end encrypted. No one outside of this chat can read them.
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
                                    <div className="flex justify-center my-4 animate-fade-in">
                                        <span className="px-3 py-1 rounded-lg bg-slate-200/60 dark:bg-zinc-800/60 text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wide select-none shadow-3xs">
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
            <div ref={messagesEndRef} />
        </div>
    );
}
