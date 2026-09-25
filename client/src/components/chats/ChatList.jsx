import React, { useEffect, useState, useRef } from 'react';
import ChatListHeader from './ChatListHeader';
import { useSelector, useDispatch } from 'react-redux';
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
} from '../../redux/slices/chatsSlice';
import { selectUser } from '../../redux/slices/authSlice';
import { useNavigate, useParams } from 'react-router-dom';
import { getImageUrl } from '../../lib/imageUtils';
import { Search, Check, CheckCheck, Plus, Users } from 'lucide-react';
import { socket } from '../../lib/socket';
import { CHAT_ROUTES } from '../../../routes/routes';
import NoChatsFound from './NoChatsFound';
import CreateGroupModal from './CreateGroupModal';
import JoinGroupModal from './JoinGroupModal';

export default function ChatList() {
  const dispatch = useDispatch();
  const chats = useSelector(selectChats);
  const selectedChat = useSelector(selectSelectedChat);
  const onlineUsers = useSelector(selectOnlineUsers);
  const loading = useSelector(selectLoadingChats);
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const sideBarRef = useRef(null);
  const dropdownRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredChats, setFilteredChats] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const drafts = useSelector(selectDrafts);
  const activeMessage = useSelector(selectActiveMessage);
  const activeAttachements = useSelector(selectActiveAttachements);
  const { chatId: currentChatId } = useParams();

  const handleChatClick = (chat) => {
    dispatch(setSelectedChat(chat._id));
    dispatch(markMessagesRead({ chatId: chat._id, userId: user.id }));
    // save draft with message and attachements 
    if (chat._id && (activeMessage.trim().length > 0 || activeAttachements.length > 0)) {

      dispatch(saveDraft({
        chatId: currentChatId,
        message: activeMessage,
        attachments: activeAttachements,
      }))

      dispatch(setActiveMessage(""));
      dispatch(setActiveAttachements([]));
    } else {
      dispatch(removeDraft(currentChatId));
    }


    // Emit seen messages via socket
    socket.emit('seenMessage', { chatId: chat._id, userId: user.id });

    // moves to another chat page
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
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowGroupOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = searchTerm.trim().toLowerCase();
    const filtered = chats.filter((chat) => {
      // 1. Search criteria
      let matchesSearch = false;
      if (chat.isGroupChat) {
        const groupName = chat.groupName?.toLowerCase() || '';
        const groupDesc = chat.groupDescription?.toLowerCase() || '';
        matchesSearch = groupName.includes(search) || groupDesc.includes(search);
      } else {
        const name = chat?.participant?.name?.toLowerCase() || '';
        const username = chat?.participant?.username?.toLowerCase() || '';
        matchesSearch = name.includes(search) || username.includes(search);
      }

      if (!matchesSearch) return false;

      // 2. Filter tabs
      if (selectedFilter === 'unread') {
        return chat.unreadCount > 0;
      }
      if (selectedFilter === 'groups') {
        return chat.isGroupChat === true;
      }
      return true;
    });
    setFilteredChats(filtered);
  }, [chats, searchTerm, selectedFilter]);



  return (
    <div
      ref={sideBarRef}
      className="chats-list bg-white dark:bg-zinc-950 h-full border-r border-slate-200/60 dark:border-zinc-900/80 flex flex-col"
    >
      {/* Header */}
      <ChatListHeader />

      {/* Search bar */}
      <div className="px-1 py-2.5 relative">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
          <Search size={16} />
        </div>
        <input
          type="text"
          placeholder="Search chats..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 hover:bg-slate-200/50 focus:bg-white dark:bg-zinc-900 dark:hover:bg-zinc-900/80 dark:focus:bg-zinc-900 dark:text-zinc-200 rounded-xl outline-none border border-transparent focus:border-indigo-500/30 dark:focus:border-indigo-500/20 transition-all duration-200 placeholder-slate-400 dark:placeholder-zinc-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="px-1 flex items-center gap-2 my-1 relative">
        <button onClick={() => setSelectedFilter('all')} className={`outline-0 rounded-xl py-1.5 px-3 text-[11px] font-semibold transition ${selectedFilter === 'all' ? 'bg-indigo-500 text-white shadow-sm' : 'border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400'}`}>All</button>
        <button onClick={() => setSelectedFilter('unread')} className={`outline-0 rounded-xl py-1.5 px-3 text-[11px] font-semibold transition ${selectedFilter === 'unread' ? 'bg-indigo-500 text-white shadow-sm' : 'border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400'}`}>Unread</button>
        <button onClick={() => setSelectedFilter('groups')} className={`outline-0 rounded-xl py-1.5 px-3 text-[11px] font-semibold transition ${selectedFilter === 'groups' ? 'bg-indigo-500 text-white shadow-sm' : 'border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400'}`}>Groups</button>
        
        {/* Plus / Create Group Button */}
        <div ref={dropdownRef} className="relative ml-auto">
          <button onClick={() => setShowGroupOptions(!showGroupOptions)} className="rounded-xl border border-slate-200 dark:border-zinc-800 text-xs p-2 hover:bg-slate-100 dark:hover:bg-zinc-900 transition text-slate-600 dark:text-zinc-400 cursor-pointer">
            <Plus size={16} />
          </button>
          
          {showGroupOptions && (
            <div className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-xl shadow-lg py-1.5 z-50 animate-scale-in">
              <button
                onClick={() => { setShowCreateModal(true); setShowGroupOptions(false); }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                Create Group Chat
              </button>
              <button
                onClick={() => { setShowJoinModal(true); setShowGroupOptions(false); }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                Join Group
              </button>
            </div>
          )}
        </div>
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

        {!loading && Array.isArray(sortedChats) && sortedChats.map((chat) => {
          const isSelected = selectedChat === chat._id;
          const time = chat.lastMessage ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }) : null;

          const draft = drafts.find(
            draft => draft.chatId === chat._id
          );

          const draftTime = draft?.updatedAt
            ? new Date(draft.updatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
            : null;

          // Helper definitions for Group vs DM
          const displayName = chat.isGroupChat ? chat.groupName : chat.participant?.name;
          const displayPhoto = chat.isGroupChat ? chat.groupPhoto : chat.participant?.pfp;
          const isOnline = !chat.isGroupChat && onlineUsers.includes(chat.participant?._id);

          return (
            <div
              key={chat._id}
              onClick={() => handleChatClick(chat)}
              className={`chat-list-item flex items-center gap-3.5 px-3 py-2.5 cursor-pointer transition-all duration-200 ${isSelected
                ? 'bg-indigo-50/70 dark:bg-indigo-950/20 shadow-sm'
                : 'hover:bg-slate-100/50 dark:hover:bg-zinc-900/40'
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
                    alt={displayName || 'Chat'}
                  />
                )}
                {isOnline && (
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950 absolute bottom-0 right-0" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-0.5">
                  <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-zinc-200'}`}>
                    {displayName}
                  </h4>
                  <span className="text-2xs text-slate-400 dark:text-zinc-500 whitespace-nowrap ml-2">
                    {draft ? draftTime : chat?.lastMessage && chat?.lastMessage?.createdAt && time}
                  </span>
                </div>

                {(chat?.lastMessage || draft) && user?.showLastMessageInList ? (
                  <p className="text-xs text-slate-400 dark:text-zinc-400 flex items-center gap-1 pr-4 min-w-0">
                    {draft ?
                      (<span className="inline-flex bold dark:text-white items-center gap-1 flex-shrink-0">
                        Draft:
                      </span>)
                      :
                      (chat?.lastMessage?.sender?._id === user?.id ? (
                        <span className="inline-flex items-center gap-1 flex-shrink-0">
                          {chat.lastMessage.readBy && (
                            !chat.isGroupChat && (
                              chat.lastMessage.readBy.includes(chat.participant?._id) ||
                              chat.lastMessage.readBy.some(id => id.toString() === chat.participant?._id?.toString())
                            )
                          ) ? (
                            <CheckCheck size={14} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                          ) : (
                            <Check size={14} className="text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                          )}
                          <span className="text-slate-500 dark:text-zinc-300 font-medium flex-shrink-0">You:</span>
                        </span>
                      ) : (
                        chat.isGroupChat && chat.lastMessage?.sender?.name && (
                          <span className="text-slate-500 dark:text-zinc-300 font-medium flex-shrink-0 truncate max-w-16">
                            {chat.lastMessage.sender.name}:
                          </span>
                        )
                      ))}
                    <span className="truncate min-w-0">{draft ? draft?.message : chat?.lastMessage?.content}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium truncate">
                    {chat.isGroupChat ? chat.groupDescription || 'No description' : `@${chat.participant?.username}`}
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
        })}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} />}
      {showJoinModal && <JoinGroupModal onClose={() => setShowJoinModal(false)} />}
    </div>
  );
}
