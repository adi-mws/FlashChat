import { useRef, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectActiveMessage,
  setActiveMessage,
  addSendingMessage,
  removeDraft,
} from "../../../../redux/slices/chatsSlice";
import { selectIsOnline } from "../../../../redux/slices/uiSlice";
import { useNotification } from "../../../../hooks/useNotification";
import { encryptMessage, fetchEncryptionRecipients } from "../../../../lib/crypto";
import { socket } from "../../../../lib/socket";

/**
 * useMessageSender
 * Handles message input state, textarea auto-resizing, multi-session E2EE encryption,
 * optimistic updates, and socket emission.
 */
export default function useMessageSender({ chatId, chat, user }) {
  const dispatch = useDispatch();
  const isOnline = useSelector(selectIsOnline);
  const { showNotification } = useNotification();
  const message = useSelector(selectActiveMessage);

  const textareaRef = useRef(null);
  const [isMobile] = useState(() => window.innerWidth < 640);

  // Auto focus textarea when chat changes
  useEffect(() => {
    textareaRef.current?.focus();
  }, [chatId]);

  const handleChange = (e) => {
    dispatch(setActiveMessage(e.target.value));

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const getReceiverId = () => {
    return chat?.participant?._id || chat?.participants?.find((p) => (p?._id || p)?.toString() !== user?.id?.toString())?._id || null;
  };

  const handleSendMessage = async () => {
    if (!isOnline) {
      showNotification("You are offline. Message not sent.", "error");
      return;
    }

    const trimmed = message?.trim();
    if (!trimmed || !chatId) return;

    const isGroup = chat?.isGroupChat;
    const receiverId = isGroup ? null : getReceiverId();

    const tempMessage = {
      chat: chatId,
      content: trimmed,
      sender: { _id: user.id },
      createdAt: new Date().toISOString(),
      isSending: true,
    };
    dispatch(addSendingMessage(tempMessage));

    let recipients = [];
    try {
      recipients = await fetchEncryptionRecipients(chatId);
    } catch (err) {
      console.warn("Failed to fetch session recipients:", err);
    }

    if (recipients.length > 0) {
      try {
        const encrypted = await encryptMessage(trimmed, recipients);
        socket.emit("sendMessage", {
          chatId,
          message: encrypted.ciphertext,
          receiverId,
          encryption: encrypted.encryption,
        });
        dispatch(setActiveMessage(""));
        dispatch(removeDraft(chatId));
        return;
      } catch (error) {
        console.error("Encryption error, sending plaintext fallback:", error);
      }
    }

    // Plaintext fallback
    socket.emit("sendMessage", {
      chatId,
      message: trimmed,
      receiverId,
      encryption: { isEncrypted: false },
    });
    dispatch(setActiveMessage(""));
    dispatch(removeDraft(chatId));
  };

  return {
    message,
    textareaRef,
    isMobile,
    handleChange,
    handleSendMessage,
  };
}
