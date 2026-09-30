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
import { getSessionPublicKey } from "../../../../lib/e2ee/keyStore";
import { attachmentBlobCache, getAbsoluteUrl } from "../../../messages/bubbles/useDecryptedAttachment";
import { socket } from "../../../../lib/socket";

/**
 * useAttachmentUploader
 * Orchestrates file picking, camera capture, multi-session E2EE file encryption,
 * multipart upload with progress tracking, cache pre-population, and socket emission.
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
      const currentUserId = (user?.id || user?._id)?.toString();
      const receiverId = isGroup
        ? null
        : (chat?.participant?._id ||
           (Array.isArray(chat?.participants)
             ? chat.participants.find((p) => (p?._id || p)?.toString() !== currentUserId)?._id ||
               chat.participants.find((p) => (p?._id || p)?.toString() !== currentUserId)
             : null) ||
           null);

      items.forEach(({ file, caption }) => {
        const tempId = `temp-att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const msgType = file.type.startsWith("image/") ? "image" : "file";
        const localBlobUrl = URL.createObjectURL(file);

        // Pre-cache local blob so sender views it without delay or re-download
        attachmentBlobCache.set(tempId, localBlobUrl);

        // Optimistic message in chat
        dispatch(
          addSendingMessage({
            _id: tempId,
            chat: chatId,
            type: msgType,
            content: caption || "",
            sender: { _id: user?.id || user?._id },
            localBlobUrl,
            fileName: file.name,
            fileSize: file.size,
            createdAt: new Date().toISOString(),
            isSending: true,
            readBy: [user?.id || user?._id],
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

            // Ensure sender's own active session is included so the sender can decrypt their sent file
            const mySessionId = user?.sessionId;
            const myPublicKey = user?.sessionPublicKey || (mySessionId ? getSessionPublicKey(mySessionId) : null);
            if (mySessionId && myPublicKey && !recipients.some((r) => r.sessionId === mySessionId)) {
              recipients.push({
                sessionId: mySessionId,
                userId: user?.id || user?._id,
                publicKey: myPublicKey,
              });
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

            const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
            const uploadUrl = `${apiUrl}/chats/upload-attachment`;

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
                  try {
                    resolve(JSON.parse(xhr.responseText));
                  } catch (e) {
                    reject(new Error("Invalid JSON response from upload server"));
                  }
                } else {
                  let errMsg = `Upload failed with status ${xhr.status}`;
                  try {
                    const parsed = JSON.parse(xhr.responseText);
                    if (parsed.message) errMsg = parsed.message;
                  } catch (_) {}
                  reject(new Error(errMsg));
                }
              };
              xhr.onerror = () => reject(new Error("Network error during upload"));

              xhr.open("POST", uploadUrl);
              xhr.send(formData);
            });

            // Map the returned upload URL to the already-available local blob in memory
            if (uploadData?.url) {
              attachmentBlobCache.set(uploadData.url, localBlobUrl);
              const abs = getAbsoluteUrl(uploadData.url);
              if (abs) attachmentBlobCache.set(abs, localBlobUrl);
            }

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
              tempId,
            });

            dispatch(updateSendingMessageProgress({ tempId, progress: 100 }));
            setTimeout(() => {
              dispatch(removeSendingMessage(tempId));
            }, 400);
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
