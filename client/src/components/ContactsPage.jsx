import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Plus } from 'lucide-react';
import { getImageUrl } from '../utils/imageUtils';
import { useNotification } from '../hooks/NotificationContext';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket, useChat } from '../hooks/ChatsContext';
export default function ContactsPage() {
  const [selectedTab, setSelectedTab] = useState('received');
  const [searchQuery, setSearchQuery] = useState('');
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [newUserResult, setNewUserResult] = useState(null);
  const [message, setMessage] = useState('');
  const [sentTo, setSentTo] = useState([]);
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { setChats } = useChat();
  const [hasNewFriendRequests, setHasNewFriendRequests] = useState(false);


  const fetchIncoming = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/friends/requests`, { withCredentials: true });
      // console.log(res.data)
      setIncomingRequests(res.data.requests);
    } catch (err) {
      setMessage('Failed to load friend requests.');
    }
  };

  useEffect(() => {
    if (incomingRequests.length > 0) setHasNewFriendRequests(true);
    else setHasNewFriendRequests(false);
  }, [incomingRequests])

  const fetchSent = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/friends/sent`, { withCredentials: true });
      // console.log(res.data)

      setSentRequests(res.data.sentRequests);
    } catch (err) {
      setMessage('Failed to load sent requests.');
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
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/get-users?username=${searchQuery}`, { withCredentials: true });
          // console.log(res.data)
          setNewUserResult(res.data.users);
          setMessage('');
        } catch (err) {
          console.error(err)
          setNewUserResult(null);
          setMessage('User not found.');
        }
      } else {
        setNewUserResult(null);
        setMessage('');
      }
    };

    const delay = setTimeout(searchNewUser, 300);
    return () => clearTimeout(delay);
  }, [searchQuery, selectedTab]);

  const sendFriendRequest = async (toUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/request`, { toUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification('success', 'Friend Request Sent!')
        setNewUserResult((prev) => prev.filter(item => item._id != toUserId));
      }
    } catch (err) {
      // console.log(err)
      setMessage('Error sending request.');
    }
  };


  const acceptRequest = async (fromUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/accept`, { fromUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification('success', 'Friend request accepted')
        setChats(prev => [...prev, response.data.chat])
        setIncomingRequests(prev => prev.filter(item => item.from._id != fromUserId))
      }
    } catch (err) {
      // console.log(err)
      setMessage('Error accepting request.');
    }
  };

  const rejectRequest = async (fromUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/reject`, { fromUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification('info', 'Friend request ignored')
        setIncomingRequests(prev => prev.filter(item => item.from._id != fromUserId))
      }
    } catch (err) {
      setMessage('Error rejecting request.');
    }
  };

  const cancelSentRequest = async (toUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/friends/cancel`, { toUserId }, { withCredentials: true });
      if (response.status === 200) {
        showNotification('success', 'Cancelled sent friend request');
        setSentRequests(prev => prev.filter(request => request._id != toUserId))
      }
    } catch (err) {
      setMessage('Error canceling request.');
    }
  };

  // Live friend events logic with socket listening

  // When the sender will send the request the person will recieve (Here the person is reciever)
  socket.on("incomingFriendRequest", (user) => {
    // console.log("Socket => Received Incoming Request from ", user)
    setIncomingRequests(prev => {
      if (prev.some(u => u._id === user._id)) return prev;
      return [...prev, user];
    });
    showNotification("info", `New friend request from ${user.username}`);
  });

  // The receiver Accepted the request and the new chat is created for the sender
  socket.on("friendRequestAccepted", (data) => {
    // console.log("Socket = accepted request",data )

    showNotification("success", `${data.username}(${data.name}) has accepted your friend request`);
    setChats(prev => [...prev, data.chat])
  })

  // The receiver cancelled the request (Here the person is sender)
  socket.on("friendRequestRejected", (data) => {
    // console.log("Socket = rejeted request",data )

    setSentRequests(prev => prev.filter(item => item._id != data._id));
  })

  // The sender cancelled the request (Here the person is reciever)
  // Now removing the request from Incomings
  socket.on("friendRequestCancelled", (data) => {
    // console.log("Socket = cancel sent request",data )

    setIncomingRequests(prev => prev.filter(item => item._id != data._id));
  })




  const filteredData = (dataList) => {
    if (!searchQuery.trim()) return dataList;

    const lowered = searchQuery.toLowerCase();

    return dataList.filter(
      (user) =>
        (user.name?.toLowerCase() || '').startsWith(lowered) ||
        (user.username?.toLowerCase() || '').startsWith(lowered)
    );
  };


  const renderContent = () => {
    // console.log(sentRequests)
    const data =
      selectedTab === 'received'
        ? filteredData(incomingRequests)
        : selectedTab === 'sent'
          ? filteredData(sentRequests)
          : [];

    if (selectedTab === 'new') {
      return (
        <div className="rounded-xl shadow-md bg-white dark:bg-zinc-900 w-full">
          <p className="text-sm sm:text-md font-semibold mb-3 mt-2 dark:text-white">You can search users by username and send friend request to them to add to your contacts</p>
          {newUserResult ? newUserResult.map(u => (
            <div className="bg-zinc-100 mt-2 dark:bg-zinc-800 flex justify-between items-center p-2 px-5 rounded-lg" key={u._id}>
              <div className="flex gap-4 items-center">
                <img src={getImageUrl(u.pfp)} alt="pfp" className='text-xs w-20 h-20 rounded-full dark:text-zinc-400' />
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold dark:text-white">{u.name}</p>
                  <p className="text-sm text-zinc-300">@{u.username}</p>
                </div>
              </div>
              <button
                onClick={() => sendFriendRequest(u._id)}
                disabled={sentTo.includes(u._id)} // disable if already sent
                className={`flex gap-2 items-center text-sm  justify-center sm:px-6 px-3 py-3 rounded 
    ${sentTo.includes(u._id)
                    ? 'bg-green-600 text-white cursor-default'
                    : 'bg-zinc-600 text-white hover:bg-zinc-700'}`}
              >
                {sentTo.includes(u._id) ? 'Request Sent' : <><Plus size={20} /> <span className='hidden sm:hidden'>Add Friend</span></>}
              </button>

            </div>
          )) : (
            message && <p className="mt-2 text-center text-sm text-red-500">{message}</p>
          )}
        </div>
      );
    }

    return (
      <div className="p-4 rounded-xl shadow-md bg-white dark:bg-zinc-900 w-full">
        {data.map((u) => {
          const user = selectedTab === 'received' ? u.from : u;
          return (
            <div
              key={user._id}
              className="flex justify-between items-center border-b border-zinc-300 dark:border-zinc-700 py-2"
            >
              <div>
                <p className="font-medium dark:text-white">{user.name}</p>
                <p className="text-sm text-gray-500">@{user.username}</p>
              </div>
              <div className="flex gap-5">

                {selectedTab === 'received' && (
                  <>
                    <button
                      onClick={() => acceptRequest(user._id)}
                      className="text-green-600 hover:text-green-800"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectRequest(user._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}
                {selectedTab === 'sent' && (
                  <button
                    onClick={() => cancelSentRequest(user._id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {data.length === 0 && <p className="text-sm dark:text-zinc-300">No results found.</p>}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full dark:bg-zinc-900 min-h-screen overflow-hidden gap-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <ArrowLeft onClick={() => navigate('/chats')} className='dark:text-zinc-300 cursor-pointer' />
        <p className="text-lg sm:text-xl font-medium dark:text-white">Contacts</p>
      </div>

      <div className="flex gap-6 border-b border-zinc-300 dark:border-zinc-700 pb-2">
        {['received', 'sent', 'new'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`pb-1 text-base relative font-medium capitalize transition-all duration-200 
              ${selectedTab === tab
                ? 'border-b-2 border-zinc-800 dark:border-white text-zinc-800 dark:text-white'
                : 'text-zinc-500 dark:text-zinc-400'
              }`}
          >
            {tab === 'received'
              ? 'Requests'
              : tab === 'sent'
                ? 'Sent'
                : 'Add New'}
            {tab === 'received' && hasNewFriendRequests ?
              <span className='bg-red-500 w-2 h-2 block absolute -top-0.5 -right-1 rounded-full'></span> : null}


          </button>
        ))}
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
        className="px-4 py-2 rounded-lg border dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
      />

      <div className="flex-1 scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700 overflow-y-auto max-h-[70vh]">
        {renderContent()}
      </div>
    </div >
  );
}
