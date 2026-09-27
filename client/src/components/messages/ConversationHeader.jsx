import React from "react";
import { ArrowLeft, EllipsisVertical, Lock, Users } from "lucide-react";
import { getImageUrl } from "../../lib/imageUtils";

/**
 * ConversationHeader
 * Displays chat participant/group information, avatar, live status,
 * E2EE encryption status badge, and action buttons.
 */
export default function ConversationHeader({
  chat,
  chatId,
  onlineUsers = [],
  user,
  onBack,
  onOpenOptions,
  onOpenInfo,
}) {
  if (!chat) return null;

  const isGroup = chat.isGroupChat;
  const isParticipantOnline = !isGroup && chat.participant?._id && onlineUsers.includes(chat.participant._id);
  const displayName = isGroup ? chat.groupName : (chat.participant?.name || "Deleted User");
  const avatarSrc = isGroup ? chat.groupPhoto : chat.participant?.pfp;
  const isEncrypted = (isGroup && chat.participants?.length > 0) || (!isGroup && !!user?.sessionPublicKey);

  return (
    <div className="h-[64px] flex items-center px-4 sm:px-8 bg-white/95 dark:bg-zinc-950/95 border-b border-slate-200/50 dark:border-zinc-900/80 backdrop-blur-md z-10 flex-shrink-0 justify-between">
      <div className="flex gap-4 items-center min-w-0">
        <div className="flex gap-2 items-center flex-shrink-0">
          <ArrowLeft
            className="w-5 h-5 text-slate-600 dark:text-zinc-400 sm:hidden cursor-pointer hover:text-slate-900 dark:hover:text-zinc-200 transition"
            onClick={(e) => {
              e.stopPropagation();
              onBack?.();
            }}
          />
          <div
            className="relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInfo?.();
            }}
          >
            {isGroup && !avatarSrc ? (
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 border border-slate-100 dark:border-zinc-800">
                <Users size={18} />
              </div>
            ) : (
              <img
                src={getImageUrl(avatarSrc)}
                alt={displayName}
                className="w-10 h-10 object-cover rounded-full border border-slate-100 dark:border-zinc-800"
              />
            )}
            {isParticipantOnline && (
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950 absolute bottom-0 right-0 animate-pulse" />
            )}
          </div>
        </div>

        <div
          className="flex flex-col min-w-0 gap-0.5 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onOpenInfo?.();
          }}
        >
          <p className="text-slate-800 dark:text-zinc-100 text-xs font-semibold truncate">
            {displayName}
          </p>
          <div className="text-2xs text-slate-400 dark:text-zinc-500 truncate flex items-center gap-1.5">
            {isGroup ? (
              <span className="font-medium text-slate-500 dark:text-zinc-400">
                {chat.participants?.length || 0} members
              </span>
            ) : isParticipantOnline ? (
              <span className="text-emerald-500 font-medium">Active now</span>
            ) : (
              <span>Offline</span>
            )}

            {isEncrypted && (
              <span className="text-emerald-600 dark:text-emerald-400/80 font-medium flex items-center gap-0.5" title="End-to-End Encrypted">
                • <Lock size={10} className="inline" /> Encrypted
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenOptions?.(e);
        }}
        className="p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer transition"
        title="Chat Options"
      >
        <EllipsisVertical size={20} />
      </button>
    </div>
  );
}
