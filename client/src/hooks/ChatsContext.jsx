// context/ChatContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useNotification } from "./NotificationContext";
import { useAuth } from "./AuthContext";

export const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:3000", {
  autoConnect: false,
  withCredentials: true,
});

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null); // only chatId string
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Fetch all chats for user
  const fetchChats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/chats/get-all/${user.id}`, {
        withCredentials: true,
      });
      // console.log(res.data.chats)
      setChats(res.data.chats);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
      showNotification("error", "Failed to load chats");
    }
  }, [user]);

  // Initialize socket
  useEffect(() => {
    if (!user) return;

    fetchChats();

    if (!socket.connected) {
      socket.connect();
      socket.emit("join", user.id);
    }

    socket.on("onlineUsers", setOnlineUsers);
    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
    });

    return () => {
      socket.off("onlineUsers");
      socket.off("connect_error");
    };
  }, [user, fetchChats]);

  // Seen message acknowledgment (optional log)
  useEffect(() => {
    socket.on("receiverSeenMessage", ({ chatId, messageId, receiverId }) => {
      // console.log(`Message ${messageId} in chat ${chatId} seen by ${receiverId}`);
    });

    return () => {
      socket.off("receiverSeenMessage");
    };
  }, []);

  // Emit a new message
  const sendMessage = useCallback((chatId, message, receiverId) => {
    socket.emit("sendMessage", {
      chatId,
      message,
      receiverId,
    });
  }, []);

  // Emit seen messages
  const emitSeenMessages = useCallback(
    (chatId, messages) => {
      if (!messages || !Array.isArray(messages)) return;

      const unreadMessages = messages.filter(
        (msg) => !(msg.readBy || []).includes(user?.id)
      );

      unreadMessages.forEach((msg) => {
        socket.emit("seenMessage", {
          messageId: msg._id,
          chatId,
          senderId: msg.sender._id,
          userId: user?.id,
        });
      });
    },
    [user]
  );

  // Listen to new incoming messages
  const listenToMessages = useCallback(() => {
    socket.off("newMessage");

    socket.on("newMessage", (incomingMessage) => {
      const { chatId } = incomingMessage;

      // Update unread count if user is not viewing this chat
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat._id === chatId) {
            const isCurrentChatOpen = selectedChat === chatId;
            return {
              ...chat,
              unreadCount: isCurrentChatOpen
                ? 0
                : (chat.unreadCount || 0) + 1,
              latestMessage: incomingMessage,
            };
          }
          return chat;
        })
      );
    });
  }, [selectedChat]);

  // Join a specific chat room
  const joinChat = useCallback(
    (chatId) => {
      if (!chatId || !user) return;
      socket.emit("joinChat", { chatId, userId: user.id });
    },
    [user]
  );

  return (
    <ChatContext.Provider
      value={{
        chats,
        setChats,
        selectedChat,
        setSelectedChat,
        onlineUsers,
        sendMessage,
        emitSeenMessages,
        listenToMessages,
        joinChat,
        socket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
