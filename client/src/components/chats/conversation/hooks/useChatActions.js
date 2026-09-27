import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  deleteMessage,
  deleteAllMessages,
  deleteContact,
  removeGroupMember,
} from "../../../../redux/slices/chatsSlice";
import { useNotification } from "../../../../hooks/useNotification";
import { CHAT_ROUTES } from "../../../../../routes/routes";

/**
 * useChatActions
 * Handles message deletion, clearing chat history, deleting contacts,
 * and leaving group chats with appropriate confirmations and notifications.
 */
export default function useChatActions({ chatId, chat, user }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState({
    clientX: 0,
    clientY: 0,
    show: false,
    messageId: null,
  });

  const handleShowMessageOptions = (e, type, id) => {
    const left = type === "sender" ? e.clientX - 160 : e.clientX;
    const top = e.clientY;
    setShowMessageOptions({ clientX: left, clientY: top, show: true, messageId: id });
  };

  const handleDeleteMessage = async (id) => {
    const confirmed = window.confirm("Do you want to delete this message?");
    if (!confirmed) return;

    const result = await dispatch(deleteMessage({ messageId: id, chatId }));
    if (result.meta.requestStatus === "rejected") {
      showNotification("Failed to delete message", "error");
    }
  };

  const handleClearChat = async () => {
    if (
      window.confirm(
        "Do you want to delete all the chats? This action will permanently delete all the messages of this chat."
      )
    ) {
      const result = await dispatch(deleteAllMessages(chatId));
      if (result.meta.requestStatus === "fulfilled") {
        showNotification("All messages deleted successfully", "success");
      } else {
        showNotification("Error deleting messages", "error");
      }
    }
  };

  const handleDeleteContact = async () => {
    if (
      window.confirm(
        "Do you want to delete this contact? This action will remove the user from your friend list and delete all the messages as well!"
      )
    ) {
      const result = await dispatch(deleteContact(chatId));
      if (result.meta.requestStatus === "fulfilled") {
        showNotification("Contact deleted successfully", "info");
        navigate(CHAT_ROUTES.root);
      } else {
        showNotification("Error deleting contact", "error");
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      try {
        await dispatch(
          removeGroupMember({ chatId, targetUserId: user.id, currentUserId: user.id })
        ).unwrap();
        showNotification("You left the group.", "info");
        navigate(CHAT_ROUTES.root);
      } catch (err) {
        showNotification(err || "Failed to leave group.", "error");
      }
    }
  };

  return {
    showChatOptions,
    setShowChatOptions,
    showMessageOptions,
    setShowMessageOptions,
    handleShowMessageOptions,
    handleDeleteMessage,
    handleClearChat,
    handleDeleteContact,
    handleLeaveGroup,
  };
}
