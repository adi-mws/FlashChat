import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Plus, UserCheck2, UserMinus2, Send, Search, Check, X, AlertCircle, MessageSquare, Users } from 'lucide-react';
import { getImageUrl } from '../../lib/imageUtils';
import { useNotification } from '../../hooks/useNotification';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectChats, selectSelectedChat, selectOnlineUsers, setSelectedChat, prependChat } from '../../redux/slices/chatsSlice';
import { CHAT_ROUTES } from '../../../routes/routes';
import AppHeader from '../layout/AppHeader';
import Loading from '../global/Loading';
import { socket } from '../../lib/socket';

export default function ContactsPage() {
  const dispatch = useDispatch();
  const [selectedTab, setSelectedTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [newUserResult, setNewUserResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const chats = useSelector(selectChats);
  const onlineUsers = useSelector(selectOnlineUsers);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/friends/list`, { withCredentials: true });
      setFriendsList(res.data.friends || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load friends list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchIncoming = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/friends/requests`, { withCredentials: true });
      setIncomingRequests(res.data || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load friend requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSent = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/friends/sent`, { withCredentials: true });
      if (res.status === 200) setSentRequests(res.data.sentRequests || []);
      else showNotification('Failed to load sent requests.', 'error');
    } catch (err) {
      console.error(err);
      showNotification('Failed to load sent requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (friendId) => {
    const chat = chats.find((c) => c.participant?._id === friendId);
    if (chat) {
      dispatch(setSelectedChat(chat._id));
      navigate(CHAT_ROUTES.chat(chat._id));
    } else {
      showNotification('Could not find chat session with this contact.', 'error');
    }
  };

  useEffect(() => {
    if (selectedTab === 'friends') fetchFriends();
    if (selectedTab === 'received') fetchIncoming();
    if (selectedTab === 'sent') fetchSent();
  }, [selectedTab]);

  useEffect(() => {
    const searchNewUser = async () => {
      if (selectedTab === 'new' && searchQuery.trim()) {
        try {
          setLoading(true);
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/get-users?username=${searchQuery}`, { withCredentials: true });
          setNewUserResult(res.data.users || []);
          setMessage('');
        } catch (err) {
          console.error(err);
          setNewUserResult([]);
          setMessage('User not found.');
        } finally {
          setLoading(false);
        }
      } else {
        setNewUserResult(null);
        setMessage('');
      }
    };
    const delay = setTimeout(searchNewUser, 400);
    return () => clearTimeout(delay);
  }, [searchQuery, selectedTab]);

  // Socket listeners for real-time friend requests
  useEffect(() => {
    if (!socket) return;

    const handleIncomingFriendRequest = (data) => {
      setIncomingRequests((prev) => {
        if (prev.some((req) => req._id === data._id || req.from?._id === data.from?._id)) return prev;
        return [data, ...prev];
      });
      showNotification('info', `New friend request from @${data.from.username}`);
    };

    const handleFriendRequestAccepted = (data) => {
      showNotification('success', `${data.name || data.username} accepted your friend request`);
      dispatch(prependChat(data.chat));
      setSentRequests((prev) => prev.filter((req) => req?._id !== data._id));
      fetchFriends();
    };

    const handleFriendRequestRejected = (data) => {
      setSentRequests((prev) => prev.filter((req) => req?._id !== data._id));
    };

    const handleFriendRequestCancelled = (data) => {
      setIncomingRequests((prev) => prev.filter((req) => req.from?._id !== data._id));
    };

    socket.on('incomingFriendRequest', handleIncomingFriendRequest);
    socket.on('friendRequestAccepted', handleFriendRequestAccepted);
    socket.on('friendRequestRejected', handleFriendRequestRejected);
    socket.on('friendRequestCancelled', handleFriendRequestCancelled);

    return () => {
      socket.off('incomingFriendRequest', handleIncomingFriendRequest);
      socket.off('friendRequestAccepted', handleFriendRequestAccepted);
      socket.off('friendRequestRejected', handleFriendRequestRejected);
      socket.off('friendRequestCancelled', handleFriendRequestCancelled);
    };
  }, [socket, dispatch]);

  const sendRequest = async (toUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/request`, { toUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification('success', 'Friend request sent!');
        setNewUserResult((prev) => prev.filter((item) => item._id !== toUserId));
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error sending request.', 'error');
    }
  };

  const acceptRequest = async (fromUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/accept`, { fromUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification('success', 'Friend request accepted!');
        dispatch(prependChat(response.data.chat));
        setIncomingRequests((prev) => prev.filter((item) => item?._id !== fromUserId));
        fetchFriends();
      }
    } catch (err) {
      showNotification('Error accepting request.', 'error');
    }
  };

  const rejectRequest = async (fromUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/reject`, { fromUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification('info', 'Friend request declined');
        setIncomingRequests((prev) => prev.filter((item) => item?._id !== fromUserId));
      }
    } catch (err) {
      showNotification('Error declining request.', 'error');
    }
  };

  const cancelSentRequest = async (toUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/cancel`, { toUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification('info', 'Cancelled friend request');
        setSentRequests((prev) => prev.filter((request) => request?._id !== toUserId));
      }
    } catch (err) {
      showNotification('Error cancelling request.', 'error');
    }
  };

  const filteredData = (dataList) => {
    if (!searchQuery.trim()) return dataList;
    const search = searchQuery.toLowerCase();
    return dataList.filter((req) => (
      req?.name?.toLowerCase().includes(search) ||
      req?.username?.toLowerCase().includes(search)
    ));
  };

  const renderContent = () => {
    if (selectedTab === 'friends') {
      const data = filteredData(friendsList);
      return (
        <div className="space-y-3">
          {loading && <Loading />}
          {!loading && data.map((friend) => (
            <div key={friend._id} className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 flex items-center justify-between p-4 rounded-2xl shadow-sm animate-scale-in">
              <div className="flex gap-3.5 items-center min-w-0">
                <div className="relative flex-shrink-0">
                  <img src={getImageUrl(friend.pfp)} alt={friend.name} className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-zinc-800" />
                  <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${onlineUsers.includes(friend._id) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">{friend.name}</p>
                  <p className="text-xs text-indigo-500 font-medium">@{friend.username}</p>
                  {friend.about && <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate max-w-[180px] sm:max-w-[300px] mt-0.5">{friend.about}</p>}
                </div>
              </div>
              <button onClick={() => handleStartChat(friend._id)} className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-sm transition flex-shrink-0 cursor-pointer">
                <MessageSquare size={14} /> <span>Message</span>
              </button>
            </div>
          ))}
          {!loading && data.length === 0 && (
            <div className="text-center p-12 text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/20">
              <div className="flex flex-col items-center gap-2"><Users size={28} className="text-slate-300 dark:text-zinc-700" /><p className="text-xs">No contacts found</p></div>
            </div>
          )}
        </div>
      );
    }

    const data = selectedTab === 'received' ? filteredData(incomingRequests) : selectedTab === 'sent' ? filteredData(sentRequests) : [];

    if (selectedTab === 'new') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-slate-100/60 dark:bg-zinc-800/40 rounded-xl border border-slate-200/40 dark:border-zinc-800/60">
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed flex items-start gap-2">
              <AlertCircle size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>Search for users by their username below. Once you send a request, they can accept it to establish a conversation.</span>
            </p>
          </div>
          {loading && <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}
          {!loading && newUserResult && newUserResult.map((u) => (
            <div key={u._id} className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 flex items-center justify-between p-4 rounded-2xl shadow-sm animate-scale-in">
              <div className="flex gap-3.5 items-center min-w-0">
                <img src={getImageUrl(u.pfp)} alt={u.name} className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-zinc-800" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">{u.name}</p>
                  <p className="text-xs text-indigo-500 font-medium">@{u.username}</p>
                </div>
              </div>
              <button onClick={() => sendRequest(u._id)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-medium text-xs rounded-xl shadow-sm transition flex-shrink-0 cursor-pointer">
                <Plus size={14} /> Send Request
              </button>
            </div>
          ))}
          {!loading && newUserResult && newUserResult.length === 0 && <div className="text-center p-8 text-slate-400 dark:text-zinc-500">No matching users found</div>}
          {message && !newUserResult && <div className="text-center text-sm text-red-500 font-medium mt-4">{message}</div>}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {loading && <Loading />}
        {!loading && data.map((req) => {
          const targetUser = req;
          if (!targetUser) return null;
          return (
            <div key={req._id} className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 flex items-center justify-between p-4 rounded-2xl shadow-sm animate-scale-in">
              <div className="flex gap-3.5 items-center min-w-0">
                <img src={getImageUrl(targetUser.pfp)} alt={targetUser.name} className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-zinc-800" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">{targetUser.name}</p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">@{targetUser.username}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {selectedTab === 'received' && (
                  <>
                    <button onClick={() => acceptRequest(targetUser._id)} className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl transition cursor-pointer"><Check size={16} /></button>
                    <button onClick={() => rejectRequest(targetUser._id)} className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer"><X size={16} /></button>
                  </>
                )}
                {selectedTab === 'sent' && (
                  <button onClick={() => cancelSentRequest(targetUser._id)} className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-medium text-xs rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900">Cancel Request</button>
                )}
              </div>
            </div>
          );
        })}
        {!loading && data.length === 0 && (
          <div className="text-center p-12 text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/20">
            {selectedTab === 'received' ? (
              <div className="flex flex-col items-center gap-2"><UserCheck2 size={28} className="text-slate-300 dark:text-zinc-700" /><p className="text-xs">No pending friend requests</p></div>
            ) : (
              <div className="flex flex-col items-center gap-2"><Send size={28} className="text-slate-300 dark:text-zinc-700" /><p className="text-xs">No sent friend requests pending</p></div>
            )}
          </div>
        )}
      </div>
    );
  };

  const hasNewFriendRequests = incomingRequests.length > 0;

  return (
    <div className="w-full h-full flex flex-col bg-slate-50/50 dark:bg-zinc-950/40 overflow-y-auto animate-fade-in">
      <AppHeader title={"Contacts"}>
        <div className="relative max-w-[180px] sm:max-w-xs w-full mr-2">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500"><Search size={14} /></div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={selectedTab === 'new' ? 'Search username...' : selectedTab === 'friends' ? 'Search contacts...' : 'Search requests...'}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 rounded-xl border border-slate-200 dark:border-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400 dark:placeholder-zinc-500 shadow-sm"
          />
        </div>
      </AppHeader>

      <div className="max-w-2xl w-full mx-auto p-4 space-y-6">
        <div className="flex bg-slate-100 dark:bg-zinc-900/60 p-1 rounded-2xl">
          {[
            { id: 'friends', label: 'My Contacts' },
            { id: 'received', label: 'Requests' },
            { id: 'sent', label: 'Sent Requests' },
            { id: 'new', label: 'Add Contacts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setSelectedTab(tab.id); setSearchQuery(''); }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition duration-150 relative cursor-pointer ${selectedTab === tab.id ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'}`}
            >
              {tab.label}
              {tab.id === 'received' && hasNewFriendRequests && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-800 animate-ping"></span>
              )}
            </button>
          ))}
        </div>
        <div className="min-h-0">{renderContent()}</div>
      </div>
    </div>
  );
}
