import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./ChatInterface.css";

const socket = io("http://localhost:3000"); // Connect to backend WebSocket

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() === "") return;
    
    const newMessage = { text: message, sender: "me" };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    
    socket.emit("send_message", newMessage);
    setMessage(""); 
  };

  return (
    <div className="chat-container">
      <h2>Chat Room</h2>
      <div className="message-container">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === "me" ? "sent" : "received"}`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <form className="chat-input-wrapper" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">➤</button>
      </form>
    </div>
  );
}
