import React from "react";
import { EllipsisVertical } from "lucide-react";
import PlainTextMessage from "./bubbles/PlainTextMessage";
import ImageMessage from "./bubbles/ImageMessage";
import FileMessage from "./bubbles/FileMessage";

/**
 * Message
 * Decides bubble type (text, image, file), adds hover actions (options trigger),
 * and handles sender vs receiver alignment.
 */
export default function Message({
  isSender,
  message,
  time,
  isMultiLine,
  handleShowMessageOptions,
}) {
  const type = message.type || "text";

  const OptionsBtn = ({ side }) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleShowMessageOptions?.(e, side, message._id);
      }}
      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition flex-shrink-0 cursor-pointer"
      title="Message options"
    >
      <EllipsisVertical size={14} />
    </button>
  );

  return (
    <div
      className={`w-full flex items-end gap-1.5 group ${
        isSender ? "justify-end" : "justify-start"
      }`}
    >
      {isSender && <OptionsBtn side="sender" />}

      {type === "image" ? (
        <ImageMessage message={message} isSender={isSender} time={time} />
      ) : type === "file" ? (
        <FileMessage message={message} isSender={isSender} time={time} />
      ) : (
        <PlainTextMessage
          message={message}
          isSender={isSender}
          time={time}
          isMultiLine={isMultiLine}
        />
      )}

      {!isSender && <OptionsBtn side="receiver" />}
    </div>
  );
}
