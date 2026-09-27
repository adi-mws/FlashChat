import { useRef, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectActiveAttachements,
  setActiveAttachements,
  addSendingMessage,
  updateSendingMessageProgress,
  markSendingMessageFailed,
  removeSendingMessage,
  removeDraft,
} from "../../../../redux/slices/chatsSlice";
import { encryptFile, encryptMessage, fetchEncryptionRecipients } from "../../../../lib/crypto";
import { socket } from "../../../../lib/socket";

/**
 * useAttachmentUploader
 * Orchestrates file picking, camera capture, multi-session E2EE file encryption,
 * multipart upload with progress tracking, and socket emission.
 */
export default function useAttachmentUploader({ chatId, chat, user }) {
  const dispatch = useDispatch();

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachmentsButtonRef = useRef(null);

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [showSelectedAttachments, setShowSelectedAttachments] = useState(false);

  const selectedAttachments = useSelector(selectActiveAttachements);

  const handleImage = () => imageInputRef.current?.click();
  const handleCamera = () => setShowCameraPreview(true);
  const handleFile = () => fileInputRef.current?.click();

  const handleFileSelect = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newItems = Array.from(files).map((f) => ({ file: f }));
    dispatch(setActiveAttachements([...selectedAttachments, ...newItems]));
    setShowSelectedAttachments(true);
    event.target.value = "";
  };

  const handleSendAttachments = useCallback(
    (items /* [{ file, caption }] */) => {
      setShowSelectedAttachments(false);
      dispatch(setActiveAttachements([]));
      dispatch(removeDraft(chatId));

      const isGroup = chat?.isGroupChat;
      const receiverId = isGroup ? null : chat?.participant?._id;

      items.forEach(({ file, caption }) => {
        const tempId = `temp-att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const msgType = file.type.startsWith("image/") ? "image" : "file";
        const localBlobUrl = msgType === "image" ? URL.createObjectURL(file) : null;

        // Optimistic message in chat
        dispatch(
          addSendingMessage({
            _id: tempId,
            chat: chatId,
            type: msgType,
            content: caption || "",
            sender: { _id: user.id },
            localBlobUrl,
            fileName: file.name,
            fileSize: file.size,
            createdAt: new Date().toISOString(),
            isSending: true,
            readBy: [user.id],
          })
        );

        // Background encryption + upload + socket emit
        (async () => {
          try {
            let fileToUpload = file;
            let attachmentEncryption = { isEncrypted: false };

            let recipients = [];
            try {
              recipients = await fetchEncryptionRecipients(chatId);
            } catch (err) {
              console.warn("Failed to fetch session recipients for attachment:", err);
            }

            if (recipients.length > 0) {
              try {
                dispatch(updateSendingMessageProgress({ tempId, progress: 2 }));
                const result = await encryptFile(file, recipients);
                fileToUpload = new File(
                  [result.encryptedBlob],
                  file.name,
                  { type: "application/octet-stream" }
                );
                attachmentEncryption = result.attachmentEncryption;
              } catch (err) {
                console.warn("File encryption failed, sending plaintext:", err);
              }
            }

            const formData = new FormData();
            formData.append("file", fileToUpload);
            formData.append("originalName", file.name);
            formData.append("chatId", chatId);

            const uploadData = await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.withCredentials = true;

              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                  const pct = 5 + Math.round((e.loaded / e.total) * 83);
                  dispatch(updateSendingMessageProgress({ tempId, progress: pct }));
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve(JSON.parse(xhr.responseText));
                } else {
                  reject(new Error(`Upload failed: ${xhr.statusText}`));
                }
              };
              xhr.onerror = () => reject(new Error("Network error during upload"));

              xhr.open("POST", `${import.meta.env.VITE_API_URL}/chats/upload-attachment`);
              xhr.send(formData);
            });

            let captionPayload = caption || "";
            let captionEncryption = { isEncrypted: false };

            if (recipients.length > 0 && caption?.trim()) {
              try {
                const enc = await encryptMessage(caption.trim(), recipients);
                captionPayload = enc.ciphertext;
                captionEncryption = enc.encryption;
              } catch (err) {
                console.warn("Caption encryption failed:", err);
              }
            }

            dispatch(updateSendingMessageProgress({ tempId, progress: 95 }));

            socket.emit("sendMessage", {
              chatId,
              message: captionPayload,
              receiverId,
              encryption: captionEncryption,
              type: msgType,
              attachmentUrl: uploadData.url,
              fileName: file.name,
              fileSize: file.size,
              attachmentEncryption,
            });

            dispatch(updateSendingMessageProgress({ tempId, progress: 100 }));
            setTimeout(() => {
              dispatch(removeSendingMessage(tempId));
              if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
            }, 1200);
          } catch (err) {
            console.error("Attachment upload failed:", err);
            dispatch(markSendingMessageFailed(tempId));
          }
        })();
      });
    },
    [chatId, chat, user, dispatch]
  );

  return {
    imageInputRef,
    fileInputRef,
    attachmentsButtonRef,
    showAttachmentMenu,
    setShowAttachmentMenu,
    showCameraPreview,
    setShowCameraPreview,
    showSelectedAttachments,
    setShowSelectedAttachments,
    selectedAttachments,
    handleImage,
    handleCamera,
    handleFile,
    handleFileSelect,
    handleSendAttachments,
  };
}
