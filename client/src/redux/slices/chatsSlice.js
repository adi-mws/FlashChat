import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { decryptMessage } from '../../lib/crypto';

// Thunks

export const fetchChats = createAsyncThunk(
  'chats/fetchChats',
  async (user, { rejectWithValue }) => {
    if (!user) return rejectWithValue('No user');
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/chats/get-all/${user.id}`,
        { withCredentials: true }
      );
      const decryptedChats = await Promise.all(
        (res.data.chats || []).map(async (chat) => {
          if (chat.lastMessage?.encryption?.isEncrypted) {
            try {
              const decryptedContent = await decryptMessage(chat.lastMessage, user.id, user.username);
              return {
                ...chat,
                lastMessage: { ...chat.lastMessage, content: decryptedContent },
              };
            } catch (err) {
              console.error('Failed to decrypt last message in chat list:', err);
            }
          }
          return chat;
        })
      );
      return decryptedChats;
    } catch (err) {
      console.error('Failed to fetch chats:', err);
      return rejectWithValue(err.message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chats/fetchMessages',
  async ({ chatId, user }, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/chats/get-messages/${chatId}`,
        { withCredentials: true }
      );
      const decrypted = await Promise.all(
        (data.messages || []).map(async (msg) => {
          if (msg.encryption?.isEncrypted) {
            try {
              const decryptedContent = await decryptMessage(msg, user.id, user.username);
              return { ...msg, content: decryptedContent };
            } catch (err) {
              console.error('Decryption failed for historical msg:', err);
            }
          }
          return msg;
        })
      );
      return { messages: decrypted, rawMessages: data.messages };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markMessagesRead = createAsyncThunk(
  'chats/markMessagesRead',
  async ({ chatId, userId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/chats/message-read`,
        { chatId, userId },
        { withCredentials: true }
      );
      if (response.status === 200) return chatId;
      return rejectWithValue('Failed to mark read');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteMessage = createAsyncThunk(
  'chats/deleteMessage',
  async ({ messageId, chatId }, { getState, rejectWithValue }) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/chats/delete-message/${messageId}`,
        { withCredentials: true }
      );
      return { messageId, chatId };
    } catch {
      return rejectWithValue('Failed to delete message');
    }
  }
);

