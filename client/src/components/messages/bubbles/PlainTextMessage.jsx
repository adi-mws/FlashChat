import React from "react";
import TimeBadge from "./TimeBadge";

/**
 * PlainTextMessage
 * Standard text bubble with responsive styling and multi-line support.
 */
export default function PlainTextMessage({ message, isSender, time, isMultiLine }) {
  const bubble = isSender
    ? "bg-primary-2 text-white rounded-br-none"
    : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-100 dark:border-zinc-800/80 rounded-bl-none";

  return (
    <div
      className={`relative max-w-[80%] sm:max-w-[60%] rounded-2xl px-4 py-2.5 shadow-sm ${bubble} ${
        message.isSending ? "opacity-60" : ""
      }`}
    >
      {isMultiLine ? (
        <>
          <div className="text-xs whitespace-pre-wrap break-words">{message.content}</div>
          <div
            className={`mt-1 text-[9px] text-right flex items-center gap-0.5 ${
              isSender ? "text-indigo-200 justify-end" : "text-slate-400 dark:text-zinc-500"
            }`}
          >
            <TimeBadge time={time} isSender={isSender} message={message} />
          </div>
        </>
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-xs break-words">{message.content}</span>
          <TimeBadge time={time} isSender={isSender} message={message} />
        </div>
      )}
    </div>
  );
}
