import React from "react";
import { useParams } from "react-router-dom";
import { setActiveAttachements } from "../../../redux/slices/chatsSlice";
import { INFO_ROUTES } from "../../../routes/routes";
import SelectChat from "../_components/SelectChat";
import NoChatsFound from "../_components/NoChatsFound";
import ConversationSkeleton from "../_components/ConversationSkeleton";
import MessageList from "../../messages/MessageList";
import ConversationHeader from "../../messages/ConversationHeader";
import ConversationInput from "../../messages/ConversationInput";
import ChatOptionsMenu from "../../messages/ChatOptionsMenu";
import MessageContextMenu from "../../messages/MessageContextMenu";
import AttachmentsMenu from "../../messages/attachments/AttachmentsMenu";
import SelectedAttachmentsPreview from "../../messages/attachments/SelectedAttachmentsPreview";
import CameraPreview from "../../messages/attachments/CameraPreview";
import useConversation from "./hooks/useConversation";
import useMessageSender from "./hooks/useMessageSender";
import useAttachmentUploader from "./hooks/useAttachmentUploader";
import useChatActions from "./hooks/useChatActions";

/*
  Conversation
  Master chat orchestrator. Composes decoupled hooks for messages, attachments,
  encryption, and chat actions into a responsive messaging layout.
*/
export default function Conversation() {
  const { chatId } = useParams();

  const {
    chat,
    chats,
    selectedChat,
    onlineUsers,
    user,
    allMessages,
    loadingMessages,
    loadingChats,
    hasFetchedChats,
    messagesEndRef,
    navigate,
    dispatch,
  } = useConversation(chatId);

  const {
    message,
    textareaRef,
    isMobile,
    handleChange,
    handleSendMessage,
  } = useMessageSender({ chatId, chat, user });

  const {
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
  } = useAttachmentUploader({ chatId, chat, user });

  const {
    showChatOptions,
    setShowChatOptions,
    showMessageOptions,
    setShowMessageOptions,
    handleShowMessageOptions,
    handleDeleteMessage,
    handleClearChat,
    handleDeleteContact,
    handleLeaveGroup,
  } = useChatActions({ chatId, chat, user });

  if (chatId && !chat && (!hasFetchedChats || loadingChats || chats.length === 0 || loadingMessages)) {
    return <ConversationSkeleton onBack={() => navigate(-1)} />;
  }

  if (!chat) return <NoChatsFound />;
  if (!selectedChat) return <SelectChat />;

  return (
    <div
      className="chat-box flex flex-col h-screen overflow-hidden w-full relative"
      onClick={() => {
        setShowMessageOptions({ show: false });
        setShowChatOptions(false);
      }}
    >
      {/* Header */}
      <ConversationHeader
        chat={chat}
        chatId={chatId}
        onlineUsers={onlineUsers}
        user={user}
        onBack={() => navigate(-1)}
        onOpenOptions={() => setShowChatOptions(true)}
        onOpenInfo={() =>
          navigate(chat.isGroupChat ? INFO_ROUTES.group(chatId) : INFO_ROUTES.chat(chatId))
        }
      />

      {/* Messages Feed */}
      <MessageList
        loading={loadingMessages}
        messages={allMessages}
        messagesEndRef={messagesEndRef}
        handleShowMessageOptions={handleShowMessageOptions}
      />

      {/* Message Composer */}
      <ConversationInput
        message={message}
        onChange={handleChange}
        onSubmit={handleSendMessage}
        textareaRef={textareaRef}
        attachmentsButtonRef={attachmentsButtonRef}
        onToggleAttachments={() => setShowAttachmentMenu((prev) => !prev)}
        isMobile={isMobile}
      />

      {/* Message Options Context Menu */}
      <MessageContextMenu
        show={showMessageOptions.show}
        clientX={showMessageOptions.clientX}
        clientY={showMessageOptions.clientY}
        messageId={showMessageOptions.messageId}
        onDelete={handleDeleteMessage}
        onClose={() => setShowMessageOptions({ show: false })}
      />

      {/* Chat Options Dropdown */}
      <ChatOptionsMenu
        show={showChatOptions}
        isGroup={chat.isGroupChat}
        isGroupAdmin={
          chat.isGroupChat &&
          Array.isArray(chat.groupAdmins) &&
          chat.groupAdmins.some((admin) => (admin?._id || admin)?.toString() === user?.id?.toString())
        }
        onClose={() => setShowChatOptions(false)}
        onViewInfo={() =>
          navigate(chat.isGroupChat ? INFO_ROUTES.group(chatId) : INFO_ROUTES.chat(chatId))
        }
        onClearChat={handleClearChat}
        onLeaveGroup={handleLeaveGroup}
        onDeleteContact={handleDeleteContact}
      />

      {/* Attachment Selection Menu */}
      <AttachmentsMenu
        show={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onCaptureCamera={handleCamera}
        onSelectFile={handleFile}
        onSelectImage={handleImage}
        triggerRef={attachmentsButtonRef}
      />

      {/* Selected Attachments Modal */}
      <SelectedAttachmentsPreview
        show={showSelectedAttachments}
        onClose={() => {
          setShowSelectedAttachments(false);
          dispatch(setActiveAttachements([]));
        }}
        selectedAttachments={selectedAttachments}
        setSelectedAttachments={(attachments) => {
          dispatch(setActiveAttachements(attachments));
          if (attachments.length === 0) setShowSelectedAttachments(false);
        }}
        onSend={handleSendAttachments}
      />

      {/* Camera Capture Dialog */}
      <CameraPreview
        show={showCameraPreview}
        setAttachments={setActiveAttachements}
        onClose={() => setShowCameraPreview(false)}
        onCapture={() => {
          setShowCameraPreview(false);
          setShowSelectedAttachments(true);
        }}
      />

      {/* Hidden File System Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
