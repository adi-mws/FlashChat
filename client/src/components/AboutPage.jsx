import React, { useEffect, useState } from 'react';

export default function AboutPage() {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    setUpdates([
      {
        version: '2.1',
        date: 'July 26, 2025',
        title: 'Minor Fixes & Navigation Improvements',
        description:
          'Fixed small bugs related to UI alignment and login for regular accounts. Resolved navigation errors when switching between profile, chat, and onboarding screens. App now behaves more predictably on slow networks and mobile devices.',
      },
      {
        version: '2.0',
        date: 'July 24, 2025',
        title: 'Friend System, Profiles & Messaging Overhaul',
        description:
          'FlashChat has been reimagined. Added a full contact system with send/receive/cancel/accept friend requests. Users now manage connections instead of blindly chatting. Introduced editable profiles for personalization. Messaging logic was streamlined — removed hybrid REST+Socket model in favor of fully socket-driven chat delivery, making communication faster and more responsive.\n\nAlso introduced a new privacy feature: the ability to hide your last message in the chat list. This idea came from a personal experience — sometimes you need privacy, and this gives you the control to manage visibility right from your profile settings.',
      },
      {
        version: '1.0',
        date: 'April 20, 2025',
        title: 'FlashChat v1 — The Beginning',
        description:
          'FlashChat was built as a one-to-one messaging platform using the MERN stack. It allowed users to search others by username and instantly start chatting in real-time using Socket.IO. At its core, the message system relied on a hybrid architecture: REST APIs handled message storage and retrieval, while Socket.IO delivered messages in real time.\n\nThis blend of REST + WebSockets continues to power the app today, but the early implementation was basic — with minimal features and no concept of social connection or personalization. Still, it was a bold start and laid the foundation for the versions ahead.',
      }
    ]);


  }, []);

  return (
    <div className="AboutPage w-full min-h-screen bg-zinc-950 py-10 px-4">
      <h1 className="text-white text-2xl font-semibold mb-6 text-center">App Update History</h1>
      <div className="update-container flex flex-col gap-6 max-w-3xl mx-auto">
        {updates.map((item, index) => (
          <div
            key={index}
            className="update flex flex-col gap-3 rounded-lg shadow-sm p-6 dark:bg-zinc-900 border border-zinc-800"
          >
            <div className="title-container flex flex-col md:flex-row justify-between items-center gap-2">
              <p className="dark:text-white font-bold text-lg text-center md:text-left">{item.title}</p>
              <div className="flex gap-3 items-center">
                <span className="text-xs text-zinc-400">{item.date}</span>
                <span className="bg-primary text-white text-sm font-medium rounded-md py-1 px-4">
                  Version {item.version}
                </span>
              </div>
            </div>
            <p className="text-sm dark:text-gray-300 text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
