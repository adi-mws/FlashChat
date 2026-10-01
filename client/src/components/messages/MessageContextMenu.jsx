import React from "react";
import { Trash } from "lucide-react";

/*
  MessageContextMenu
  Context menu displayed upon clicking message options (three-dots/long-press).
*/
export default function MessageContextMenu({
  show = false,
  clientX = 0,
  clientY = 0,
  messageId = null,
  onDelete,
  onClose,
}) {
  if (!show || !messageId) return null;

  return (
    <div
      className="fixed w-36 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-xl rounded-xl z-50 py-1.5 animate-scale-in"
      style={{ top: clientY, left: clientX }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          onDelete?.(messageId);
          onClose?.();
        }}
        className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 transition cursor-pointer"
      >
        <Trash size={14} /> Delete
      </button>
    </div>
  );
}
