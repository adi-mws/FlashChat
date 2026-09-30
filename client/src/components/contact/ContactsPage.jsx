import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Check, X, AlertCircle, MessageSquare, Users, UserPlus2, Clock } from 'lucide-react';
import { getImageUrl } from '../../lib/imageUtils';
import { useNotification } from '../../hooks/useNotification';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectChats, selectOnlineUsers, setSelectedChat, prependChat } from '../../redux/slices/chatsSlice';
import { CHAT_ROUTES } from '../../../routes/routes';
import AppHeader from '../layout/AppHeader';
import Loading from '../global/Loading';
import { socket } from '../../lib/socket';

function formatTimeAgo(dateString) {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export default function ContactsPage() {
  const dispatch = useDispatch();
  const [params, setSearchParams] = useSearchParams();
  const rawTab = params.get('tab')?.toLowerCase();
  const selectedTab = ['friends', 'requests', 'received', 'sent', 'discover'].includes(rawTab)
    ? (rawTab === 'received' || rawTab === 'sent' ? 'requests' : rawTab)
    : 'friends';

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
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/friends/list`, {
        withCredentials: true
      });
      setFriendsList(res.data.friends || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load friends list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      const [resIncoming, resSent] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/user/friends/requests`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/user/friends/sent`, { withCredentials: true })
      ]);
      setIncomingRequests(resIncoming.data || []);
      setSentRequests(resSent.data.sentRequests || []);
    } catch (err) {
      console.error(err);
      showNotification('Failed to load requests.', 'error');
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

  // Fetch initial incoming count for badge on mount
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/user/friends/requests`, { withCredentials: true })
      .then((res) => setIncomingRequests(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch tab data when active tab changes
  useEffect(() => {
    switch (selectedTab) {
      case 'friends':
        fetchFriends();
        break;
      case 'requests':
        fetchAllRequests();
        break;
    }
  }, [selectedTab]);

  // Discover user search
  useEffect(() => {
    const searchNewUser = async () => {
      if (selectedTab === 'discover' && searchQuery.trim()) {
        try {
          setLoading(true);
          const res = await axios.get(
            `${import.meta.env.VITE_API_URL}/user/get-users?username=${searchQuery}`,
            { withCredentials: true }
          );
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

  // Socket listeners for real-time friend requests and acceptance
  useEffect(() => {
    if (!socket) return;

    const handleIncomingFriendRequest = (data) => {
      setIncomingRequests((prev) => {
        if (prev.some((req) => req._id === data._id)) return prev;
        return [data, ...prev];
      });
      showNotification(`New friend request from @${data.username}`, 'info');
    };

    const handleFriendRequestAccepted = (data) => {
      showNotification(`${data.name || data.username} accepted your friend request!`, 'success');
      if (data.chat) {
        dispatch(prependChat(data.chat));
      }
      setSentRequests((prev) => prev.filter((req) => req?._id !== data._id));

      const newFriend = data.friend || data;
      setFriendsList((prev) => [newFriend, ...prev.filter((f) => f._id !== data._id)]);
      fetchFriends();
    };

    const handleContactAdded = (data) => {
      if (data.friend) {
        setFriendsList((prev) => [data.friend, ...prev.filter((f) => f._id !== data.friend._id)]);
      }
      fetchFriends();
    };

    const handleFriendRequestRejected = (data) => {
      setSentRequests((prev) => prev.filter((req) => req?._id !== data._id));
    };

    const handleFriendRequestCancelled = (data) => {
      setIncomingRequests((prev) => prev.filter((req) => req._id !== data._id));
    };

    socket.on('incomingFriendRequest', handleIncomingFriendRequest);
    socket.on('friendRequestAccepted', handleFriendRequestAccepted);
    socket.on('contactAdded', handleContactAdded);
    socket.on('friendRequestRejected', handleFriendRequestRejected);
    socket.on('friendRequestCancelled', handleFriendRequestCancelled);

    return () => {
      socket.off('incomingFriendRequest', handleIncomingFriendRequest);
      socket.off('friendRequestAccepted', handleFriendRequestAccepted);
      socket.off('contactAdded', handleContactAdded);
      socket.off('friendRequestRejected', handleFriendRequestRejected);
      socket.off('friendRequestCancelled', handleFriendRequestCancelled);
    };
  }, [socket, dispatch, showNotification]);

  const sendRequest = async (toUserId) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/user/friends/request`,
        { toUserId },
        { withCredentials: true }
      );
      if (response.status === 200) {
        showNotification('Friend request sent!', 'success');
        setNewUserResult((prev) => prev.filter((item) => item._id !== toUserId));
        // Add to sent requests in state with current timestamp
        setSentRequests((prev) => [
          { _id: toUserId, createdAt: new Date() },
          ...prev.filter((item) => item._id !== toUserId)
        ]);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error sending request.', 'error');
    }
  };

  const acceptRequest = async (fromUserId) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/user/friends/accept`,
        { fromUserId },
        { withCredentials: true }
      );
      if (response.status === 200) {
        showNotification('Friend request accepted!', 'success');
        if (response.data.chat) {
          dispatch(prependChat(response.data.chat));
        }

        // Live removal from incoming requests
        setIncomingRequests((prev) => prev.filter((item) => item?._id !== fromUserId));

        // Live addition to contacts list
        const acceptedFriend =
          response.data.friend || incomingRequests.find((r) => r._id === fromUserId);
        if (acceptedFriend) {
          setFriendsList((prev) => [
            acceptedFriend,
            ...prev.filter((item) => item._id !== fromUserId)
          ]);
        }
        fetchFriends();
      }
    } catch (err) {
      showNotification('Error accepting request.', 'error');
    }
  };

  const rejectRequest = async (fromUserId) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/user/friends/reject`,
        { fromUserId },
        { withCredentials: true }
      );
      if (response.status === 200) {
        showNotification('Friend request declined', 'info');
        setIncomingRequests((prev) => prev.filter((item) => item?._id !== fromUserId));
      }
    } catch (err) {
      showNotification('Error declining request.', 'error');
    }
  };

  const cancelSentRequest = async (toUserId) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/user/friends/cancel`,
        { toUserId },
        { withCredentials: true }
      );
      if (response.status === 200) {
        showNotification('Cancelled friend request', 'info');
        setSentRequests((prev) => prev.filter((request) => request?._id !== toUserId));
      }
    } catch (err) {
      showNotification('Error cancelling request.', 'error');
    }
  };

  const filteredData = (dataList) => {
    if (!searchQuery.trim()) return dataList;
    const search = searchQuery.toLowerCase();
    return dataList.filter(
      (req) =>
        req?.name?.toLowerCase().includes(search) ||
        req?.username?.toLowerCase().includes(search)
    );
  };

  const renderContent = () => {
    // 1. My Contacts Tab
    if (selectedTab === 'friends') {
      const data = filteredData(friendsList);
      return (
        <div className="space-y-3">
          {loading && <Loading />}
          {!loading &&
            data.map((friend) => (
              <div
                key={friend._id}
                className="border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between p-4 rounded-2xl animate-scale-in transition-colors hover:border-slate-300 dark:hover:border-zinc-700"
              >
                <div className="flex gap-3.5 items-center min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      src={getImageUrl(friend.pfp)}
                      alt={friend.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-zinc-800"
                    />
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${
                        onlineUsers.includes(friend._id)
                          ? 'bg-emerald-500'
                          : 'bg-slate-300 dark:bg-zinc-700'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">
                      {friend.name}
                    </p>
                    <p className="text-xs text-indigo-500 font-medium">@{friend.username}</p>
                    {friend.about && (
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate max-w-[180px] sm:max-w-[300px] mt-0.5">
                        {friend.about}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleStartChat(friend._id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-sm transition flex-shrink-0 cursor-pointer"
                >
                  <MessageSquare size={14} /> <span>Message</span>
                </button>
              </div>
            ))}
          {!loading && data.length === 0 && (
            <div className="text-center p-12 text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-2xl bg-transparent">
              <div className="flex flex-col items-center gap-2">
                <Users size={28} className="text-slate-300 dark:text-zinc-700" />
                <p className="text-xs">No contacts found</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 2. Combined Requests Tab (Incoming + Sent, sorted by timestamp)
    if (selectedTab === 'requests') {
      const mergedRequests = [
        ...incomingRequests.map((r) => ({ ...r, requestType: 'received' })),
        ...sentRequests.map((r) => ({ ...r, requestType: 'sent' }))
      ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      const data = filteredData(mergedRequests);

      return (
        <div className="space-y-3">
          {loading && <Loading />}
          {!loading &&
            data.map((req) => {
              const isReceived = req.requestType === 'received';
              return (
                <div
                  key={`${req.requestType}-${req._id}`}
                  className="border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl animate-scale-in transition-colors hover:border-slate-300 dark:hover:border-zinc-700 gap-3"
                >
                  <div className="flex gap-3 sm:gap-3.5 items-center min-w-0">
                    <div className="relative flex-shrink-0">
                      {req.pfp ? (
                        <img
                          src={getImageUrl(req.pfp)}
                          alt={req.name || req.username}
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border border-slate-100 dark:border-zinc-800"
                        />
                      ) : (
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-indigo-50 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs uppercase text-indigo-500 border border-slate-200/60 dark:border-zinc-700/60">
                          {(req.name || req.username || 'U').substring(0, 1)}
                        </div>
                      )}
                      {isReceived && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-zinc-900"
                          title="Incoming Request"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      {isReceived ? (
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-200 leading-snug">
                          <span className="font-bold text-slate-900 dark:text-zinc-100">
                            {req.name || req.username}
                          </span>{' '}
                          <span className="text-slate-500 dark:text-zinc-400">
                            has requested you to be friends
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-200 leading-snug">
                          <span className="text-slate-500 dark:text-zinc-400">
                            You sent a friend request to
                          </span>{' '}
                          <span className="font-bold text-slate-900 dark:text-zinc-100">
                            {req.name || req.username}
                          </span>
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        <span>@{req.username}</span>
                        <span>•</span>
                        <span className="text-slate-500 dark:text-zinc-400 font-medium">
                          {formatTimeAgo(req.createdAt)}
                        </span>
                        <span
                          className={`ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${
                            isReceived
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-900/40'
                              : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-700/50'
                          }`}
                        >
                          {isReceived ? 'Received' : 'Sent'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Minified classy action buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {isReceived ? (
                      <>
                        <button
                          onClick={() => acceptRequest(req._id)}
                          title="Accept friend request"
                          className="px-2.5 sm:px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <Check size={13} strokeWidth={2.5} />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => rejectRequest(req._id)}
                          title="Delete friend request"
                          className="px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-zinc-800/80 dark:hover:bg-rose-950/30 text-slate-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 font-medium text-xs rounded-xl transition flex items-center gap-1 cursor-pointer border border-slate-200/60 dark:border-zinc-700/60 hover:border-rose-200 dark:hover:border-rose-900/40"
                        >
                          <X size={13} strokeWidth={2.5} />
                          <span>Delete</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => cancelSentRequest(req._id)}
                        title="Cancel sent request"
                        className="px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-zinc-800/80 dark:hover:bg-rose-950/30 text-slate-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 font-medium text-xs rounded-xl transition flex items-center gap-1 cursor-pointer border border-slate-200/60 dark:border-zinc-700/60 hover:border-rose-200 dark:hover:border-rose-900/40"
                      >
                        <X size={13} strokeWidth={2.5} />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {!loading && data.length === 0 && (
            <div className="text-center p-12 text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-2xl bg-transparent">
              <div className="flex flex-col items-center gap-2">
                <Users size={28} className="text-slate-300 dark:text-zinc-700" />
                <p className="text-xs">No pending or sent requests</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 3. Add Contacts (Discover) Tab
    if (selectedTab === 'discover') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40">
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed flex items-start gap-2">
              <AlertCircle size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>
                Search for users by their username below. Once you send a request, they can accept it
                to establish a conversation.
              </span>
            </p>
          </div>
          {loading && (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {!loading &&
            newUserResult &&
            newUserResult.map((u) => (
              <div
                key={u._id}
                className="border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between p-4 rounded-2xl animate-scale-in transition-colors hover:border-slate-300 dark:hover:border-zinc-700"
              >
                <div className="flex gap-3.5 items-center min-w-0">
                  <img
                    src={getImageUrl(u.pfp)}
                    alt={u.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-zinc-800"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">
                      {u.name}
                    </p>
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
            <div className="text-center text-sm text-red-500 font-medium mt-4">{message}</div>
          )}
        </div>
      );
    }

    return null;
  };

  const hasNewFriendRequests = incomingRequests.length > 0;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-950 overflow-y-auto animate-fade-in">
      <AppHeader title={'Contacts'} />

      <div className="w-full p-4 sm:p-6 md:p-8 space-y-6">
        {/* Controls: Search bar above tabs on mobile, flex row on desktop */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
          {/* Tabs Navigation */}
          <div className="order-2 md:order-1 flex bg-slate-100/80 dark:bg-zinc-900/50 p-1 rounded-2xl overflow-x-auto no-scrollbar border border-slate-200/60 dark:border-zinc-800/60">
            {[
              { id: 'friends', label: 'My Contacts' },
              { id: 'requests', label: 'Requests' },
              { id: 'discover', label: 'Add Contacts' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSearchParams({ tab: tab.id });
                  setSearchQuery('');
                }}
                className={`flex-1 md:flex-initial py-2 px-3 sm:px-4 text-xs font-semibold rounded-xl transition duration-150 relative cursor-pointer whitespace-nowrap ${
                  selectedTab === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
                {tab.id === 'requests' && hasNewFriendRequests && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500 text-white shadow-xs">
                    {incomingRequests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="order-1 md:order-2 relative w-full md:w-72 lg:w-80 flex-shrink-0">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
              <UserPlus2 size={15} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                selectedTab === 'discover'
                  ? 'Search username...'
                  : selectedTab === 'friends'
                  ? 'Search contacts...'
                  : 'Search requests...'
              }
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-zinc-900/60 text-slate-800 dark:text-zinc-100 rounded-xl border border-slate-200 dark:border-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400 dark:placeholder-zinc-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition cursor-pointer"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0">{renderContent()}</div>
      </div>
    </div>
  );
}
