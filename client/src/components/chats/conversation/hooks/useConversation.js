import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  selectChats,
  selectSelectedChat,
  selectOnlineUsers,
  selectMessages,
  selectSendingMessages,
  selectLoadingMessages,
  selectLoadingChats,
  selectHasFetchedChats,
  setSelectedChat,
  fetchMessages,
  selectDraft,
  setActiveMessage,
  setActiveAttachements,
} from "../../../../redux/slices/chatsSlice";
import { selectUser } from "../../../../redux/slices/authSlice";
import { socket } from "../../../../lib/socket";

/*
  useConversation
  Coordinates chat room participation, socket join/seen events,
  message feed, draft hydration, and auto-scrolling.
*/
export default function useConversation(chatId) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const chats = useSelector(selectChats);
  const selectedChat = useSelector(selectSelectedChat);
  const onlineUsers = useSelector(selectOnlineUsers);
  const messages = useSelector(selectMessages);
  const sendingMessages = useSelector(selectSendingMessages);
  const loadingMessages = useSelector(selectLoadingMessages);
  const loadingChats = useSelector(selectLoadingChats);
  const hasFetchedChats = useSelector(selectHasFetchedChats);
  const user = useSelector(selectUser);

  const messagesEndRef = useRef(null);
  const isLoadingDraft = useRef(false);

  const chat = chats.find((c) => c._id === chatId);
  const allMessages = [...messages, ...sendingMessages];

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Set selected chat immediately upon mount / chatId change
  useEffect(() => {
    if (!chatId) return;
    dispatch(setSelectedChat(chatId));

    return () => {
      dispatch(setSelectedChat(null));
    };
  }, [chatId, dispatch]);

  // Join chat room on socket
  useEffect(() => {
    if (!chatId || !user?.id) return;

    socket.emit("joinChat", {
      chatId,
      userId: user.id,
    });

    return () => {
      socket.emit("leaveChat", { chatId });
    };
  }, [chatId, user?.id]);

  // Fetch messages and emit seen
  useEffect(() => {
    if (!chatId || !user) return;

    dispatch(fetchMessages({ chatId, user })).then((action) => {
      if (action.meta.requestStatus === "fulfilled") {
        const rawMessages = action.payload.rawMessages;
        if (rawMessages && rawMessages.length > 0) {
          rawMessages
            .filter((msg) => !(msg.readBy || []).includes(user.id))
            .forEach((msg) => {
              socket.emit("seenMessage", {
                messageId: msg._id,
                chatId,
                senderId: msg.sender._id,
                userId: user.id,
              });
            });
        }
      }
    });
  }, [chatId, user, dispatch]);

  // Load drafts for active chat
  const draft = useSelector((state) => selectDraft(state, chatId));
  useEffect(() => {
    if (!chatId) return;

    isLoadingDraft.current = true;
    dispatch(setActiveMessage(draft?.message || ""));
    dispatch(setActiveAttachements(draft?.attachments || []));

    setTimeout(() => {
      isLoadingDraft.current = false;
    }, 0);
  }, [chatId, dispatch]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, sendingMessages]);

  return {
    chat,
    chatId,
    chats,
    selectedChat,
    onlineUsers,
    user,
    messages,
    sendingMessages,
    allMessages,
    loadingMessages,
    loadingChats,
    hasFetchedChats,
    messagesEndRef,
    scrollToBottom,
    navigate,
    dispatch,
  };
}
