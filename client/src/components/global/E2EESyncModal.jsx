import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectUser,
  selectE2eeSyncRequired,
  selectE2eeSyncError,
  restoreE2EEKeys,
  resetE2EEKeys,
  setE2eeSyncError
} from '../../redux/slices/authSlice';
import {
  selectSelectedChat,
  fetchChats,
  fetchMessages
} from '../../redux/slices/chatsSlice';
import { ShieldAlert, KeyRound, Eye, EyeOff, Lock, AlertCircle, RefreshCw } from 'lucide-react';

export default function E2EESyncModal() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const syncRequired = useSelector(selectE2eeSyncRequired);
  const syncError = useSelector(selectE2eeSyncError);
  const selectedChat = useSelector(selectSelectedChat);
  
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  if (!syncRequired || !user) return null;

  const handleRestore = async (e) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    
    setLoading(true);
    dispatch(setE2eeSyncError(null));
    try {
      await dispatch(restoreE2EEKeys({ passphrase: passphrase.trim(), user })).unwrap();
      // Re-fetch chats and open messages so they immediately decrypt
      dispatch(fetchChats(user));
      if (selectedChat) {
        dispatch(fetchMessages({ chatId: selectedChat, user }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetLoading(true);
    try {
      await dispatch(resetE2EEKeys(user)).unwrap();
      setResetConfirm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to reset encryption keys: " + err);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 px-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-6 md:p-8 space-y-6 animate-scale-in text-slate-800 dark:text-zinc-100">
        
        {!resetConfirm ? (
          <>
            {/* Header */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 mb-1">
                <Lock size={24} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Sync Encrypted Messages</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
                FlashChat messages are end-to-end encrypted. Enter your Security Passphrase to restore your private decryption key on this device.
              </p>
            </div>

            {/* Error Message */}
            {syncError && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 p-3 text-xs shadow-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Decryption Failed</p>
                  <p className="mt-0.5 leading-relaxed">{syncError}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleRestore} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Security Passphrase</label>
                <div className="relative">
                  <input
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm animate-pulse-once"
                    type={showPassphrase ? "text" : "password"}
                    placeholder="Enter security passphrase"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
                  >
                    {showPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !passphrase.trim()}
                className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/15 active:scale-[0.98] transition-all duration-150 flex items-center justify-center text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin mr-2 h-4 w-4" /> Restoring Keys...
                  </>
                ) : (
                  "Restore Keys & Chats"
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-100 dark:border-zinc-800/60 w-full" />
            </div>

            {/* Reset Fallback */}
            <div className="text-center">
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Forgot your passphrase? You will not be able to decrypt past messages on new devices.
              </p>
              <button
                type="button"
                onClick={() => setResetConfirm(true)}
                className="mt-2 text-xs font-semibold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
              >
                Reset Encryption Keys
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Warning Dialog */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-red-500/10 text-red-500 dark:bg-red-500/20 mb-1">
                <ShieldAlert size={26} />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-red-500">Are you absolutely sure?</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Resetting your encryption keys will discard your current E2EE keys and create a brand new keypair. 
              </p>
              <div className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-800 rounded-xl p-3.5 text-left text-[11px] space-y-2 text-slate-500 dark:text-zinc-400">
                <p className="font-semibold text-slate-700 dark:text-zinc-300">What this means:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>You <strong className="text-red-500">will lose access</strong> to all historical messages on this device.</li>
                  <li>Other contacts will see a "Safety Number Changed" notification when they chat with you.</li>
                  <li>Your other logged-in devices will continue using the old keys and won't be able to decrypt new messages unless they also re-login and sync.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={resetLoading}
                onClick={() => setResetConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetLoading}
                onClick={handleReset}
                className="w-1/2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition shadow-md shadow-red-500/10 flex items-center justify-center cursor-pointer"
              >
                {resetLoading ? (
                  <>
                    <RefreshCw className="animate-spin mr-1.5 h-3.5 w-3.5" /> Resetting...
                  </>
                ) : (
                  "Yes, Reset Keys"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