export const deleteAllMessages = createAsyncThunk(
  'chats/deleteAllMessages',
  async (chatId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/chats/messages/delete-all`,
        { data: { chatId }, withCredentials: true }
      );
      if (response.status === 200) return chatId;
      return rejectWithValue('Failed to delete all messages');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteContact = createAsyncThunk(
  'chats/deleteContact',
  async (chatId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/chats/contacts`,
        { data: { chatId }, withCredentials: true }
      );
      if (response.status === 200) return chatId;
      return rejectWithValue('Failed to delete contact');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice 

const chatsSlice = createSlice({
  name: 'chats',
  initialState: {
    chats: [],
    selectedChat: null,        // chatId string
    onlineUsers: [],
    messages: [],              // messages for currently open chat
    sendingMessages: [],       // optimistic messages
    drafts: [],
    loadingChats: false,
    activeMessage: '',
    activeAttachements: [],
    loadingMessages: false,
    error: null,
  },
  reducers: {
    setChats(state, action) {
      state.chats = action.payload;
    },
    setSelectedChat(state, action) {
      state.selectedChat = action.payload;
    },
    setOnlineUsers(state, action) {
      state.onlineUsers = action.payload;
    },
    setActiveMessage(state, action ) {
      state.activeMessage = action.payload;
    },
    setActiveAttachements(state, action) {
      state.activeAttachements = action.payload; 
    },
    saveDraft(state, action) {
      const { chatId, message, attachments } = action.payload;

      const existingDraft = state.drafts.find(
        draft => draft.chatId === chatId
      );

      if (existingDraft) {
        existingDraft.message = message;
        existingDraft.attachments = attachments;
        existingDraft.updatedAt = Date.now();
      } else {
        state.drafts.push({
          chatId,
          message,
          attachments,
          updatedAt: Date.now(),
        });
      }
    },

    removeDraft(state, action) {
      const chatId = action.payload;

      state.drafts = state.drafts.filter(
        draft => draft.chatId !== chatId
      );
    },
    clearMessages(state) {
      state.messages = [];
      state.sendingMessages = [];
    },
    addSendingMessage(state, action) {
      state.sendingMessages.push(action.payload);
    },
    removeSendingMessage(state, action) {
      // Remove by _id (tempId)
      state.sendingMessages = state.sendingMessages.filter(
        (m) => m._id !== action.payload
      );
    },
    updateSendingMessageProgress(state, action) {
      const { tempId, progress } = action.payload;
      const msg = state.sendingMessages.find((m) => m._id === tempId);
      if (msg) {
        msg.uploadProgress = progress;
        msg.uploadFailed = false;
      }
    },
    markSendingMessageFailed(state, action) {
      const msg = state.sendingMessages.find((m) => m._id === action.payload);
      if (msg) {
        msg.uploadFailed = true;
        msg.isSending = false;
      }
    },
    // Called when socket receives a new message
    receiveNewMessage(state, action) {
      const msg = action.payload;
      const chatId = msg.chat;

      // Update messages list if this chat is open
      if (state.selectedChat === chatId) {
        state.messages.push(msg);
        // Only match-clean text messages by content.
        // Attachment sending messages are removed explicitly by tempId.
        const msgType = msg.type || 'text';
        if (msgType === 'text') {
          state.sendingMessages = state.sendingMessages.filter(
            (m) => m.content !== msg.content
          );
        }
      }

      // Update the chat list (unread count + last message)
      state.chats = state.chats.map((chat) => {
        if (chat._id === chatId) {
          const isCurrentChatOpen = state.selectedChat === chatId;
          return {
            ...chat,
            unreadCount: isCurrentChatOpen ? 0 : (chat.unreadCount || 0) + 1,
            lastMessage: msg,
          };
        }
        return chat;
      });

      //! Bubble the chat to the top (DEPRECATED) // as now the timestamp based shorting of chats is done
      // const updatedChat = state.chats.find((c) => c._id === chatId);
      // if (updatedChat) {
      //   state.chats = [updatedChat, ...state.chats.filter((c) => c._id !== chatId)];
      // }
    },
    // Called when a message is seen by receiver
    receiverSeenMessage(state, action) {
      const { chatId, messageId, receiverId } = action.payload;
      state.chats = state.chats.map((chat) => {
        if (
          chat._id === chatId &&
          chat.lastMessage &&
          chat.lastMessage._id === messageId
        ) {
          const currentReadBy = chat.lastMessage.readBy || [];
          if (!currentReadBy.includes(receiverId)) {
            return {
              ...chat,
              lastMessage: {
                ...chat.lastMessage,
                readBy: [...currentReadBy, receiverId],
              },
            };
          }
        }
        return chat;
      });
    },
    removeMessageLocally(state, action) {
      state.messages = state.messages.filter((m) => m._id !== action.payload);
    },
    // Add chat to list (when friend request accepted)
    prependChat(state, action) {
      if (!state.chats.some((c) => c._id === action.payload._id)) {
        state.chats = [action.payload, ...state.chats];
      }
    },
    removeChatById(state, action) {
      state.chats = state.chats.filter((c) => c._id !== action.payload);
    },
    updateChatLastMessage(state, action) {
      const { chatId, lastMessage } = action.payload;
      state.chats = state.chats.map((c) =>
        c._id === chatId ? { ...c, lastMessage } : c
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchChats
      .addCase(fetchChats.pending, (state) => {
        state.loadingChats = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.chats = action.payload;
        state.loadingChats = false;
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.loadingChats = false;
        state.error = action.payload;
      })
      // fetchMessages
      .addCase(fetchMessages.pending, (state) => {
        state.loadingMessages = true;
        state.messages = [];
        state.sendingMessages = [];
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload.messages;
        state.loadingMessages = false;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loadingMessages = false;
        state.error = action.payload;
      })
      // markMessagesRead
      .addCase(markMessagesRead.fulfilled, (state, action) => {
        const chatId = action.payload;
        state.chats = state.chats.map((c) =>
          c._id === chatId ? { ...c, unreadCount: 0 } : c
        );
      })
      // deleteMessage
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const { messageId, chatId } = action.payload;
        state.messages = state.messages.filter((m) => m._id !== messageId);
        // Update lastMessage in chat list
        const chat = state.chats.find((c) => c._id === chatId);
        if (chat && chat.lastMessage && chat.lastMessage._id === messageId) {
          const newMessages = state.messages;
          const newLast = newMessages[newMessages.length - 1] || null;
          state.chats = state.chats.map((c) =>
            c._id === chatId ? { ...c, lastMessage: newLast } : c
          );
        }
      })
      // deleteAllMessages
      .addCase(deleteAllMessages.fulfilled, (state, action) => {
        state.messages = [];
        state.chats = state.chats.map((c) =>
          c._id === action.payload ? { ...c, lastMessage: {} } : c
        );
      })
      // deleteContact
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.chats = state.chats.filter((c) => c._id !== action.payload);
        state.selectedChat = '';
        state.messages = [];
      });
  },
});

export const {
  setChats,
  setSelectedChat,
  setOnlineUsers,
  clearMessages,
  addSendingMessage,
  removeSendingMessage,
  updateSendingMessageProgress,
  markSendingMessageFailed,
  receiveNewMessage,
  receiverSeenMessage,
  removeMessageLocally,
  prependChat,
  removeChatById,
  updateChatLastMessage,
  setActiveMessage,
  saveDraft,
  getDraft,
  hasDraft,
  removeDraft,
  setActiveAttachements,
} = chatsSlice.actions;

export default chatsSlice.reducer;

// Selectors
export const selectChats = (state) => state.chats.chats;
export const selectSelectedChat = (state) => state.chats.selectedChat;
export const selectOnlineUsers = (state) => state.chats.onlineUsers;
export const selectMessages = (state) => state.chats.messages;
export const selectSendingMessages = (state) => state.chats.sendingMessages;
export const selectLoadingChats = (state) => state.chats.loadingChats;
export const selectLoadingMessages = (state) => state.chats.loadingMessages;
export const selectDrafts = (state) => state.chats.drafts;
export const selectDraft = (state, chatId) => state.chats.drafts.find(draft => draft.chatId === chatId);
export const selectActiveMessage = (state) => state.chats.activeMessage;
export const selectActiveAttachements = (state) => state.chats.activeAttachements;