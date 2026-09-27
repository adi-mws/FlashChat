import React from "react";
import { Check, CheckCheck } from "lucide-react";

/**
 * TimeBadge
 * Renders timestamp and status checkmarks (sent / readBy).
 */
export default function TimeBadge({ time, isSender, message, overlay = false }) {
  const isRead = message?.readBy && message.readBy.length > 1;

  return (
    <span
      className={`shrink-0 text-[9px] flex gap-0.5 items-center select-none ${
        overlay
          ? "bg-black/40 px-1.5 py-0.5 rounded-full text-white/90"
          : isSender
          ? "text-indigo-200"
          : "text-slate-400 dark:text-zinc-500"
      }`}
    >
      {time}
      {isSender && (
        isRead ? (
          <CheckCheck size={12} className={overlay ? "text-white/80" : "text-indigo-200"} />
        ) : (
          <Check size={12} className={overlay ? "text-white/80" : "text-indigo-200"} />
        )
      )}
    </span>
  );
}
