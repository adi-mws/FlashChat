import React, { useState, useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useNotification } from "../contexts/NotificationContext";
const socket = io('http://localhost:3000'); // Connect to backend WebSocket
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import SelectChat from "./SelectChat";
import NoChatsFound from "./NoChatsFound";
import SearchUsers from "./forms/SearchUsers";
export default function ChatInterface() {
  const {
    handleSubmit,
    register,
    reset,

  } = useForm();
  const { showNotification } = useNotification();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState({});
  const [chats, setChats] = useState([]);
  const { user, loading } = useAuth();
  const [selectedChat, setSelectedChat] = useState({});

  const navgiate = useNavigate();

  // loading States
  useEffect(() => {

    socket.connect();
    socket.emit("join", user?.id);

    socket.on("receiveMessage", (data) => {
      console.log(data);

      // Find the correct chat object
      const chat = chats.find((e) => e.chatId === data.chatId);

      if (!chat) {
        console.warn("Chat ID not found for received message:", data);
        return;
      }
      // if (!user.name === (chats.map((user) => selectedChat.chatId === user.chatId))._id) {
      setMessages((prev) => ({
        ...prev,
        [chat.chatId]: [
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
  }, [user, useMemo(() => chats, [chats])]);

  // Form onSubmit
  const onSubmit = async (data) => {
    data.user1Id = user.id;
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
      // hhfc.in api.hhfc.in
      // http://123.341.231/api
      if (response.status === 201) {
        const d = response.data;
        reset();
        // console.log(d)
        showNotification('success', 'Chat created Successfully!')
        setChats((prev) => ([
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
  // useEffect(() => {
  //   setChats([
  //     {
  //       name: 'Aditya Raj',
  //       username: 'adi-mws',
  //       chat_id: '230498ujkjaofs',
  //       pfp: 'http://localhost:3000/uploads/pfps/default-pfp.jpeg',
  //       online: true
  //     },
  //     {
  //       name: 'Aditya Raj',
  //       username: 'adi-mws',
  //       pfp: 'http://localhost:3000/uploads/pfps/default-pfp.jpeg',
  //       online: true
  //     },
  //     {
  //       name: 'Aditya Raj',
  //       username: 'adi-mws',
  //       pfp: 'http://localhost:3000/uploads/pfps/default-pfp.jpeg',
  //       online: true
  //     },
  //     {
  //       name: 'Aditya Raj',
  //       username: 'adi-mws',
  //       pfp: 'http://localhost:3000/uploads/pfps/default-pfp.jpeg',
  //       online: true,
  //     }

  //   ])
  //   if (!loading) {

  //     const fetchData = async () => {
  //       try {
  //         const response = await axios.get(`${import.meta.env.VITE_API_URL}/chats/${user?.id}`, { // Removed extra `}`
  //           withCredentials: true
  //         });

  //         if (response.status === 200) {
  //           const d = response.data;
  //           // console.log(d);

  //           setChats(d.chats)
  //         }

  //       } catch (e) {
  //         console.error(e);
  //         showNotification('error', e?.response?.data?.message || "An error occurred");
  //       }
  //     }
  //     // fetchData();
  //   }
  //   // console.log(chats);
  // }, [loading]); // Dependency array should include `user.id` if it changes dynamically



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

    const newMessage = { message: message, senderId: user?.id, chatId: selectedChat.chatId };


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

  if (loading) {
    return <span className="animate-spin border-2 ms-2 block border-white rounded-full w-3 h-3 border-t-transparent"></span>
  }
  return (
    <>
      <div className="chat-container h-[calc(100vh-60px)] w-full grid grid-cols-[350px_calc(100%-350px)]">
        <div className="user-list dark:bg-gray-950 h-full border-r-1 border-gray-300 dark:border-gray-900 flex flex-col">
          <div className="user-list-header bg-slate-100 dark:bg-slate-900 flex flex-row items-center h-15 px-10 justify-between">
            <h3 className="dark:text-white text-center py-2">Chats</h3>
            <button className="dark:text-white text-sm"><i className="fa-solid fa-user-plus"></i></button>
          </div>

          {chats.map((chat, index) => (
            <>
              <div onClick={() => { selectedChat.chat }} className="chat-list-item flex cursor-pointer dark:hover:bg-gray-900 items-center gap-5 py-4 px-5 border-b-1 dark:border-gray-700 border-gray-300">
                <div className="pfp-user-details flex items-center gap-5">
                  <div className="pfp-wrapper relative">
                    <img src={user.pfp} className="w-12 h-12 rounded-full" alt="" />
                    <span className="w-3 h-3 rounded-full bg-green-700 absolute bottom-0 right-1"></span>
                  </div>
                  <div className="user-details flex flex-col">
                    <p className="user-name dark:text-white text-md">Aditya Raj</p>
                    <p className="user-username dark:text-primary-1 gray-200 text-sm">adi-mws</p>
                  </div>
                </div>

              </div>
            </>
          ))}


        </div>

        <div className="chat-box place-items-center grid dark:bg-gray-950">
          {chats.length === 0 ?
            <NoChatsFound />
            : selectedChat.chatId ? (
              <>
                <div className="chat-header w-full h-50 block dark:bg-black ">
                  <img src={selectedChat.userId} alt="" className="w-15 h-15 rounded-full" />
                  <p className="chat-user-name dark:text-white">Aditya Raj</p>
                  <p className="chat-user-username dark:primary-1">adi-mws</p>
                </div>
                <div className="message-container" ref={messageContainer} >
                  {/* {console.log(messages)} */}
                  {(messages[selectedChat.chatId] || []).map((msg, index) => (
                    <div
                      key={index}
                      className={`message ${msg.sender === user?.id ? "sent" : "received"}`}
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

              <SelectChat />
            )}
        </div>
      </div >
      <SearchUsers />

    </>
  );
}


