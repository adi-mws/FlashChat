import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/AuthContext';
import { UserPlus, LogIn, User, Users, MessageSquare } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="Landing w-full flex items-center flex-col bg-slate-50 dark:bg-zinc-950 transition-colors duration-200">
      <div className="hero-section-content min-h-[90vh] flex flex-col justify-center items-center gap-8 px-4 sm:px-8 py-16 text-center max-w-5xl">
        <h1 className="hero-section-title text-4xl sm:text-6xl lg:text-7xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
          Talk One-on-One.<br />
          <span className="text-indigo-500">Fast. Secure. Limitless.</span>
        </h1>
        <p className="hero-section-description text-slate-500 dark:text-zinc-400 max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed">
          FlashChat is a real-time messaging application that connects users instantly. Simply search for friends by username and start chatting with full end-to-end synchronization across all your devices.
        </p>
        <div className="flex gap-4 flex-col sm:flex-row items-center mt-4">
          <button 
            className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white hover:scale-[1.02] active:scale-95 transition sm:text-md w-[80vw] sm:w-auto duration-200 text-sm py-3.5 lg:px-12 px-8 shadow-md shadow-indigo-500/10 cursor-pointer" 
            onClick={() => { navigate(user ? '/chats' : '/login') }}
          >
            Start Chatting
          </button>
          <button 
            onClick={() => { navigate('/about') }} 
            className="rounded-xl text-sm sm:text-md text-slate-600 dark:text-zinc-300 font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-[80vw] sm:w-auto hover:scale-[1.02] active:scale-95 hover:bg-slate-50 dark:hover:bg-zinc-800 transition duration-200 py-3.5 lg:px-10 px-8 shadow-sm cursor-pointer"
          >
            About Application
          </button>
        </div>
      </div>

      {/* Get started section for app tutorials */}
      <div className="w-full max-w-6xl mx-auto px-4 py-16 sm:py-24 flex flex-col gap-12 items-center">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-5xl font-black text-slate-800 dark:text-white tracking-tight">Get Started</h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-zinc-400 max-w-xl mx-auto">
            Connect and message your friends in a few simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-8">
          {/* Step 1 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/70">
              <UserPlus size={22} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-zinc-100">1. Create Your Account</h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Go to the registration page and sign up using Google for instant access, or create a credentials-based account.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/70">
              <LogIn size={22} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-zinc-100">2. Log In Securely</h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Log in to authenticate your session. Your account remains synchronized in real-time across all your tabs and devices.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/70">
              <User size={22} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-zinc-100">3. Personalize Profile</h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Click your avatar to configure profile settings. Set up custom display names, bios, and upload your profile picture.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/70">
              <Users size={22} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-zinc-100">4. Find Friends</h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Search for other registered users by username, send friend requests, and build your contacts directory easily.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-4 md:col-span-2 lg:col-span-1">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/70">
              <MessageSquare size={22} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-zinc-100">5. Chat Real-Time</h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Start chatting instantly! Send messages, view online statuses, read receipts, and manage sessions in real time.
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => navigate('/chats')} 
          className="mt-8 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white hover:scale-[1.02] active:scale-95 transition sm:text-md py-3.5 px-10 shadow-md shadow-indigo-500/10 cursor-pointer"
        >
          Go to Chats
        </button>

        <footer className="w-full border-t border-slate-200/60 dark:border-zinc-900 text-slate-600 dark:text-zinc-400 py-10 mt-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-lg font-black text-slate-800 dark:text-white">FlashChat</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
                One-on-one messaging. Reimagined. Simple, fast & real-time.
              </p>
            </div>
            <div className="flex gap-6 text-sm font-semibold">
              <Link to="/chats" className="hover:text-indigo-500 transition-colors">Chats</Link>
              <Link to="/about" className="hover:text-indigo-500 transition-colors">About</Link>
            </div>
          </div>
          <div className="border-t border-slate-200/40 dark:border-zinc-900/50 my-6" />
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 dark:text-zinc-500 gap-2">
            <p>&copy; {new Date().getFullYear()} FlashChat. All rights reserved.</p>
            <p>Developed by <span className="text-slate-800 dark:text-zinc-300 font-semibold">Aditya Raj</span></p>
          </div>
        </footer>
      </div>
    </div>
  );
}
