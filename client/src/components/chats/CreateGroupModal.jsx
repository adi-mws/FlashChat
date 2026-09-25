import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { X, Search, Check, Users } from 'lucide-react';
import axios from 'axios';
import { getImageUrl } from '../../lib/imageUtils';
import { createGroupChat } from '../../redux/slices/chatsSlice';
import { useNotification } from '../../hooks/useNotification';

export default function CreateGroupModal({ onClose }) {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoadingFriends(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/friends/list`, { withCredentials: true });
        setFriends(res.data.friends || []);
      } catch (err) {
        console.error(err);
        showNotification('Failed to load friends list.', 'error');
      } finally {
        setLoadingFriends(false);
      }
    };
    fetchFriends();
  }, [showNotification]);

  const handleToggleFriend = (friendId) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(prev => prev.filter(id => id !== friendId));
    } else {
      setSelectedFriends(prev => [...prev, friendId]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showNotification('Group name is required.', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await dispatch(createGroupChat({
        groupName,
        groupDescription,
        initialMembers: selectedFriends
      })).unwrap();
      showNotification('Group created successfully!', 'success');
      onClose();
    } catch (err) {
      showNotification(err || 'Failed to create group.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
            <Users className="text-indigo-500" size={20} />
            <h3 className="font-semibold text-sm">Create Group Chat</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 rounded-lg transition cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Metadata */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Group Name</label>
              <input
                type="text"
                required
                maxLength={40}
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Description (Optional)</label>
              <textarea
                placeholder="What is this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={2}
                maxLength={150}
                className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none shadow-sm"
              />
            </div>
          </div>

          {/* Members list */}
          <div className="space-y-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Select Group Members</label>
              <span className="text-[11px] text-indigo-500 font-semibold">{selectedFriends.length} selected</span>
            </div>
            
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500"><Search size={14} /></span>
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
              />
            </div>

            {/* Contacts container */}
            <div className="border border-slate-100 dark:border-zinc-800/80 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 bg-slate-50/20 dark:bg-zinc-950/20 min-h-24">
              {loadingFriends ? (
                <div className="flex justify-center p-6"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center p-6 text-slate-400 dark:text-zinc-500 text-xs">No contacts available to add</div>
              ) : (
                filteredFriends.map(friend => {
                  const isChecked = selectedFriends.includes(friend._id);
                  return (
                    <div
                      key={friend._id}
                      onClick={() => handleToggleFriend(friend._id)}
                      className="flex items-center justify-between p-2.5 hover:bg-slate-100/50 dark:hover:bg-zinc-900/60 cursor-pointer transition"
                    >
                      <div className="flex gap-2.5 items-center min-w-0">
                        <img
                          src={getImageUrl(friend.pfp)}
                          alt={friend.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-100 dark:border-zinc-800"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200 truncate">{friend.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">@{friend.username}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isChecked ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-zinc-700'}`}>
                        {isChecked && <Check size={12} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200/80 active:scale-98 dark:bg-zinc-800 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl border border-transparent transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-98 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-indigo-500/10 cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
