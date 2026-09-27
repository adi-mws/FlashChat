import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, Link as LinkIcon } from 'lucide-react';
import { joinGroupByInviteCode } from '../../../redux/slices/chatsSlice';
import { useNotification } from '../../../hooks/useNotification';

export default function JoinGroupModal({ onClose }) {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  const [inviteInput, setInviteInput] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteInput.trim()) {
      showNotification('Invite code or link is required.', 'error');
      return;
    }

    let code = inviteInput.trim();
    if (code.includes('/join/')) {
      const parts = code.split('/join/');
      code = parts[parts.length - 1];
    } else if (code.includes('code=')) {
      const parts = code.split('code=');
      code = parts[parts.length - 1];
    }

    try {
      setJoining(true);
      await dispatch(joinGroupByInviteCode({ inviteCode: code })).unwrap();
      showNotification('Joined group successfully!', 'success');
      onClose();
    } catch (err) {
      showNotification(err || 'Failed to join group. Make sure code is correct and group is not full.', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80">
          <h3 className="font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <LinkIcon size={18} className="text-indigo-500" />
            Join via Invite
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleJoin} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">
              Invite Link or Code
            </label>
            <input
              type="text"
              required
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="e.g. abc-123 or paste invite link"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-zinc-100"
            />
          </div>

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
              disabled={joining || !inviteInput.trim()}
              className="px-5 py-2 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/10 transition disabled:opacity-50"
            >
              {joining ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
