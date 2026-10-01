import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import useDebounce from '../../hooks/useDebounce';
import { useDispatch } from 'react-redux';
import { setUser } from '../../redux/slices/authSlice';
import { useNotification } from '../../hooks/useNotification';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CHAT_ROUTES } from '../../routes/routes';
import { getOrCreateDeviceId } from '../../lib/e2ee/keyStore';
import { Sparkles, AtSign, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function UserNameForm({ showForm, setShowForm, credentialResponse }) {
  const {
    register,
    handleSubmit,
    formState: { isValid, errors },
    reset,
    setValue,
  } = useForm({ mode: 'onChange' });

  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const debouncedUsername = useDebounce(username, 400);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const onSubmit = async (data) => {
    if (!credentialResponse?.credential) {
      showNotification('Google session expired. Please sign in with Google again.', 'error');
      setShowForm(false);
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        {
          token: credentialResponse.credential,
          username: data.username.trim().toLowerCase(),
          deviceId: getOrCreateDeviceId(),
        },
        { withCredentials: true }
      );

      if (response.status === 201 || response.status === 200) {
        const loggedUser = response.data.user;
        dispatch(setUser(loggedUser));
        setShowForm(false);
        showNotification('Welcome to FlashChat! Account created successfully.', 'success');

        if (loggedUser?.role === 'admin' || loggedUser?.role === 'superadmin') {
          navigate('/flsh-ad-pnl');
        } else if (redirectUrl && redirectUrl.startsWith('/')) {
          navigate(redirectUrl);
        } else {
          navigate(CHAT_ROUTES.root);
        }
      }
    } catch (error) {
      console.error('Google Auth Registration Error:', error);
      showNotification(
        error.response?.data?.message || 'Failed to complete Google registration. Please try another username.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (showForm) {
      reset();
      setUsername('');
      setUsernameAvailable(null);
      setSubmitting(false);
    }
  }, [showForm, reset]);

  useEffect(() => {
    const checkUsername = async () => {
      const cleanUsername = debouncedUsername.trim();
      if (!cleanUsername || cleanUsername.length < 3 || errors.username) {
        setUsernameAvailable(null);
        return;
      }

      try {
        setCheckingUsername(true);
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/auth/check-username/${cleanUsername}`
        );
        setUsernameAvailable(res.data.available);
      } catch (err) {
        console.error('Username check error:', err);
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    };

    checkUsername();
  }, [debouncedUsername, errors.username]);

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(value);
    setValue('username', value, { shouldValidate: true, shouldDirty: true });
  };

  if (!showForm) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6 sm:p-7 space-y-5 animate-scale-in text-slate-800 dark:text-zinc-100">
        
        {/* Header & Icon */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-md shadow-indigo-500/10 mb-1">
            <Sparkles size={24} className="text-indigo-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Choose Your Username
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
            Welcome to FlashChat! Please pick a unique handle to complete your account registration.
          </p>
        </div>

        {/* Informational Tag */}
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-300 leading-relaxed flex items-start gap-2.5">
          <AtSign size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
          <span>
            Your username is your unique public handle. Friends and colleagues will use this to find and message you.
          </span>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
              Username Handle
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-400 dark:text-zinc-500 select-none">
                @
              </span>
              <input
                className="w-full pl-8 pr-11 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                type="text"
                placeholder="choose_username"
                value={username}
                autoFocus
                {...register('username', {
                  required: 'Username is required',
                  minLength: {
                    value: 3,
                    message: 'Username must be at least 3 characters',
                  },
                  maxLength: {
                    value: 30,
                    message: 'Username must be at most 30 characters',
                  },
                  pattern: {
                    value: /^[a-z0-9_-]+$/,
                    message: 'Only lowercase letters, numbers, _ and - allowed',
                  },
                })}
                onChange={handleUsernameChange}
              />

              {/* Status Indicator */}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                {checkingUsername ? (
                  <RefreshCw size={16} className="text-indigo-500 animate-spin" />
                ) : usernameAvailable === true ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : usernameAvailable === false ? (
                  <AlertCircle size={18} className="text-rose-500" />
                ) : null}
              </div>
            </div>

            {/* Validation Feedback */}
            {errors.username ? (
              <p className="text-rose-500 text-xs font-medium pl-1">{errors.username.message}</p>
            ) : usernameAvailable === true ? (
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium pl-1 flex items-center gap-1">
                <CheckCircle2 size={13} /> @{username} is available!
              </p>
            ) : usernameAvailable === false ? (
              <p className="text-rose-500 text-xs font-medium pl-1 flex items-center gap-1">
                <AlertCircle size={13} /> @{username} is already taken. Try another.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 pl-1">
                Lowercase letters, numbers, hyphens, and underscores only.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <button
            type="submit"
            disabled={
              checkingUsername ||
              usernameAvailable === false ||
              !username ||
              !isValid ||
              submitting
            }
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-2"
          >
            {submitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Abort / Switch Account Option */}
        <div className="text-center pt-2 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            disabled={submitting}
            className="text-xs text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition cursor-pointer"
          >
            ← Cancel and sign in with a different account
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
