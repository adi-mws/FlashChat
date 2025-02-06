import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./ChatInterface.css";

const socket = io("http://localhost:3000/chats"); // Connect to backend WebSocket

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState({});
  const [users, setUsers] = useState(["Alice", "Bob", "Charlie"]);
  const [selectedUser, setSelectedUser] = useState(null);
  const currentUser = "me"; // Assume logged-in user

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => ({
        ...prev,
        [data.sender]: [...(prev[data.sender] || []), data],
      }));
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!selectedUser || message.trim() === "") return;

    const newMessage = { text: message, sender: currentUser, receiver: selectedUser };
    setMessages((prev) => ({
      ...prev,
      [selectedUser]: [...(prev[selectedUser] || []), newMessage],
    }));

    socket.emit("send_message", newMessage);
    setMessage("");
  };

  return (
    <div className="chat-container">
      <div className="user-list">
        <h3>Users</h3>
        {users.map((user, index) => (
          <div
            key={index}
            className={`user-item ${selectedUser === user ? "active" : ""}`}
            onClick={() => setSelectedUser(user)}
          >
            {user}
          </div>
        ))}
      </div>

      <div className="chat-box">
        {selectedUser ? (
          <>
            <h2>Chat with {selectedUser}</h2>
            <div className="message-container">
              {(messages[selectedUser] || []).map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.sender === currentUser ? "sent" : "received"}`}
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
          </>
        ) : (
          <h2 className="select-user-message">Select a user to chat</h2>
        )}
      </div>
    </div>
  );
}
