import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import {
  selectChats,
  selectSelectedChat,
  selectOnlineUsers,
  selectMessages,
  selectSendingMessages,
  selectLoadingMessages,
  setSelectedChat,
  addSendingMessage,
  removeSendingMessage,
  updateSendingMessageProgress,
  markSendingMessageFailed,
  fetchMessages,
  deleteMessage,
  deleteAllMessages,
  selectDraft,
  deleteContact,
  removeDraft
} from "../../redux/slices/chatsSlice";
import { selectUser } from "../../redux/slices/authSlice";
import { selectIsOnline } from "../../redux/slices/uiSlice";
import { useNotification } from "../../hooks/useNotification";
import { CHAT_ROUTES, INFO_ROUTES } from "../../../routes/routes";
import { ArrowLeft, Trash, Send, EllipsisVertical, Lock, Paperclip } from "lucide-react";
import SelectChat from "./SelectChat";
import NoChatsFound from "./NoChatsFound";
import { getImageUrl } from "../../lib/imageUtils";
import MessageList from "../messages/MessageList";
import { encryptMessage, encryptFile } from "../../lib/crypto";
import AttachmentsMenu from "./AttachmentsMenu";
import SelectedAttachementsPreview from "./SelectedAttachementsPreview.jsx";
import { socket } from "../../lib/socket";
import { selectActiveMessage, setActiveMessage, selectActiveAttachements, setActiveAttachements } from "../../redux/slices/chatsSlice";

