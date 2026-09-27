import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { X, Search, Check, Users } from 'lucide-react';
import axios from 'axios';
import { getImageUrl } from '../../../lib/imageUtils';
import { createGroupChat } from '../../../redux/slices/chatsSlice';
import { useNotification } from '../../../hooks/useNotification';

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

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showNotification('Group name is required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await dispatch(createGroupChat({
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim(),
        initialMembers: selectedFriends,
        members: selectedFriends,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80">
          <h3 className="font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <Users size={18} className="text-indigo-500" />
            Create Group Chat
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              required
              maxLength={32}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Project Alpha"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">
              Description (Optional)
            </label>
            <textarea
              maxLength={150}
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What is this group about?"
              rows={2}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-zinc-100 resize-none"
            />
          </div>

          {/* Members Selector */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                Add Friends ({selectedFriends.length})
              </label>
            </div>
            
            {/* Search filter for friends */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search friends..."
                className="w-full pl-8 pr-3.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-zinc-100"
              />
            </div>

            {/* List */}
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-slate-150 dark:border-zinc-800/80 rounded-xl p-2 bg-slate-50/50 dark:bg-zinc-950/40">
              {loadingFriends && (
                <p className="text-center py-4 text-xs text-slate-400 dark:text-zinc-500">Loading friends...</p>
              )}
              {!loadingFriends && filteredFriends.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400 dark:text-zinc-500">
                  {friends.length === 0 ? "No friends available to add." : "No matching friends."}
                </p>
              )}
              {filteredFriends.map((friend) => {
                const isSelected = selectedFriends.includes(friend._id);
                return (
                  <div
                    key={friend._id}
                    onClick={() => handleToggleFriend(friend._id)}
                    className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition ${
                      isSelected 
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60' 
                        : 'hover:bg-slate-100 dark:hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img 
                        src={getImageUrl(friend.pfp)} 
                        alt={friend.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">
                          {friend.name}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                          @{friend.username}
                        </p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                      isSelected 
                        ? 'bg-indigo-500 border-indigo-500 text-white' 
                        : 'border-slate-300 dark:border-zinc-700'
                    }`}>
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !groupName.trim()}
              className="px-5 py-2 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/10 transition disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
