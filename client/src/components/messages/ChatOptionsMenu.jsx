import React from "react";
import { Users, Trash } from "lucide-react";

/**
 * ChatOptionsMenu
 * Dropdown options menu anchored to the header actions.
 */
export default function ChatOptionsMenu({
  show = false,
  isGroup = false,
  onClose,
  onViewInfo,
  onClearChat,
  onLeaveGroup,
  onDeleteContact,
}) {
  if (!show) return null;

  return (
    <div
      className="absolute right-4 top-[68px] w-48 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-xl rounded-xl z-50 py-1.5 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          onViewInfo?.();
          onClose?.();
        }}
        className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition cursor-pointer"
      >
        <Users size={14} /> {isGroup ? "Group Info" : "Contact Info"}
      </button>

      {!isGroup && onClearChat && (
        <button
          type="button"
          onClick={() => {
            onClearChat?.();
            onClose?.();
          }}
          className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition border-t border-slate-100 dark:border-zinc-800/80 cursor-pointer"
        >
          <Trash size={14} /> Clear Chat
        </button>
      )}

      {isGroup && onLeaveGroup ? (
        <button
          type="button"
          onClick={() => {
            onLeaveGroup?.();
            onClose?.();
          }}
          className="w-full text-left px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2.5 transition border-t border-slate-100 dark:border-zinc-800/80 cursor-pointer"
        >
          <Trash size={14} /> Leave Group
        </button>
      ) : onDeleteContact ? (
        <button
          type="button"
          onClick={() => {
            onDeleteContact?.();
            onClose?.();
          }}
          className="w-full text-left px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2.5 transition border-t border-slate-100 dark:border-zinc-800/80 cursor-pointer"
        >
          <Trash size={14} /> Delete Contact
        </button>
      ) : null}
    </div>
  );
}
