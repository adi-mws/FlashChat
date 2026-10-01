import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, selectAuthLoading } from '../../../redux/slices/authSlice';
import { joinGroupByInviteCode, setSelectedChat } from '../../../redux/slices/chatsSlice';
import { useNotification } from '../../../hooks/useNotification';
import { CHAT_ROUTES, ADMIN_ROUTES, MARKETING_ROUTES } from '../../../routes/routes';
import { Users, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function JoinGroupPage() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useNotification();

  const user = useSelector(selectUser);
  const authLoading = useSelector(selectAuthLoading);

  // Extract invite code from query param (?code=...) or route param (:code)
  const inviteCode = searchParams.get('code') || params.code || '';

  const [status, setStatus] = useState('initiating'); // 'initiating' | 'joining' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [joinedGroup, setJoinedGroup] = useState(null);
  const attemptedRef = useRef(false);

  useEffect(() => {
    // Wait until auth initialization completes
    if (authLoading) return;

    // If user is not logged in, forward to login preserving this join URL in params
    if (!user) {
      const returnUrl = inviteCode ? `/join?code=${encodeURIComponent(inviteCode)}` : '/app/chats';
      navigate(`${MARKETING_ROUTES.login}?redirect=${encodeURIComponent(returnUrl)}`, {
        replace: true
      });
      return;
    }

    // Admins are restricted from standard user groups
    if (user.role === 'admin' || user.role === 'superadmin') {
      setStatus('error');
      setErrorMessage('Administrators cannot join standard user group chats.');
      return;
    }

    // No invite code provided
    if (!inviteCode.trim()) {
      setStatus('error');
      setErrorMessage('No invite code was provided in the invite link.');
      return;
    }

    // Prevent duplicate joining calls
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const performJoin = async () => {
      setStatus('joining');
      setErrorMessage('');
      try {
        const res = await dispatch(
          joinGroupByInviteCode({ inviteCode: inviteCode.trim() })
        ).unwrap();

        const group = res.group || res;
        const targetChatId = group?._id || res.chatId;

        setJoinedGroup(group);
        setStatus('success');
        showNotification(res.message || 'Joined group successfully!', 'success');

        if (targetChatId) {
          dispatch(setSelectedChat(targetChatId));
          // Quick smooth transition to the group chat
          setTimeout(() => {
            navigate(CHAT_ROUTES.chat(targetChatId), { replace: true });
          }, 600);
        } else {
          navigate(CHAT_ROUTES.root, { replace: true });
        }
      } catch (err) {
        console.error('Failed to join group:', err);
        setStatus('error');
        setErrorMessage(
          typeof err === 'string'
            ? err
            : err?.message || 'Invalid or expired invite link.'
        );
      }
    };

    performJoin();
  }, [user, authLoading, inviteCode, dispatch, navigate, showNotification]);

  const handleRetry = () => {
    attemptedRef.current = false;
    setStatus('initiating');
  };

  if (authLoading || status === 'initiating' || status === 'joining') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 animate-fade-in">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-xl space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">
              Joining Group Chat
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Verifying invite link and connecting your session...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 text-indigo-500 text-xs font-medium">
            <Loader2 size={16} className="animate-spin" />
            <span>Connecting...</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 animate-fade-in">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-xl space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">
              Successfully Connected!
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {joinedGroup?.groupName ? `You are in "${joinedGroup.groupName}"` : 'Redirecting to your chat conversation...'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                const targetId = joinedGroup?._id;
                if (targetId) navigate(CHAT_ROUTES.chat(targetId));
                else navigate(CHAT_ROUTES.root);
              }}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Chat</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-xl space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center">
          <AlertCircle size={32} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">
            Unable to Join Group
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
            {errorMessage || 'This group invite link is invalid, has expired, or the group limit has been reached.'}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          {inviteCode && (
            <button
              onClick={handleRetry}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              Try Again
            </button>
          )}

          <button
            onClick={() => {
              if (user?.role === 'admin' || user?.role === 'superadmin') {
                navigate(ADMIN_ROUTES.dashboard);
              } else {
                navigate(CHAT_ROUTES.root);
              }
            }}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium text-xs rounded-xl transition cursor-pointer"
          >
            {user?.role === 'admin' || user?.role === 'superadmin'
              ? 'Go to Admin Console'
              : 'Go to Chats'}
          </button>
        </div>
      </div>
    </div>
  );
}
