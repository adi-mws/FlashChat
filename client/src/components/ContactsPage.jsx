import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Plus, UserCheck2, UserMinus2, Send, Search, Check, X, AlertCircle } from 'lucide-react';
import { getImageUrl } from '../utils/imageUtils';
import { useNotification } from '../hooks/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/ChatsContext';

export default function ContactsPage() {
  const [selectedTab, setSelectedTab] = useState('received');
  const [searchQuery, setSearchQuery] = useState('');
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [newUserResult, setNewUserResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { setChats, socket } = useChat();

  const fetchIncoming = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/friends/requests`, { withCredentials: true });
      setIncomingRequests(res.data.requests || []);
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
      if (res.status === 200) {
        setSentRequests(res.data.sentRequests || []);

      }
      else {
        showNotification('Failed to load sent requests.', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to load sent requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  // Clean socket connection listeners using useEffect
  useEffect(() => {
    if (!socket) return;

    const handleIncomingFriendRequest = (data) => {
      setIncomingRequests(prev => {
        if (prev.some(req => req._id === data._id || req.from?._id === data.from?._id)) return prev;
        return [data, ...prev];
      });
      showNotification("info", `New friend request from @${data.from.username}`);
    };

    const handleFriendRequestAccepted = (data) => {
      showNotification("success", `${data.name || data.username} accepted your friend request`);
      setChats(prev => {
        if (prev.some(c => c._id === data.chat._id)) return prev;
        return [data.chat, ...prev];
      });
      setSentRequests(prev => prev.filter(req => req.to?._id !== data._id));
    };

    const handleFriendRequestRejected = (data) => {
      setSentRequests(prev => prev.filter(req => req.to?._id !== data._id));
    };

    const handleFriendRequestCancelled = (data) => {
      setIncomingRequests(prev => prev.filter(req => req.from?._id !== data._id));
    };

    socket.on("incomingFriendRequest", handleIncomingFriendRequest);
    socket.on("friendRequestAccepted", handleFriendRequestAccepted);
    socket.on("friendRequestRejected", handleFriendRequestRejected);
    socket.on("friendRequestCancelled", handleFriendRequestCancelled);

    return () => {
      socket.off("incomingFriendRequest", handleIncomingFriendRequest);
      socket.off("friendRequestAccepted", handleFriendRequestAccepted);
      socket.off("friendRequestRejected", handleFriendRequestRejected);
      socket.off("friendRequestCancelled", handleFriendRequestCancelled);
    };
  }, [socket, setChats, showNotification]);

  const sendRequest = async (toUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/request`, { toUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification("success", 'Friend request sent!');
        setNewUserResult(prev => prev.filter(item => item._id !== toUserId));
      }
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Error sending request.', 'error');
    }
  };

  const acceptRequest = async (fromUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/accept`, { fromUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification("success", 'Friend request accepted!');
        setChats(prev => {
          if (prev.some(c => c._id === response.data.chat._id)) return prev;
          return [...prev, response.data.chat];
        });
        setIncomingRequests(prev => prev.filter(item => item.from?._id !== fromUserId));
      }
    } catch (err) {
      console.error(err);
      showNotification('Error accepting request.', 'error');
    }
  };

  const rejectRequest = async (fromUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/reject`, { fromUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification("info", 'Friend request declined');
        setIncomingRequests(prev => prev.filter(item => item.from?._id !== fromUserId));
      }
    } catch (err) {
      console.error(err);
      showNotification('Error declining request.', 'error');
    }
  };

  const cancelSentRequest = async (toUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/cancel`, { toUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification("info", 'Cancelled friend request');
        setSentRequests(prev => prev.filter(request => request.to?._id !== toUserId));
      }
    } catch (err) {
      console.error(err);
      showNotification('Error cancelling request.', 'error');
    }
  };

  const filteredData = (dataList) => {
    if (!searchQuery.trim()) return dataList;
    const search = searchQuery.toLowerCase();
    return dataList.filter(req => {
      const targetUser = selectedTab === 'received' ? req.from : req.to;
      return (
        targetUser?.name?.toLowerCase().includes(search) ||
        targetUser?.username?.toLowerCase().includes(search)
      );
    });
  };

  const renderContent = () => {
    const data = selectedTab === 'received'
      ? filteredData(incomingRequests)
      : selectedTab === 'sent'
        ? filteredData(sentRequests)
        : [];

    if (selectedTab === 'new') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-slate-100/60 dark:bg-zinc-800/40 rounded-xl border border-slate-200/40 dark:border-zinc-800/60">
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed flex items-start gap-2">
              <AlertCircle size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>Search for users by their username below. Once you send a request, they can accept it to establish a conversation.</span>
            </p>
          </div>

          {loading && (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!loading && newUserResult && newUserResult.map(u => (
            <div
              key={u._id}
              className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 flex items-center justify-between p-4 rounded-2xl shadow-sm animate-scale-in"
            >
              <div className="flex gap-3.5 items-center min-w-0">
                <img
                  src={getImageUrl(u.pfp)}
                  alt={u.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-zinc-800"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">{u.name}</p>
                  <p className="text-xs text-indigo-500 font-medium">@{u.username}</p>
                </div>
              </div>
              <button
                onClick={() => sendRequest(u._id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-medium text-xs rounded-xl shadow-sm transition flex-shrink-0 cursor-pointer"
              >
                <Plus size={14} /> Send Request
              </button>
            </div>
          ))}

          {!loading && newUserResult && newUserResult.length === 0 && (
            <div className="text-center p-8 text-slate-400 dark:text-zinc-500">
              No matching users found
            </div>
          )}

          {message && !newUserResult && (
            <div className="text-center text-sm text-red-500 font-medium mt-4">
              {message}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {loading && (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {/* {console.log(data)} */}
        {!loading && data.map((req) => {
          const targetUser = selectedTab === 'received' ? req : req;
          // console.log(req.from, req.to)
          if (!targetUser) return null;

          return (
            <div
              key={req._id}
              className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 flex items-center justify-between p-4 rounded-2xl shadow-sm animate-scale-in"
            >
              <div className="flex gap-3.5 items-center min-w-0">
                <img
                  src={getImageUrl(targetUser.pfp)}
                  alt={targetUser.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-zinc-800"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">{targetUser.name}</p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">@{targetUser.username}</p>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {selectedTab === 'received' && (
                  <>
                    <button
                      onClick={() => acceptRequest(targetUser._id)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl transition cursor-pointer"
                      title="Accept Request"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => rejectRequest(targetUser._id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer"
                      title="Decline Request"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
                {selectedTab === 'sent' && (
                  <button
                    onClick={() => cancelSentRequest(targetUser._id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-medium text-xs rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900"
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {!loading && data.length === 0 && (
          <div className="text-center p-12 text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/20">
            {selectedTab === 'received' ? (
              <div className="flex flex-col items-center gap-2">
                <UserCheck2 size={28} className="text-slate-300 dark:text-zinc-700" />
                <p className="text-xs">No pending friend requests</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Send size={28} className="text-slate-300 dark:text-zinc-700" />
                <p className="text-xs">No sent friend requests pending</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const hasNewFriendRequests = incomingRequests.length > 0;

  return (
    <div className="w-full h-full flex flex-col bg-slate-50/50 dark:bg-zinc-950/40 overflow-y-auto animate-fade-in">

      {/* Header */}
      <div className="h-[64px] flex items-center px-4 sm:px-8 border-b border-slate-200/50 dark:border-zinc-900 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md sticky top-0 z-10 gap-3">
        <button
          onClick={() => navigate('/chats')}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
          title="Back to Chats"
        >
          <ArrowLeft size={20} />
        </button>
        <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">
          Contacts & Friends
        </h3>
      </div>

      {/* Main Body */}
      <div className="max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 dark:bg-zinc-900/60 p-1 rounded-2xl border border-slate-200/20 dark:border-zinc-800/40">
          {[
            { id: 'received', label: 'Requests' },
            { id: 'sent', label: 'Sent Requests' },
            { id: 'new', label: 'Add Contacts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setSelectedTab(tab.id); setSearchQuery(''); }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition duration-150 relative cursor-pointer ${selectedTab === tab.id
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
            >
              {tab.label}
              {tab.id === 'received' && hasNewFriendRequests && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-800 animate-ping"></span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar Container */}
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={selectedTab === 'new' ? "Type username to search..." : "Search requests..."}
            className="w-full pl-11 pr-4 py-3 text-sm bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition duration-150 placeholder-slate-400 dark:placeholder-zinc-500"
          />
        </div>

        {/* Contents List */}
        <div className="min-h-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
