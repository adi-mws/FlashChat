import React from "react";
import { Paperclip, Send } from "lucide-react";

/*
  ConversationInput
  Handles message typing, auto-resizing textarea, keyboard submission,
  and attachment button triggering.
*/
export default function ConversationInput({
  message = "",
  onChange,
  onSubmit,
  textareaRef,
  attachmentsButtonRef,
  onToggleAttachments,
  isMobile = false,
  placeholder = "Type a message...",
}) {
  return (
    <div className="bg-white dark:bg-zinc-950 border-t border-slate-200/50 dark:border-zinc-900 flex-shrink-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
        className="flex outline-none items-center gap-2.5 max-w-5xl mx-auto bg-slate-100 dark:bg-zinc-900/60 p-1.5 pl-4 border border-transparent transition-all duration-200"
      >
        <button
          ref={attachmentsButtonRef}
          type="button"
          className="mr-3 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggleAttachments?.();
          }}
          title="Add attachment"
        >
          <Paperclip size={15} />
        </button>

        <textarea
          ref={textareaRef}
          autoFocus={true}
          className="flex-1 bg-transparent text-xs outline-none resize-none text-slate-800 dark:text-zinc-100 py-3.25 min-h-[46px] max-h-40 overflow-y-auto placeholder-slate-400 dark:placeholder-zinc-500"
          rows={1}
          placeholder={placeholder}
          value={message}
          onChange={onChange}
          onKeyDown={(e) => {
            if (!isMobile && e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit?.();
            }
          }}
        />

        <button
          type="submit"
          disabled={!message?.trim()}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500 text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-700 hover:bg-indigo-600 transition flex-shrink-0 cursor-pointer"
          title="Send message"
        >
          <Send size={15} fill={message?.trim() ? "white" : "none"} />
        </button>
      </form>
    </div>
  );
}
