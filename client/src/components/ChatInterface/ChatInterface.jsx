import React, { useState, useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import "./ChatInterface.css";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useNotification } from "../../contexts/NotificationContext";
const socket = io('http://localhost:3000'); // Connect to backend WebSocket
import axios from "axios";
export default function ChatInterface() {
  const {
    handleSubmit,
    register,
    reset,

  } = useForm();
  const { showNotification } = useNotification();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState({});
  const [users, setUsers] = useState([]);
  const { admin } = useAuth();
  const [selectedChat, setSelectedChat] = useState({});
  const currentUser = admin.id;

  const navgiate = useNavigate();

  // loading States 
  const [userLoading, setUserLoading] = useState(false);
  useEffect(() => {
    socket.connect();
    socket.emit("join", admin.id);

    socket.on("receiveMessage", (data) => {
      console.log(data);

      // Find the correct chat object
      const chat = users.find((e) => e.chatId === data.chatId);

      if (!chat) {
        console.warn("Chat ID not found for received message:", data);
        return;
      }
      // if (!admin.name === (users.map((user) => selectedChat.chatId === user.chatId))._id) {
        setMessages((prev) => ({
          ...prev,
          [chat.chatId]: [  // ✅ Use correct `chatId`
            ...(prev[chat.chatId] || []),
            {
              message: data.message,
              read: false, // or true based on logic
              sender: data.sender,
              _id: data._id,
            },
          ],
        }));
      // }
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [admin, useMemo(() => users, [users])]);

  // Form onSubmit
  const onSubmit = async (data) => {
    data.user1Id = admin.id;
    // console.log(data);

    try {

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/chats/create`,
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`, // Assuming token is stored in localStorage
            "Content-Type": "application/json", // Ensure correct content type
          },
        }
      );
      if (response.status === 201) {
        const d = response.data;
        reset();
        // console.log(d)
        showNotification('success', 'Chat created Successfully!')
        setUsers((prev) => ([
          ...prev,
          d.user
        ]))
      }
      else if (response.status === 200) {
        reset();
        showNotification('error', response.data.message)
      }

    } catch (e) {
      console.error(e)
      showNotification('error', 'Error', e?.response?.data?.message);
    }
  }

  // Connecting websockets
  // Fetching all the chats according to the user name; 
  useEffect(() => {


    const fetchData = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/chats/${admin.id}`, { // Removed extra `}`
          headers: {
            Authorization: `Bearer ${localStorage.getItem('jwtToken')}`
          }
        });

        if (response.status === 200) {
          const d = response.data;
          // console.log(d);

          setUsers(d.users)
        }

      } catch (e) {
        console.error(e);
        showNotification('error', e?.response?.data?.message || "An error occurred");
      }
    }
    fetchData();
    // console.log(users);
  }, []); // Dependency array should include `admin.id` if it changes dynamically



  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/chats/get-messages/${selectedChat.chatId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`
          }
        })
        if (response.status === 200) {
          const data = response.data

          setMessages(prev => ({
            ...prev,
            [selectedChat.chatId]: data.messages,
          }))
        }
      }
      catch (e) {
        console.error(e);
        showNotification("error", "Internal Server Error");
      }
    }
    if (selectedChat.chatId) {
      fetchMessages();
    }
  }, [selectedChat.chatId])


  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedChat.chatId || message.trim() === "") return;

    const newMessage = { message: message, senderId: currentUser, chatId: selectedChat.chatId };


    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/chats/send-message`, newMessage, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwtToken")}`
        }
      })
      if (response.status === 201) {
        // showNotification("success", response.data.message)
        const data = response.data
        // console.log(data)
        setMessages((prev) => ({
          ...prev,
          [selectedChat.chatId]: [
            ...(prev[selectedChat.chatId] || []),
            {
              message: data.newMessage.content,
              read: data.newMessage.read, // or true based on logic
              sender: data.newMessage.sender,
              _id: data.newMessage._id,
            },
          ],
        }));
      }
      else {
        showNotification("error", response.data.message);
      }
    }
    catch (error) {
      console.error(error);
      showNotification("error", `Error ${e?.response?.data?.message}`)
    }
    setMessage("");
  };





  const messageContainer = useRef(null);

  useEffect(() => {
    if (messageContainer.current) {
      messageContainer.current.scrollTop = messageContainer.current.scrollHeight;
    }
  }, [messages]);


  return (
    <div className="chat-container">
      <div className="user-list">
        <h3>Users</h3>
        <form className="chat-form" onSubmit={handleSubmit(onSubmit)}>
          <input
            type="email"
            placeholder="Enter Email"
            {...register("user2Email", { required: "Email is required" })}
          />
          <button type="submit">Chat</button>
        </form>
        {users.map((user, index) => (
          <div
            key={index}
            className={`user-item ${selectedChat.chatId === user ? "active" : ""}`}
            onClick={() => setSelectedChat({ chatId: user.chatId, name: user.name })}
          >
            {user._id == admin.id ? `Me ${(user.name)}` : user.name}
          </div>
        ))}
      </div>

      <div className="chat-box">
        {selectedChat.chatId ? (
          <>
            <h2>Chat with {selectedChat.name}</h2>
            <div className="message-container" ref={messageContainer}>
              {/* {console.log(messages)} */}
              {(messages[selectedChat.chatId] || []).map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.sender === currentUser ? "sent" : "received"}`}
                >
                  {msg.message}
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


