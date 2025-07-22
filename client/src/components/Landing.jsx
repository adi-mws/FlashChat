import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className='Landing w-full flex items-center flex-col'>
        <div className='hero-section-content flex w-full items-center flex-col justify-center gap-8 md:p-10 xl:p-17 p-8'>
          <p className="hero-section-title text-3xl w-full font-bold bg-gradient-to-b text-white lg:text-8xl md:text-5xl xs:text-4xl text-center">Talk One-on-One. Fast, Secure, Limitless</p>
          <p className="hero-section-description text-gray-800 w-[70%] dark:text-gray-300 text-center">FlashChat is a simple application which connects two users on a chat for real time communication. Simply search the user with the registered email and start chatting.</p>
          <div className="flex gap-5 flex-col items-center md:flex-row">
            <button className="rounded-md font-bold bg-primary-1 text-white hover:scale-105 transition duration-300 py-4 lg:px-15 px-8" onClick={() => { navigate('/chats') }}>Start Chatting</button>
            <button onClick={() => { navigate('/about') }} className="rounded-md text-zinc-400 font-bold bg-gray-1000 hover:scale-105 transition duration-300 py-4 lg:px-10 px-8 border-1 border-zinc-400 hover:bg-orange-1000">About Application</button>
          </div>
        </div>
        
    </div>
  )
}
