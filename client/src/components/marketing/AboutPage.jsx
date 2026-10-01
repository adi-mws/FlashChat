import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, GitCommit } from 'lucide-react';
import { MARKETING_ROUTES } from '../../routes/routes';

export default function AboutPage() {
  const [updates, setUpdates] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const inChat = location.pathname !== '/about';

  useEffect(() => {
    setUpdates([
      {
        version: '3.4.0',
        date: 'September 29, 2026',
        title: 'Modern Desktop Sidebar & Real-Time Presence Polish',
        description:
          'Introduced a dedicated, collapsible desktop navigation sidebar for quick switching between chats, contacts, calls, and account settings. Improved real-time user presence with instant offline status tracking upon browser tab closure and precise last seen timestamps. Enhanced media viewing with click-to-open attachment modals and uniform image aspect ratios.',
      },
      {
        version: '3.3.0',
        date: 'September 28, 2026',
        title: 'Admin MasterKey Authentication & Live Typing Indicators',
        description:
          'Implemented MasterKey-secured authentication controllers for dedicated administrator access. Added real-time typing indicators in both active conversation views and chat list previews for live conversational visibility, alongside message hiding support for group chats.',
      },
      {
        version: '3.2.0',
        date: 'September 27, 2026',
        title: 'Supreme Admin Panel & Group Conversation Controls',
        description:
          'Launched the Supreme Admin Dashboard for comprehensive user administration, moderation controls, and system health inspection. Added the ability to clear chat history in group rooms and resolved group invitation and member joining errors.',
      },
      {
        version: '3.1.0',
        date: 'September 20, 2026',
        title: 'Multi-Device End-to-End Encryption & Key Recovery',
        description:
          'Rolled out full client-side End-to-End Encryption (E2EE) powered by Web Crypto APIs. Supports seamless cryptographic key sync across authenticated devices, alongside zero-knowledge encrypted backups for account recovery across new logins.',
      },
      {
        version: '3.0.0',
        date: 'September 12, 2026',
        title: 'Group Chats & Collaborative Rooms',
        description:
          'Introduced multi-participant group messaging to FlashChat. Users can create custom group chats, configure group info and avatars, manage member participants, and converse in real-time with synchronized group delivery.',
      },
      {
        version: '2.6.0',
        date: 'August 28, 2026',
        title: 'Media Attachments, In-App Camera & Encryption Badges',
        description:
          'Expanded chat media capabilities with instant camera snapshot support to capture and send photos directly from within the app. Added file attachment support, contextual date dividers, and visual encryption badges inside active conversations.',
      },
      {
        version: '2.5.0',
        date: 'August 18, 2026',
        title: 'Smart Chat Drafts & Unified Conversation Ordering',
        description:
          'Added an automatic chat draft system that preserves unsent messages per conversation. Re-engineered chat list ordering logic based on unified timestamps for both draft edits and incoming messages.',
      },
      {
        version: '2.4.0',
        date: 'June 18, 2026',
        title: 'Mobile Navigation Bar & Responsive Desktop Layout',
        description:
          'Redesigned the application layout with dedicated navigation bars for mobile devices and clean desktop interfaces. Unified profile views, streamlined responsive transitions, and refined file structures.',
      },
      {
        version: '2.3.0',
        date: 'June 2, 2026',
        title: 'Multi-Device Sync & Session Management',
        description:
          'FlashChat v2.3.0 introduces real-time synchronization across multiple devices, active browser tabs, and concurrent user sessions. Monitor active device logins and perform secure force logouts directly from the Linked Devices page. Includes several core UI and stability fixes.',
      },
      {
        version: '2.2.0',
        date: 'June 1, 2026',
        title: 'Major UI Refresh, Bug Fixes & Stability Improvements',
        description:
          'FlashChat v2.2.0 introduces a significant UI refresh with a cleaner messaging experience, improved chat layouts, and better overall organization across the application. Contact management and friend request workflows have been refined to provide a smoother and more seamless user experience. Numerous bugs have been fixed throughout the app, improving stability, responsiveness, and reliability. Performance optimizations and interface enhancements make FlashChat feel faster, more polished, and easier to navigate.',
      },
      {
        version: '2.1.0',
        date: 'July 26, 2025',
        title: 'Minor Fixes & Navigation Improvements',
        description:
          'Fixed small bugs related to UI alignment and login for regular accounts. Resolved navigation errors when switching between profile, chat, and onboarding screens. App now behaves more predictably on slow networks and mobile devices.',
      },
      {
        version: '2.0.0',
        date: 'July 24, 2025',
        title: 'Friend System, Profiles & Messaging Overhaul',
        description:
          'FlashChat has been reimagined. Added a full contact system with send/receive/cancel/accept friend requests. Users now manage connections instead of blindly chatting. Introduced editable profiles for personalization. Messaging logic was streamlined — removed hybrid REST+Socket model in favor of fully socket-driven chat delivery, making communication faster and more responsive.\n\nAlso introduced a new privacy feature: the ability to hide your last message in the chat list. This idea came from a personal experience — sometimes you need privacy, and this gives you the control to manage visibility right from your profile settings.',
      },
      {
        version: '1.0.0',
        date: 'April 20, 2025',
        title: 'FlashChat v1 — The Beginning',
        description:
          'FlashChat was built as a one-to-one messaging platform using the MERN stack. It allowed users to search others by username and instantly start chatting in real-time using Socket.IO. At its core, the message system relied on a hybrid architecture: REST APIs handled message storage and retrieval, while Socket.IO delivered messages in real time.\n\nThis blend of REST + WebSockets continues to power the app today, but the early implementation was basic — with minimal features and no concept of social connection or personalization. Still, it was a bold start and laid the foundation for the versions ahead.',
      }
    ]);
  }, []);

  return (
    <div className={`w-full ${inChat ? 'h-full bg-white dark:bg-zinc-950 overflow-hidden' : 'min-h-screen bg-white dark:bg-zinc-950'} flex flex-col transition-colors duration-200`}>
      {inChat ? (
        <div className="min-h-[65px] flex items-center px-4 py-3.5 sm:px-8 border-b border-slate-200/50 dark:border-zinc-900 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md sticky top-0 z-10 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Update History</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500">Changelog and release notes for FlashChat</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto w-full px-4 pt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate(MARKETING_ROUTES.landing)}
            className="flex items-center gap-2 p-2 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent border border-slate-200 dark:border-zinc-800 transition hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">FlashChat Changelog</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-500">Track application updates and changes over time</p>
          </div>
        </div>
      )}

      <div className={`max-w-3xl w-full mx-auto p-4 sm:p-6 md:p-8 flex-1 ${inChat ? 'overflow-y-auto' : ''}`}>
        <div className="relative border-l border-slate-200 dark:border-zinc-800 ml-3 sm:ml-5 pl-6 sm:pl-8 space-y-10">
          {updates.map((item, index) => (
            <div key={index} className="relative group">
              {/* Timeline dot */}
              <span className="absolute -left-[37px] sm:-left-[45px] top-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 dark:text-indigo-400 border-4 border-white dark:border-zinc-950 transition duration-200">
                <GitCommit size={13} />
              </span>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-indigo-500 text-white text-[10px] font-bold tracking-wider rounded-lg py-0.5 px-2">
                      v{item.version}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-100 leading-snug">
                      {item.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 font-medium">
                    <Calendar size={12} />
                    <span>{item.date}</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
