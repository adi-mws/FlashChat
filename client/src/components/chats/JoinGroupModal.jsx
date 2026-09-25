import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, Link as LinkIcon } from 'lucide-react';
import { joinGroupByInviteCode } from '../../redux/slices/chatsSlice';
import { useNotification } from '../../hooks/useNotification';

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

    // Extract code if user pasted a full URL (e.g. http://localhost:5173/join/inviteCode or just /join/inviteCode)
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
      const group = await dispatch(joinGroupByInviteCode({ inviteCode: code })).unwrap();
      showNotification('Joined group successfully!', 'success');
      onClose();
    } catch (err) {
      showNotification(err || 'Failed to join group. Make sure code is correct and group is not full.', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
            <LinkIcon className="text-indigo-500" size={18} />
            <h3 className="font-semibold text-sm">Join Group</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 rounded-lg transition cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleJoin} className="p-4 space-y-4">
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Enter the group invite code or the full invite link shared with you by group members.
          </p>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Invite Code / Link</label>
            <input
              type="text"
              placeholder="e.g. a7f8e3bc or https://flashchat.com/join/a7f8e3bc"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200/80 active:scale-98 dark:bg-zinc-800 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl border border-transparent transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joining}
              className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-98 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-indigo-500/10 cursor-pointer"
            >
              {joining ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