export default function Conversation() {
  const dispatch = useDispatch();
  const isOnline = useSelector(selectIsOnline);
  const { showNotification } = useNotification();
  const { chatId } = useParams();
  const [isMobile] = useState(window.innerWidth < 640);
  const message = useSelector(selectActiveMessage);
  const chats = useSelector(selectChats);
  const selectedChat = useSelector(selectSelectedChat);
  const onlineUsers = useSelector(selectOnlineUsers);
  const messages = useSelector(selectMessages);
  const sendingMessages = useSelector(selectSendingMessages);
  const loadingMessages = useSelector(selectLoadingMessages);
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState({ clientX: 0, clientY: 0, show: false, messageId: null });
  const messagesEndRef = useRef(null);
  const attachmentsButtonRef = useRef(null);
  const [showAttachementMenu, setShowAttachementMenu] = useState(false);

  // Attachment refs and state
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showSelectedAttachementsPreview, setShowSelectedAttachementsPreview] = useState(false);
  
  const selectedAttachements = useSelector(selectActiveAttachements); 
  
  // Textarea ref
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
  };

  const handleChange = (e) => {
    dispatch(setActiveMessage((e.target.value)));

    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };


  // * Join chat room and set selected chat when chatId changes
  useEffect(() => {
    if (!chatId || chats.length === 0 || !user?.id) return;

    const chat = chats.find((c) => c._id === chatId);
    if (!chat) return;

    dispatch(setSelectedChat(chatId));

    socket.emit("joinChat", {
      chatId,
      userId: user.id,
    });

  }, [chatId, chats, user?.id, dispatch]);

  // * Fetch messages when chat changes
  useEffect(() => {
    if (!chatId || !user) return;
    dispatch(fetchMessages({ chatId, user })).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        const rawMessages = action.payload.rawMessages;
        // Emit seen for loaded messages
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


  // * Loading the draft
  const draft = useSelector(
    state => selectDraft(state, chatId)
  );

  const isLoadingDraft = useRef(false);

  useEffect(() => {
    if (!chatId) return;

    isLoadingDraft.current = true;

    dispatch(setActiveMessage((draft?.message || "")));
    dispatch(setActiveAttachements(draft?.attachments || []));

    // Allow the state updates above to finish before saving again
    setTimeout(() => {
      isLoadingDraft.current = false;
    }, 0);
  }, [chatId]);


  // * Auto focus
  useEffect(() => {
    textareaRef.current?.focus();
  }, [chatId]);


  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, sendingMessages]);

  const getReceiverId = () => {
    const chat = chats.find((c) => c._id === chatId);
    return chat?.participant?._id;
  };

  const onSubmit = async () => {
    if (!isOnline) {
      showNotification("You are offline. Message not sent.", "error");
      return;
    }
    if (message.trim().length > 0 && selectedChat) {
      const receiverId = getReceiverId();
      const tempMessage = {
        chat: chatId,
        content: message.trim(),
        sender: { _id: user.id },
        createdAt: new Date().toISOString(),
        isSending: true,
      };
      dispatch(addSendingMessage(tempMessage));

      const chatObj = chats.find((c) => c._id === chatId);
      const senderPublicKey = user?.publicKey;
      const receiverPublicKey = chatObj?.participant?.publicKey;

      if (senderPublicKey && receiverPublicKey) {
        try {
          const encrypted = await encryptMessage(
            message.trim(),
            user.id,
            senderPublicKey,
            receiverId,
            receiverPublicKey
          );
          socket.emit("sendMessage", {
            chatId,
            message: encrypted.ciphertext,
            receiverId,
            encryption: encrypted.encryption,
          });
          dispatch(setActiveMessage(("")));
          dispatch(removeDraft(chatId));
          return;
        } catch (error) {
          console.error("Encryption error, sending plaintext fallback:", error);
        }
      }

      socket.emit("sendMessage", {
        chatId,
        message: message.trim(),
        receiverId,
        encryption: { isEncrypted: false },
      });
      dispatch(setActiveMessage(("")));
    }
  };

  const handleDelete = async (id) => {
    const confirmed = confirm("Do you want to delete this message?");
    if (!confirmed) return;
    const result = await dispatch(deleteMessage({ messageId: id, chatId }));
    if (result.meta.requestStatus === 'rejected') {
      showNotification("Failed to delete message", "error");
    }
  };

  const handleDeleteAllMessages = async () => {
    if (confirm("Do you want to delete all the chats? This action will permanently delete all the messages of this chat.")) {
      const result = await dispatch(deleteAllMessages(chatId));
      if (result.meta.requestStatus === 'fulfilled') {
        showNotification("success", "All messages deleted successfully");
      } else {
        showNotification("error", "Error deleting messages");
      }
    }
  };

  const handleDeleteContact = async () => {
    if (confirm("Do you want to delete this contact? This action will remove the user from your friend list and delete all the messages as well!")) {
      const result = await dispatch(deleteContact(chatId));
      if (result.meta.requestStatus === 'fulfilled') {
        showNotification("info", "Contact deleted successfully");
        navigate(CHAT_ROUTES.root);
      } else {
        showNotification("error", "Error deleting contact");
      }
    }
  };

  const handleShowMessageOptions = (e, type, id) => {
    const left = type === "sender" ? e.clientX - 160 : e.clientX;
    const top = e.clientY;
    setShowMessageOptions({ clientX: left, clientY: top, show: true, messageId: id });
  };

  // Attachment handlers
  const handleImage = () => imageInputRef.current?.click();
  const handleCamera = () => cameraInputRef.current?.click();
  const handleFile = () => fileInputRef.current?.click();

  const handleFileSelect = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((f) => ({ file: f }));
    dispatch(setActiveAttachements([...selectedAttachements, ...newItems]));
    setShowSelectedAttachementsPreview(true);
    event.target.value = "";
  };

  // Called by SelectedAttachementsPreview with ALL files at once.
  // Closes the slider immediately then uploads each file in the background.
  const handleSendAll = useCallback(
    (items /* [{file, caption}] */) => {
      // 1. Close slider & clear attachment queue
      setShowSelectedAttachementsPreview(false);
      dispatch(setActiveAttachements([]));
      dispatch(removeDraft(chatId));

      const receiverId = getReceiverId();
      const chatObj = chats.find((c) => c._id === chatId);
      const senderPublicKey = user?.publicKey;
      const receiverPublicKey = chatObj?.participant?.publicKey;
      const canEncrypt = !!(senderPublicKey && receiverPublicKey);

      items.forEach(({ file, caption }) => {
        const tempId = `temp-att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const msgType = file.type.startsWith("image/") ? "image" : "file";
        // Local blob URL so the image shows instantly while uploading
        const localBlobUrl = msgType === "image" ? URL.createObjectURL(file) : null;

        // 2. Dispatch optimistic message → appears in chat immediately
        dispatch(addSendingMessage({
          _id: tempId,
          chat: chatId,
          type: msgType,
          content: caption || "",
          sender: { _id: user.id },
          localBlobUrl,     // used by Message component for instant preview
          fileName: file.name,
          fileSize: file.size,
          createdAt: new Date().toISOString(),
          isSending: true,
          readBy: [user.id],
        }));

        // 3. Background upload + socket emit
        (async () => {
          try {
            let fileToUpload = file;
            let attachmentEncryption = { isEncrypted: false };

            if (canEncrypt) {
              try {
                dispatch(updateSendingMessageProgress({ tempId, progress: 2 }));
                const result = await encryptFile(
                  file, user.id, senderPublicKey, receiverId, receiverPublicKey
                );
                fileToUpload = new File(
                  [result.encryptedBlob], file.name, { type: "application/octet-stream" }
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

            if (canEncrypt && caption?.trim()) {
              try {
                const enc = await encryptMessage(
                  caption.trim(), user.id, senderPublicKey, receiverId, receiverPublicKey
                );
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
    [chatId, chats, user, dispatch]
  );


  const chat = chats.find((c) => c._id === chatId);
  if (!chat) return <NoChatsFound />;
  if (!selectedChat) return <SelectChat />;

  const allMessages = [...messages, ...sendingMessages];

  const MessageOptions = () => {
    const { messageId } = showMessageOptions;
    if (!showMessageOptions.show) return null;
    return (
      <div
        className="fixed w-36 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-xl rounded-xl z-50 py-1.5 animate-scale-in"
        style={{ top: showMessageOptions.clientY, left: showMessageOptions.clientX }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => { handleDelete(messageId); setShowMessageOptions({ show: false }); }}
          className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 transition"
        >
          <Trash size={14} /> Delete
        </button>
      </div>
    );
  };

  const ChatOptions = () => {
    if (!showChatOptions) return null;
    return (
      <div
        className="absolute right-4 top-[68px] w-48 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-xl rounded-xl z-50 py-1.5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => { handleDeleteAllMessages(); setShowChatOptions(false); }}
          className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition"
        >
          <Trash size={14} /> Clear Chat
        </button>
        <button
          onClick={() => { handleDeleteContact(); setShowChatOptions(false); }}
          className="w-full text-left px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2.5 transition border-t border-slate-100 dark:border-zinc-800/80"
        >
          <Trash size={14} /> Delete Contact
        </button>
      </div>
    );
  };

  return (
    <div
      className="chat-box flex flex-col h-screen overflow-hidden w-full relative"
      onClick={() => { setShowMessageOptions({ show: false }); setShowChatOptions(false); }}
    >
      {/* Header */}
      <div className="h-[64px] flex items-center px-4 sm:px-8 bg-white/95 dark:bg-zinc-950/95 border-b border-slate-200/50 dark:border-zinc-900/80 backdrop-blur-md z-10 flex-shrink-0 justify-between">
        <div className="flex gap-4 items-center min-w-0">
          <div className="flex gap-2 items-center flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-zinc-400 sm:hidden cursor-pointer" onClick={() => navigate(-1)} />
            <div className="relative cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(INFO_ROUTES.chat(chatId)); }}>
              <img
                src={getImageUrl(chat.participant?.pfp)}
                alt={chat.participant?.name || "User"}
                className="w-10 h-10 object-cover rounded-full border border-slate-100 dark:border-zinc-800"
              />
              {chat.participant?._id && onlineUsers.includes(chat.participant._id) && (
                <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950 absolute bottom-0 right-0 animate-pulse" />
              )}
            </div>
          </div>
          <div className="flex flex-col min-w-0 gap-0.5">
            <p className="text-slate-800 dark:text-zinc-100 text-xs truncate">{chat.participant?.name || "Deleted User"}</p>
            <div className="text-2xs text-slate-400 dark:text-zinc-500 truncate flex items-center gap-1.5">
              {chat.participant?._id && onlineUsers.includes(chat.participant._id) ? (
                <span className="text-emerald-500 font-medium">Active now</span>
              ) : (
                <span>Offline</span>
              )}
              {user?.publicKey && chat.participant?.publicKey && (
                <span className="text-emerald-600 dark:text-emerald-400/80 font-medium flex items-center gap-0.5" title="End-to-End Encrypted">
                  • <Lock size={10} className="inline" /> Encrypted
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowChatOptions(true); }}
          className="p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900"
        >
          <EllipsisVertical size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <MessageList
        loading={loadingMessages}
        messages={allMessages}
        messagesEndRef={messagesEndRef}
        handleShowMessageOptions={handleShowMessageOptions}
      />

      {/* Input Area */}
      <div className="bg-white dark:bg-zinc-950 border-t border-slate-200/50 dark:border-zinc-900 flex-shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
          className="flex outline-none items-center gap-2.5 max-w-5xl mx-auto bg-slate-100 dark:bg-zinc-900/60 p-1.5 pl-4 border border-transparent transition-all duration-200"
        >
          <button
            ref={attachmentsButtonRef}
            type="button"
            className="mr-3"
            onClick={(e) => { e.stopPropagation(); setShowAttachementMenu((prev) => !prev); }}
          >
            <Paperclip size={15} />
          </button>
          <textarea
            ref={textareaRef}
            autoFocus={true}
            className="flex-1 bg-transparent text-xs outline-none resize-none text-slate-800 dark:text-zinc-100 py-3.25 min-h-[46px] max-h-40 overflow-y-auto placeholder-slate-400 dark:placeholder-zinc-500"
            rows={1}
            placeholder="Type a message..."
            value={message}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (!isMobile && e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={!message?.trim()}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500 text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-700 hover:bg-indigo-600 transition flex-shrink-0 cursor-pointer"
          >
            <Send size={15} fill={message.trim() ? "white" : "none"} />
          </button>
        </form>
      </div>

      {/* Context menus */}
      <MessageOptions />
      <ChatOptions />
      <AttachmentsMenu
        onClose={() => setShowAttachementMenu(false)}
        show={showAttachementMenu}
        onCaptureCamera={handleCamera}
        onSelectFile={handleFile}
        onSelectImage={handleImage}
        triggerRef={attachmentsButtonRef}
      />
      <SelectedAttachementsPreview
        show={showSelectedAttachementsPreview}
        onClose={() => {
          setShowSelectedAttachementsPreview(false);
          dispatch(setActiveAttachements([]));
        }}
        selectedAttachements={selectedAttachements}
        setSelectedAttachements={(attachments) => {
          dispatch(setActiveAttachements(attachments));
          if (attachments.length === 0) setShowSelectedAttachementsPreview(false);
        }}
        onSend={handleSendAll}
      />

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input ref={fileInputRef} type="file" accept="*/*" multiple className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
