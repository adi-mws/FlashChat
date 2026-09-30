import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { X, Search, Check, UserPlus, Users, Loader2 } from 'lucide-react';
import axios from 'axios';
import { getImageUrl } from '../../../lib/imageUtils';
import { addGroupMembers } from '../../../redux/slices/chatsSlice';
import { useNotification } from '../../../hooks/useNotification';

export default function AddMembersModal({ group, isOpen, onClose }) {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();

  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedFriends([]);
    setSearchTerm('');

    const fetchFriends = async () => {
      try {
        setLoadingFriends(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/friends/list`, {
          withCredentials: true
        });
        setFriends(res.data.friends || []);
      } catch (err) {
        console.error('Failed to load friends:', err);
        showNotification('Failed to load friends list.', 'error');
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [isOpen, showNotification]);

  if (!isOpen) return null;

  // Filter out friends that are already group participants
  const existingParticipantIds = new Set(
    (group?.participants || []).map((p) => (p?._id || p)?.toString())
  );

  const eligibleFriends = friends.filter(
    (friend) => !existingParticipantIds.has(friend._id?.toString())
  );

  const filteredFriends = eligibleFriends.filter(
    (friend) =>
      friend.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentCount = group?.participants?.length || 0;
  const memberLimit = group?.memberLimit || 100;
  const remainingSlots = Math.max(0, memberLimit - currentCount);

  const handleToggleFriend = (friendId) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends((prev) => prev.filter((id) => id !== friendId));
    } else {
      if (selectedFriends.length >= remainingSlots) {
        showNotification(
          `Cannot select more members. Group limit is ${memberLimit}.`,
          'error'
        );
        return;
      }
      setSelectedFriends((prev) => [...prev, friendId]);
    }
  };

  const handleAddMembers = async (e) => {
    e.preventDefault();
    if (selectedFriends.length === 0) {
      showNotification('Please select at least one contact to add.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await dispatch(
        addGroupMembers({
          chatId: group._id,
          memberIds: selectedFriends
        })
      ).unwrap();

      showNotification(
        `Added ${selectedFriends.length} member${selectedFriends.length > 1 ? 's' : ''} to the group`,
        'success'
      );
      onClose();
    } catch (err) {
      showNotification(err || 'Failed to add members to group', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
                Add Group Members
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[240px]">
                {group?.groupName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto px-6 py-2 divide-y divide-slate-100 dark:divide-zinc-800/60">
          {loadingFriends ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-zinc-500">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span className="text-xs">Loading contacts...</span>
            </div>
          ) : eligibleFriends.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500 mb-3">
                <Users size={24} />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                {friends.length === 0
                  ? 'No contacts found'
                  : 'All contacts are already in this group'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 max-w-xs">
                {friends.length === 0
                  ? 'Add friends in the Contacts section before adding them to groups.'
                  : 'Every contact on your list is already a participant in this conversation.'}
              </p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 dark:text-zinc-500">
              No contacts match "{searchTerm}"
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isSelected = selectedFriends.includes(friend._id);
              return (
                <div
                  key={friend._id}
                  onClick={() => !submitting && handleToggleFriend(friend._id)}
                  className={`flex items-center justify-between py-2.5 px-2 rounded-xl transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {friend.pfp ? (
                      <img
                        src={getImageUrl(friend.pfp)}
                        alt={friend.name || friend.username}
                        className="w-9 h-9 object-cover rounded-full border border-slate-200/60 dark:border-zinc-800"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs uppercase border border-indigo-200/40 dark:border-indigo-800/40">
                        {(friend.name || friend.username || 'U').substring(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                        {friend.name || friend.username}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">
                        @{friend.username}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-zinc-700 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/30">
          <div className="text-[11px] text-slate-500 dark:text-zinc-400">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {selectedFriends.length}
            </span>{' '}
            selected
            <span className="mx-1.5 opacity-40">•</span>
            <span>{remainingSlots} spots left</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddMembers}
              disabled={selectedFriends.length === 0 || submitting}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <UserPlus size={13} />
                  <span>
                    Add {selectedFriends.length > 0 ? `(${selectedFriends.length})` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
