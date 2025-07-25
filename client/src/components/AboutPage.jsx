import React, { useEffect, useState } from 'react';

export default function AboutPage() {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    setUpdates([
        {
          version: '1.3.2',
          date: 'July 20, 2025',
          title: 'Bug Fixes and Minor Tweaks',
          description:
            'Resolved layout issues in the profile page. Improved socket reconnection handling. Fixed dark mode overflow bugs and added graceful error fallbacks for slow APIs.',
        },
        {
          version: '1.3.0',
          date: 'July 17, 2025',
          title: 'UI Enhancements',
          description:
            'Introduced animated onboarding screens, grid-based layout, and consistent padding across devices. Polished fonts, colors, and button interactions for a clean user experience.',
        },
        {
          version: '1.2.0',
          date: 'July 13, 2025',
          title: 'Realtime Engine & Profile Settings',
          description:
            'Enabled Socket.IO-based live messaging. Added editable user profiles — update name, picture, and about info. Also included toggle to hide/show last messages in chat list.',
        },
        {
          version: '1.1.0',
          date: 'May 12, 2025',
          title: 'Initial Feature Rollout',
          description:
            'Built early login, signup, and basic chat UI. Friend system introduced. App was unstable in places and missing real-time communication. Some design inconsistencies were left unresolved due to rushed rollout.',
        },
        {
          version: '1.0.0',
          date: 'April 2, 2025',
          title: 'Early Prototype Phase',
          description:
            'My first serious push into this project. Set up the basic MERN stack, authentication flow, and minimal UI. The app was full of hard-coded layouts, duplicate logic, and incomplete components. It was messy — but it started everything.',
        },
        {
          version: '1.4.0',
          date: 'July 21, 2025',
          title: 'Massive Cleanup & Rebuild',
          description:
            'After taking a break, I came back and almost rewrote the app from scratch. I removed a huge pile of junk and repetitive code, modularized components, and fixed deep architectural issues that were slowing everything down. It was a stressful phase — rewriting old logic, learning on the go, and facing errors that broke the whole app. But I did it. This version is finally stable, efficient, and a product I’m proud of.'
        }
      ]
      );
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
