import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className='Landing w-full flex items-center flex-col'>
      <div className='hero-section-content min-h-screen items-center flex w-full flex-col gap-8 md:p-10 xl:p-17 sm:p-8 p-2 sm:mt-0 mt-30'>
        <p className="hero-section-title text-3xl w-full font-bold bg-gradient-to-b text-white lg:text-8xl md:text-5xl xs:text-4xl text-center">Talk One-on-One. Fast, Secure, Limitless</p>
        <p className="hero-section-description text-gray-800 sn:w-[70%] w-[100%] dark:text-gray-300 text-center">FlashChat is a simple application which connects two users on a chat for real time communication. Simply search the user with the registered email and start chatting.</p>
        <div className="flex gap-5 flex-col items-center md:flex-row">
          <button className="rounded-md font-bold bg-primary-1 text-white hover:scale-105 transition sm:text-md md:w-auto w-[80dvw] duration-300 text-sm py-4 lg:px-15 px-8" onClick={() => { navigate(user ? '/chats' : '/login') }}>Start Chatting</button>
          <button onClick={() => { navigate('/about') }} className="rounded-md text-sm sm:text-md text-zinc-400 font-bold bg-gray-1000 md:w-auto w-[80dvw] hover:scale-105 transition duration-300 py-4 lg:px-10 px-8 border-1 border-zinc-400 hover:bg-orange-1000">About Application</button>
        </div>
      </div>


      {/* Get started section for app tutorials */}
      <div className='w-full flex flex-col gap-5 p-5 items-center  '>
        <div className="title-container flex flex-col gap-2 items-center">
          <p className="title text-3xl md:text-5xl dark:text-white">Get Started</p>
          <p className="title text-md dark:text-zinc-300">Get started with flashchat in very easy steps</p>
        </div>

        <img src="/screenshots/chatting.png" alt="screenshot" className='text-xs mt-10' />


        <div className=' flex flex-col gap-4 items-center justify-center xl:grid xl:grid-cols-2 xl:grid-rows-1 w-full'>
          <div className='bg-primary w-full p-8 sm:p-10 shrink-1 xl:p-15 flex flex-col gap-6 xl:gap-10'>
            <p className="lg:text-4xl dark:text-white text-2xl"> Create Your Account</p>
            <p className="xl:text-md dark:text-zinc-300 relative text-sm">To begin, go to the Login page and choose "Continue with Google" for instant access.
              Don't want to use Google? You can also create an account from the Register page.</p>
          </div>
          <div className='w-full flex items-center justify-center '>
            <img src="/screenshots/login-page.png" alt="screenshot" className='text-xs sm:w-80 mt-10' />
            <img src="/screenshots/register-page.png" alt="screenshot" className='text-xs  hidden sm:block sm:w-80 mt-10' />
          </div>
        </div>
        {/* STEP: Log In to Your Account */}
        <div className='flex flex-col items-center md:items-stretch md:grid md:grid-cols-2 gap-2 w-full'>
          <div className='w-full flex items-center justify-center dark:bg-zinc-950 order-1 md:order-2'>
            <img src="/screenshots/login-after.png" alt="screenshot" className='text-xs mt-10' />
          </div>
          <div className='bg-zinc-950 w-full p-8 md:p-15 flex flex-col order-2 md:order-1 gap-5 md:gap-10'>
            <p className="text-2xl md:text-4xl dark:text-white">Log In to Your Account</p>
            <p className="text-sm md:text-md dark:text-zinc-300 relative">
              Once registered, head to the Login page. Use your credentials or simply click "Continue with Google" to log in instantly. Seamless, secure, and quick — you're in!
            </p>
          </div>
        </div>

        {/* STEP: Personalize Your Profile */}
        <div className='flex flex-col items-center md:items-stretch md:grid md:grid-cols-2 gap-2 w-full'>
          <div className='w-full flex items-center justify-center dark:bg-zinc-950 order-1 md:order-1'>
            <img src="/screenshots/profile.png" alt="screenshot" className='text-xs mt-10' />
          </div>
          <div className='bg-zinc-950 w-full p-8 md:p-15 flex flex-col order-2 md:order-2 gap-5 md:gap-10'>
            <p className="text-2xl md:text-4xl dark:text-white">Personalize Your Profile</p>
            <p className="text-sm md:text-md dark:text-zinc-300 relative">
              Click your avatar or navigate to your Profile Page. Add a name, profile picture, and a short about. This helps friends recognize you easily!
            </p>
          </div>
        </div>

        {/* STEP: Explore Chats & Make Friends */}
        <div className='flex flex-col items-center md:items-stretch md:grid md:grid-cols-2 gap-2 w-full'>
          <div className='w-full flex items-center justify-center dark:bg-zinc-950 order-1 md:order-2'>
            <img src="/screenshots/friends.png" alt="screenshot" className='text-xs mt-10' />
          </div>
          <div className='bg-zinc-950 w-full p-8 md:p-15 flex flex-col order-2 md:order-1 gap-5 md:gap-10'>
            <p className="text-2xl md:text-4xl dark:text-white">Explore Chats & Make Friends</p>
            <p className="text-sm md:text-md dark:text-zinc-300 relative">
              Head over to the Chats section from the sidebar or home screen. You’ll see a list of existing contacts — or send a friend request to start building your list!
              You can also accept or reject friend requests from others. No messages yet? That’s okay — your chat world is about to grow!
            </p>
          </div>
        </div>

        {/* STEP: Start Chatting! */}
        <div className='flex flex-col items-center md:items-stretch md:grid md:grid-cols-2 gap-2 w-full'>
          <div className='w-full flex items-center justify-center dark:bg-zinc-950 order-1 md:order-1'>
            <img src="/screenshots/chatting.png" alt="screenshot" className='text-xs mt-10' />
          </div>
          <div className='bg-zinc-950 w-full p-8 md:p-15 flex flex-col order-2 md:order-2 gap-5 md:gap-10'>
            <p className="text-2xl md:text-4xl dark:text-white">Start Chatting!</p>
            <p className="text-sm md:text-md dark:text-zinc-300 relative">
              Pick a friend from your chat list and start a conversation. Send messages, share emojis, and stay connected in real-time. You're all set — enjoy the experience and make every chat count!
            </p>
            <button onClick={() => navigate('/chats')} className='bg-primary text-white text-sm px-8 py-3 w-fit rounded-md'>
              Go to Chats
            </button>
          </div>
        </div>

        <footer className="bg-black dark:bg-zinc-950 text-white dark:text-zinc-300 w-full px-6 py-10 mt-20">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

            {/* Branding / About Section */}
            <div className="text-center md:text-left">
              <h2 className="text-lg font-semibold text-white dark:text-white">FlashChat</h2>
              <p className="text-sm text-zinc-400 dark:text-zinc-400 mt-1">
                One-on-one messaging. Reimagined. Simple, fast & real-time.
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex gap-6 text-sm">
              <Link to="/chats" className="hover:text-primary transition-colors dark:hover:text-primary">Chats</Link>
              <Link to="/about" className="hover:text-primary transition-colors dark:hover:text-primary">About</Link>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800 dark:border-zinc-800 my-6" />

          {/* Copyright */}
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-zinc-500 dark:text-zinc-500">
            <p>&copy; {new Date().getFullYear()} FlashChat. All rights reserved.</p>
            <p>Developed with ❤️ by <span className="text-white dark:text-white font-semibold">Aditya Raj</span></p>
          </div>
        </footer>




      </div>
    </div >
  )
}
