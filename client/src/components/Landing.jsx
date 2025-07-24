import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className='Landing w-full flex items-center flex-col'>
      <div className='hero-section-content min-h-screen items-center flex w-full flex-col gap-8 md:p-10 xl:p-17 p-8'>
        <p className="hero-section-title text-3xl w-full font-bold bg-gradient-to-b text-white lg:text-8xl md:text-5xl xs:text-4xl text-center">Talk One-on-One. Fast, Secure, Limitless</p>
        <p className="hero-section-description text-gray-800 w-[70%] dark:text-gray-300 text-center">FlashChat is a simple application which connects two users on a chat for real time communication. Simply search the user with the registered email and start chatting.</p>
        <div className="flex gap-5 flex-col items-center md:flex-row">
          <button className="rounded-md font-bold bg-primary-1 text-white hover:scale-105 transition duration-300 py-4 lg:px-15 px-8" onClick={() => { navigate(user ? '/chats' : '/login') }}>Start Chatting</button>
          <button onClick={() => { navigate('/about') }} className="rounded-md text-zinc-400 font-bold bg-gray-1000 hover:scale-105 transition duration-300 py-4 lg:px-10 px-8 border-1 border-zinc-400 hover:bg-orange-1000">About Application</button>
        </div>
      </div>
      <div className='w-full flex flex-col gap-5 p-5 items-center  '>
        <div className="title-container flex flex-col gap-2 items-center">
          <p className="title text-5xl dark:text-white">Get Started</p>
          <p className="title text-md dark:text-zinc-300">Get started with flashchat in very easy steps</p>4</div>

        <div className='grid grid-cols-2 w-full'>
          <div className='bg-primary w-full p-15 flex flex-col gap-10'>
            <p className="text-4xl dark:text-white"> Create Your Account</p>
            <p className="text-md dark:text-white relative">To begin, go to the Login page and choose "Continue with Google" for instant access.
              Don't want to use Google? You can also create an account from the Register page.</p>
          </div>
          <div className='w-full flex items-center justify-center '>
            <img src="/screenshots/mobile-chat-list.png" alt="screenshot" className='text-xs w-60 mt-10' />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-2 w-full'>
          <div className='w-full flex items-center justify-center dark:bg-zinc-950'>
            <img src="/screenshots/mobile-chat-list.png" alt="screenshot" className='text-xs w-60 mt-10' />
          </div>
          <div className='bg-zinc-950 w-full p-15 flex flex-col gap-10'>
            <p className="text-4xl dark:text-white">Log In to Your Account</p>
            <p className="text-md dark:text-white relative">Once registered, head to the Login page.
              Use your credentials or simply click "Continue with Google" to log in instantly.
              Seamless, secure, and quick — you're in!</p>
          </div>
        </div>


        <div className='grid grid-cols-2 gap-2 w-full'>
          <div className='bg-zinc-950 w-full p-15 flex flex-col gap-10'>
            <p className="text-4xl dark:text-white">Personalize Your Profile</p>
            <p className="text-md dark:text-white relative">Click your avatar or navigate to your Profile Page.
              Add a name, profile picture, and a short about.
              This helps friends recognize you easily!</p>
          </div>
          <div className='w-full flex items-center justify-center dark:bg-zinc-950'>
            <img src="/screenshots/mobile-chat-list.png" alt="screenshot" className='text-xs w-60 mt-10' />
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2 w-full'>
          <div className='w-full flex items-center justify-center dark:bg-zinc-950'>
            <img src="/screenshots/mobile-chat-list.png" alt="screenshot" className='text-xs w-60 mt-10' />
          </div>
          <div className='bg-zinc-950 w-full p-15 flex flex-col gap-10'>
            <p className="text-4xl dark:text-white"> Explore Chats & Make Friends</p>
            <p className="text-md dark:text-white relative">Head over to the Chats section from the sidebar or home screen.
              You’ll see a list of existing contacts — or send a friend request to start building your list!
              You can also accept or reject friend requests from others.
              No messages yet? That’s okay — your chat world is about to grow!</p>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2 w-full'>
          <div className='bg-zinc-950 w-full p-15 flex flex-col gap-10'>
            <p className="text-4xl dark:text-white">Start Chatting!
            </p>
            <p className="text-md dark:text-white relative">
              Pick a friend from your chat list and start a conversation.
              Send messages, share emojis, and stay connected in real-time.
              You're all set — enjoy the experience and make every chat count!</p>

            <button className='bg-primary text-white text-sm px-8 py-3'></button>
          </div>
          <div className='w-full flex items-center justify-center dark:bg-zinc-950'>
            <img src="/screenshots/mobile-chat-list.png" alt="screenshot" className='text-xs w-60 mt-10' />
          </div>

        </div>



      </div>
    </div>
  )
}
