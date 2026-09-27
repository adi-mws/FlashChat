import React from "react";
import { useSelector } from "react-redux";
import { Check, CheckCheck, Users, Image as ImageIcon, FileText } from "lucide-react";
import { getImageUrl } from "../../../lib/imageUtils";

/**
 * ChatItem
 * Individual conversation row in the chat sidebar list.
 * Displays avatar, online status indicator, last message preview or draft,
 * real-time typing indicators, timestamp, and unread badge.
 */
export default function ChatItem({
  chat,
  isSelected,
  onlineUsers = [],
  user,
  draft,
  onClick,
}) {
  const activeTypers = useSelector(
    (state) => state.chats.typingUsers?.[chat?._id]
  ) || [];
  const hasTypers = activeTypers.length > 0;

  const time = chat.lastMessage
    ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const draftTime = draft?.updatedAt
    ? new Date(draft.updatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const displayName = chat.isGroupChat ? chat.groupName : chat.participant?.name;
  const displayPhoto = chat.isGroupChat ? chat.groupPhoto : chat.participant?.pfp;

  const participantIdStr = chat.participant?._id?.toString();
  const isOnline = !chat.isGroupChat && Boolean(
    participantIdStr && onlineUsers.some((id) => id?.toString() === participantIdStr)
  );

  const groupOnlineCount = chat.isGroupChat
    ? (chat.participants || []).filter((p) => {
        const pId = typeof p === "object" && p !== null ? p._id?.toString() : p?.toString();
        return pId && onlineUsers.some((uId) => uId?.toString() === pId);
      }).length
    : 0;

  return (
    <div
      onClick={onClick}
      className={`chat-list-item flex items-center gap-3.5 px-3 py-2.5 cursor-pointer transition-all duration-200 ${
        isSelected
          ? "bg-indigo-50/70 dark:bg-indigo-950/20 shadow-sm"
          : "hover:bg-slate-100/50 dark:hover:bg-zinc-900/40"
      }`}
    >
      <div className="relative flex-shrink-0">
        {chat.isGroupChat && !chat.groupPhoto ? (
          <div className="h-11 w-11 rounded-full flex items-center justify-center bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 border border-slate-100 dark:border-zinc-800">
            <Users size={20} />
          </div>
        ) : (
          <img
            src={getImageUrl(displayPhoto)}
            className="h-11 w-11 rounded-full object-cover border border-slate-100 dark:border-zinc-800"
            alt={displayName || "Chat"}
          />
        )}
        {(isOnline || (chat.isGroupChat && groupOnlineCount > 0)) && (
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950 absolute bottom-0 right-0" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5">
          <h4
            className={`text-xs font-semibold truncate ${
              isSelected
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-800 dark:text-zinc-200"
            }`}
          >
            {displayName}
          </h4>
          <span className="text-2xs text-slate-400 dark:text-zinc-500 whitespace-nowrap ml-2">
            {draft ? draftTime : chat?.lastMessage && chat?.lastMessage?.createdAt && time}
          </span>
        </div>

        {hasTypers ? (
          <p className="text-xs text-emerald-500 dark:text-emerald-400 font-medium truncate animate-pulse flex items-center gap-1">
            {chat.isGroupChat
              ? activeTypers.length === 1
                ? `${activeTypers[0].userName} is typing...`
                : `${activeTypers.length} people typing...`
              : "typing..."}
          </p>
        ) : (chat?.lastMessage || draft) && user?.showLastMessageInList ? (
          <p className="text-xs text-slate-400 dark:text-zinc-400 flex items-center gap-1 pr-4 min-w-0">
            {draft ? (
              <span className="inline-flex bold dark:text-white items-center gap-1 flex-shrink-0">
                Draft:
              </span>
            ) : chat?.lastMessage?.sender?._id === user?.id ? (
              <span className="inline-flex items-center gap-1 flex-shrink-0">
                {chat.lastMessage.readBy &&
                (!chat.isGroupChat &&
                  (chat.lastMessage.readBy.includes(chat.participant?._id) ||
                    chat.lastMessage.readBy.some(
                      (id) => id.toString() === chat.participant?._id?.toString()
                    ))) ? (
                  <CheckCheck
                    size={14}
                    className="text-indigo-500 dark:text-indigo-400 flex-shrink-0"
                  />
                ) : (
                  <Check size={14} className="text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                )}
                <span className="text-slate-500 dark:text-zinc-300 font-medium flex-shrink-0">
                  You:
                </span>
              </span>
            ) : (
              chat.isGroupChat &&
              chat.lastMessage?.sender?.name && (
                <span className="text-slate-500 dark:text-zinc-300 font-medium flex-shrink-0 truncate max-w-16">
                  {chat.lastMessage.sender.name}:
                </span>
              )
            )}
            <span className="truncate min-w-0 inline-flex items-center gap-1">
              {draft ? (
                draft?.message
              ) : chat?.lastMessage?.type === "image" ? (
                <>
                  <ImageIcon size={13} className="text-slate-400 dark:text-zinc-400 flex-shrink-0" />
                  <span className="truncate">{chat.lastMessage.content ? `Image: ${chat.lastMessage.content}` : "Image"}</span>
                </>
              ) : chat?.lastMessage?.type === "file" ? (
                <>
                  <FileText size={13} className="text-slate-400 dark:text-zinc-400 flex-shrink-0" />
                  <span className="truncate">{chat.lastMessage.fileName || "File"}</span>
                </>
              ) : (
                chat?.lastMessage?.content
              )}
            </span>
          </p>
        ) : (
          <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium truncate">
            {chat.isGroupChat
              ? chat.groupDescription || "No description"
              : `@${chat.participant?.username}`}
          </p>
        )}
      </div>

      {chat.unreadCount > 0 && (
        <span className="flex-shrink-0 bg-indigo-600 text-white font-bold rounded-full min-w-5 h-5 px-1.5 flex justify-center items-center text-[10px] shadow-sm shadow-indigo-500/20">
          {chat.unreadCount}
        </span>
      )}
    </div>
  );
}
