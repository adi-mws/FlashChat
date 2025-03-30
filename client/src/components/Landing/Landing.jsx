import React from 'react'
import './Landing.css'

export default function Landing() {
  return (
    <div className='Landing'>
        <div className="hero-section">
            <div className='hero-section-content'>
                <p className="hero-section-title">Instant, Seamless, <span>Real-Time Communication</span></p>
                <p className="hero-section-description">QuickRTC is a simple application which connects two users on a chat for real time communication. Simply search the user with the registered email and start chatting.</p>
                <button className="hero-section-chat-redirect-button">Start Chatting Now</button>
            </div>
            <div className='hero-section-image'></div>
        </div>
    </div>
  )
}
