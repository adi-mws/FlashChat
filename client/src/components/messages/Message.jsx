import { EllipsisVertical, Check, CheckCheck } from "lucide-react";

export default function Message({ isSender, message, time, isMultiLine, 
    handleShowMessageOptions }) {
    return (
        <div
            className={`w-full flex items-end gap-1.5 group ${isSender ? "justify-end" : "justify-start"}`}
        >
            {isSender && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleShowMessageOptions(e, 'sender', message._id); }}
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
                    } ${message.isSending ? "opacity-60" : ""}`}
            >
                {isMultiLine ? (
                    <>
                        <div className="text-xs whitespace-pre-wrap break-words">
                            {message.content}
                        </div>

                        <div
                            className={`mt-1 text-[9px] text-right flex items-center gap-0.5 ${isSender
                                ? "text-indigo-200 justify-end"
                                : "text-slate-400 dark:text-zinc-500"
                                }`}
                        >
                            {time}
                            {isSender ? (
                                message.readBy && message.readBy.length > 1 ? (
                                    <CheckCheck size={14} className="text-indigo-200" />
                                ) : (
                                    <Check size={14} className="text-indigo-200" />
                                )
                            ) : null}
                        </div>
                    </>
                ) : (
                    <div className="flex items-end gap-2">
                        <span className="text-xs break-words">
                            {message.content}
                        </span>

                        <span
                            className={`shrink-0 text-[9px] flex gap-0.5 items-center ${isSender
                                ? "text-indigo-200 justify-center"
                                : "text-slate-400 dark:text-zinc-500"
                                }`}
                        >
                            {time}
                            {isSender ? (
                                message.readBy && message.readBy.length > 1 ? (
                                    <CheckCheck size={14} className="text-indigo-200" />
                                ) : (
                                    <Check size={14} className="text-indigo-200" />
                                )
                            ) : null}
                        </span>
                    </div>
                )}
            </div>

            {!isSender && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleShowMessageOptions(e, 'receiver', message._id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition flex-shrink-0"
                >
                    <EllipsisVertical size={14} />
                </button>
            )}
        </div>
    )
}
