// context/ChatContext.js
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import PropTypes from 'prop-types';
import { io } from "socket.io-client";
import axios from "axios";
import { useNotification } from "./NotificationContext";
import { useAuth } from "./AuthContext";
import { decryptMessage, encryptMessage } from "../lib/crypto";

export const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:3000", {
  autoConnect: false,
  withCredentials: true,
});

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, logout } = useAuth();
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
      const decryptedChats = await Promise.all(
        (res.data.chats || []).map(async (chat) => {
          if (chat.lastMessage?.encryption?.isEncrypted) {
            try {
              const decryptedContent = await decryptMessage(chat.lastMessage, user.id, user.username);
              return {
                ...chat,
                lastMessage: {
                  ...chat.lastMessage,
                  content: decryptedContent
                }
              };
            } catch (err) {
              console.error("Failed to decrypt last message in chat list:", err);
            }
          }
          return chat;
        })
      );
      setChats(decryptedChats);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
      showNotification("error", "Failed to load chats");
    }
  }, [user, showNotification]);

  // Initialize socket
  useEffect(() => {
    if (!user) return;

    fetchChats();

    if (!socket.connected) {
      socket.connect();
      socket.emit("join", user.id);
    }

    socket.on("onlineUsers", setOnlineUsers);
    
    socket.on("session_revoked", () => {
      console.log("Session revoked. Logging out...");
      logout();
    });

    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
      if (err.message === "Authentication error") {
        logout();
      }
    });

    return () => {
      socket.off("onlineUsers");
      socket.off("session_revoked");
      socket.off("connect_error");
    };
  }, [user, fetchChats, logout]);

  // Seen message acknowledgment (optional log)
  useEffect(() => {
    socket.on("receiverSeenMessage", () => {});

    return () => {
      socket.off("receiverSeenMessage");
    };
  }, []);

  // Emit a new message
  const sendMessage = useCallback(async (chatId, message, receiverId) => {
    const chatObj = chats.find(c => c._id === chatId);
    const senderPublicKey = user?.publicKey;
    const receiverPublicKey = chatObj?.participant?.publicKey;

    if (senderPublicKey && receiverPublicKey) {
      try {
        const encrypted = await encryptMessage(
          message,
          user.id,
          senderPublicKey,
          receiverId,
          receiverPublicKey
        );
        socket.emit("sendMessage", {
          chatId,
          message: encrypted.ciphertext,
          receiverId,
          encryption: encrypted.encryption
        });
        return;
      } catch (error) {
        console.error("Encryption error, sending plaintext fallback:", error);
      }
    }

    socket.emit("sendMessage", {
      chatId,
      message,
      receiverId,
      encryption: { isEncrypted: false }
    });
  }, [chats, user]);

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

    socket.on("newMessage", async (incomingMessage) => {
      const { chatId } = incomingMessage;
      let msgToSet = incomingMessage;

      if (incomingMessage.encryption?.isEncrypted) {
        try {
          const decryptedContent = await decryptMessage(incomingMessage, user?.id, user?.username);
          msgToSet = { ...incomingMessage, content: decryptedContent };
        } catch (err) {
          console.error("Failed to decrypt incoming message in list:", err);
        }
      }

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
              lastMessage: msgToSet,
            };
          }
          return chat;
        })
      );
    });
  }, [selectedChat, user]);

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

ChatProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
