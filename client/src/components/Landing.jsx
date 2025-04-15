import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className='Landing w-full flex flex-col'>
      <div className="hero-section h-150 grid md:grid-cols-[60%_40%] dark:bg-black dark:text-white">
        <div className='hero-section-content flex flex-col gap-5 md:p-10 p-8'>
          <p className="hero-section-title text-3xl font-bold bg-gradient-to-br from-orange-400 via-white-400 to-blue-700 md:text-start bg-clip-text text-transparent lg:text-7xl md:text-5xl xs:text-4xl text-center">Instant, Seamless, <span>Real-Time Communication</span></p>
          <p className="hero-section-description text-gray-800 dark:text-gray-300 md:text-start text-center">FlashChat is a simple application which connects two users on a chat for real time communication. Simply search the user with the registered email and start chatting.</p>
          <div className="flex gap-5 flex-col md:flex-row">
            <button className="rounded-md font-bold bg-primary-1 text-white hover:scale-105 transition duration-300 py-4 lg:px-10 px-8" onClick={() => { navigate('/chats') }}>Start Chatting</button>
            <button onClick={() => { navigate('/about') }} className="rounded-md text-primary font-bold bg-gray-1000 hover:scale-105 transition duration-300 py-4 lg:px-10 px-8 border-1 border-primary-1 hover:bg-orange-1000">About Application</button>
          </div>
        </div>
        <div className='hero-section-image '>
          <img src="/imgs/chattingApp.png" alt="" />
        </div>
      </div>
    </div>
  )
}
