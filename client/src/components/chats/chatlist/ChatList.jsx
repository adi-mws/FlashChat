import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import {
  selectChats,
  selectSelectedChat,
  selectOnlineUsers,
  selectLoadingChats,
  setSelectedChat,
  markMessagesRead,
  selectActiveMessage,
  setActiveMessage,
  selectDrafts,
  removeDraft,
  selectActiveAttachements,
  setActiveAttachements,
  saveDraft,
} from "../../../redux/slices/chatsSlice";
import { selectUser } from "../../../redux/slices/authSlice";
import { socket } from "../../../lib/socket";
import { CHAT_ROUTES } from "../../../routes/routes";
import NoChatsFound from "../_components/NoChatsFound";
import ChatListHeader from "./ChatListHeader";
import ChatItem from "./ChatItem";
import CreateGroupModal from "./CreateGroupModal";

export default function ChatList() {
  const dispatch = useDispatch();
  const chats = useSelector(selectChats);
  const selectedChat = useSelector(selectSelectedChat);
  const onlineUsers = useSelector(selectOnlineUsers);
  const loading = useSelector(selectLoadingChats);
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const sideBarRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredChats, setFilteredChats] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const drafts = useSelector(selectDrafts);
  const activeMessage = useSelector(selectActiveMessage);
  const activeAttachements = useSelector(selectActiveAttachements);
  const { chatId: currentChatId } = useParams();

  const handleChatClick = (chat) => {
    dispatch(setSelectedChat(chat._id));
    dispatch(markMessagesRead({ chatId: chat._id, userId: user.id }));

    // Save draft with message and attachments
    if (chat._id && (activeMessage.trim().length > 0 || activeAttachements.length > 0)) {
      dispatch(
        saveDraft({
          chatId: currentChatId,
          message: activeMessage,
          attachments: activeAttachements,
        })
      );
      dispatch(setActiveMessage(""));
      dispatch(setActiveAttachements([]));
    } else {
      dispatch(removeDraft(currentChatId));
    }

    // Emit seen messages via socket
    socket.emit("seenMessage", { chatId: chat._id, userId: user.id });

    // Move to chat page
    navigate(CHAT_ROUTES.chat(chat._id));
  };

  const sortedChats = [...filteredChats].sort((a, b) => {
    const aDraft = drafts.find((d) => d.chatId === a._id);
    const bDraft = drafts.find((d) => d.chatId === b._id);

    // Draft chats always come first
    if (aDraft && !bDraft) return -1;
    if (!aDraft && bDraft) return 1;

    // Otherwise normal newest-message/update ordering
    const timeB = new Date(b.lastMessage?.createdAt || b.updatedAt || 0).getTime();
    const timeA = new Date(a.lastMessage?.createdAt || a.updatedAt || 0).getTime();
    return timeB - timeA;
  });


  useEffect(() => {
    if (!Array.isArray(chats)) {
      setFilteredChats([]);
      return;
    }

    const term = searchTerm.toLowerCase().trim();

    const filtered = chats.filter((chat) => {
      // 1. Text filter
      let matchesSearch = true;
      if (term) {
        if (chat.isGroupChat) {
          matchesSearch = chat.groupName?.toLowerCase().includes(term);
        } else {
          matchesSearch =
            chat.participant?.name?.toLowerCase().includes(term) ||
            chat.participant?.username?.toLowerCase().includes(term);
        }
      }

      // 2. Tab filter
      let matchesTab = true;
      if (selectedFilter === "unread") {
        matchesTab = (chat.unreadCount || 0) > 0;
      } else if (selectedFilter === "groups") {
        matchesTab = !!chat.isGroupChat;
      }

      return matchesSearch && matchesTab;
    });

    setFilteredChats(filtered);
  }, [chats, searchTerm, selectedFilter]);

  return (
    <div
      ref={sideBarRef}
      className="ChatList flex flex-col h-full w-full bg-white dark:bg-zinc-950 border-r border-slate-200/50 dark:border-zinc-900 select-none overflow-hidden"
    >
      <ChatListHeader
        onCreateGroup={() => setShowCreateModal(true)}
      />

      {/* Search Bar */}
      <div className="relative flex items-center px-2 py-2 border-b border-slate-100 dark:border-zinc-900/60 flex-shrink-0">
        <Search className="absolute left-7 text-slate-400 dark:text-zinc-500 w-4 h-4 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search chats..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 dark:bg-zinc-900/70 text-slate-800 dark:text-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all border border-transparent placeholder-slate-400 dark:placeholder-zinc-500"
        />
      </div>

      {/* Filters */}
      <div className="px-2 flex items-center gap-2 my-1 relative">
        {[
          { id: "all", label: "All" },
          { id: "unread", label: "Unread" },
          { id: "groups", label: "Groups" },
        ].map((filter) => {
          const isActive = selectedFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedFilter(filter.id)}
              className={`rounded-xl py-1.5 px-3 text-[11px] font-semibold border transition-colors duration-150 cursor-pointer focus:outline-none select-none ${
                isActive
                  ? "bg-indigo-500 border-indigo-500 text-white shadow-xs"
                  : "border-slate-200/80 dark:border-zinc-800 bg-transparent text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Chat list (scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0 py-1 space-y-1">
        {loading && (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-1/3" />
                  <div className="h-2.5 bg-slate-200 dark:bg-zinc-800 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {sortedChats.length === 0 && !loading ? <NoChatsFound /> : null}

        {!loading &&
          Array.isArray(sortedChats) &&
          sortedChats.map((chat) => (
            <ChatItem
              key={chat._id}
              chat={chat}
              isSelected={selectedChat === chat._id}
              onlineUsers={onlineUsers}
              user={user}
              draft={drafts.find((d) => d.chatId === chat._id)}
              onClick={() => handleChatClick(chat)}
            />
          ))}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
