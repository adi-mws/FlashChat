/*
  SocketManager

  A non-rendering component that owns all socket.io event listeners.
  It connects/disconnects the socket based on the authenticated user,
  and dispatches Redux actions for real-time events.

  Rendered once inside App (inside Provider + Router).
*/
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { socket } from '../../lib/socket';
import { selectUser, logoutUser } from '../../redux/slices/authSlice';
import {
  fetchChats,
  setOnlineUsers,
  updateUserOnlineStatus,
  receiveNewMessage,
  receiverSeenMessage,
  removeMessageLocally,
  clearChatLocally,
  purgeAllMessagesLocally,
  prependChat,
  setUserTyping,
  setUserStoppedTyping,
  selectSelectedChat,
} from '../../redux/slices/chatsSlice';
import { decryptMessage } from '../../lib/crypto';
import { useNotification } from '../../hooks/useNotification';

export default function SocketManager() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const selectedChat = useSelector(selectSelectedChat);
  const { showNotification } = useNotification();

  // Instant offline detection on tab close / window unload
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      if (socket.connected) {
        try {
          socket.emit('leave_app');
          socket.disconnect();
        } catch (e) {
          // ignore
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [user]);

  // Connect / disconnect based on user login state
  useEffect(() => {
    if (!user) {
      if (socket.connected) socket.disconnect();
      return;
    }

    if (!socket.connected) {
      socket.connect();
      socket.emit('join', user.id);
    }

    // Fetch chats when user becomes available
    dispatch(fetchChats(user));

    const handleOnlineUsers = (users) => dispatch(setOnlineUsers(users));
    const handleUserStatusUpdate = (status) => dispatch(updateUserOnlineStatus(status));
    const handleSessionRevoked = () => dispatch(logoutUser());
    const handleConnectError = (err) => {
      console.error('Socket error:', err.message);
      if (err.message === 'Authentication error') {
        dispatch(logoutUser());
      }
    };

    socket.on('onlineUsers', handleOnlineUsers);
    socket.on('userStatusUpdate', handleUserStatusUpdate);
    socket.on('session_revoked', handleSessionRevoked);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
      socket.off('userStatusUpdate', handleUserStatusUpdate);
      socket.off('session_revoked', handleSessionRevoked);
      socket.off('connect_error', handleConnectError);
    };
  }, [user, dispatch]);

  // New message listener — needs selectedChat for unread count logic
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = async (incomingMessage) => {
      let msgToSet = incomingMessage;

      if (incomingMessage.encryption?.isEncrypted) {
        try {
          const decryptedContent = await decryptMessage(incomingMessage, user.sessionId, user.id);
          msgToSet = { ...incomingMessage, content: decryptedContent };
        } catch (err) {
          console.error('Failed to decrypt incoming message:', err);
        }
      }

      dispatch(receiveNewMessage(msgToSet));
    };

    const handleReceiverSeenMessage = ({ chatId, messageId, receiverId }) => {
      dispatch(receiverSeenMessage({ chatId, messageId, receiverId }));
    };

    const handleMessageDeleted = ({ messageId }) => {
      dispatch(removeMessageLocally(messageId));
    };

    const handleGroupUpdate = () => {
      dispatch(fetchChats(user));
    };

    const handleChatCreated = (payload) => {
      if (payload?._id) {
        dispatch(prependChat(payload));
      }
      dispatch(fetchChats(user));
      if (payload) {
        const groupTitle = payload.groupName || 'a group';
        const addedBy = payload.addedBy?.username
          ? `@${payload.addedBy.username}`
          : (payload.addedBy?.name || 'a friend');
        showNotification(`You were added to "${groupTitle}" by ${addedBy}`, 'info');
      }
    };

    const handleChatCleared = ({ chatId }) => {
      dispatch(clearChatLocally(chatId));
    };

    const handleAllMessagesPurged = () => {
      dispatch(purgeAllMessagesLocally());
      dispatch(fetchChats(user));
      showNotification('All chat messages have been purged by the system administrator.', 'info');
    };

    const handleAccountTerminated = () => {
      dispatch(logoutUser());
    };

    const handleUserTyping = ({ chatId, userId, userName }) => {
      if (userId?.toString() === user?.id?.toString()) return;
      dispatch(setUserTyping({ chatId, userId, userName }));
    };

    const handleUserStoppedTyping = ({ chatId, userId }) => {
      dispatch(setUserStoppedTyping({ chatId, userId }));
    };

    const handleFriendAcceptedGlobally = (payload) => {
      if (payload?.chat) {
        dispatch(prependChat(payload.chat));
      }
      dispatch(fetchChats(user));
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('receiverSeenMessage', handleReceiverSeenMessage);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('chatCleared', handleChatCleared);
    socket.on('all_messages_purged', handleAllMessagesPurged);
    socket.on('account_deleted', handleAccountTerminated);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);
    socket.on('groupMemberJoined', handleGroupUpdate);
    socket.on('groupSettingsUpdated', handleGroupUpdate);
    socket.on('groupMemberLeft', handleGroupUpdate);
    socket.on('kickedFromGroup', handleGroupUpdate);
    socket.on('chatCreated', handleChatCreated);
    socket.on('friendRequestAccepted', handleFriendAcceptedGlobally);
    socket.on('contactAdded', handleFriendAcceptedGlobally);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('receiverSeenMessage', handleReceiverSeenMessage);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('chatCleared', handleChatCleared);
      socket.off('all_messages_purged', handleAllMessagesPurged);
      socket.off('account_deleted', handleAccountTerminated);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
      socket.off('groupMemberJoined', handleGroupUpdate);
      socket.off('groupSettingsUpdated', handleGroupUpdate);
      socket.off('groupMemberLeft', handleGroupUpdate);
      socket.off('kickedFromGroup', handleGroupUpdate);
      socket.off('chatCreated', handleChatCreated);
      socket.off('friendRequestAccepted', handleFriendAcceptedGlobally);
      socket.off('contactAdded', handleFriendAcceptedGlobally);
    };
  }, [user, selectedChat, dispatch, showNotification]);

  return null; // purely side-effect component
}
