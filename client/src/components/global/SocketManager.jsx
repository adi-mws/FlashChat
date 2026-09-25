/**
 * SocketManager
 * 
 * A non-rendering component that owns all socket.io event listeners.
 * It connects/disconnects the socket based on the authenticated user,
 * and dispatches Redux actions for real-time events.
 * 
 * Rendered once inside App (inside Provider + Router).
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { socket } from '../../lib/socket';
import { selectUser, logoutUser } from '../../redux/slices/authSlice';
import {
  fetchChats,
  setOnlineUsers,
  receiveNewMessage,
  receiverSeenMessage,
  removeMessageLocally,
  selectSelectedChat,
} from '../../redux/slices/chatsSlice';
import { decryptMessage } from '../../lib/crypto';

export default function SocketManager() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const selectedChat = useSelector(selectSelectedChat);

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
    const handleSessionRevoked = () => dispatch(logoutUser());
    const handleConnectError = (err) => {
      console.error('Socket error:', err.message);
      if (err.message === 'Authentication error') {
        dispatch(logoutUser());
      }
    };

    socket.on('onlineUsers', handleOnlineUsers);
    socket.on('session_revoked', handleSessionRevoked);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
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
          const decryptedContent = await decryptMessage(incomingMessage, user.id, user.username);
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

    socket.on('newMessage', handleNewMessage);
    socket.on('receiverSeenMessage', handleReceiverSeenMessage);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('groupMemberJoined', handleGroupUpdate);
    socket.on('groupSettingsUpdated', handleGroupUpdate);
    socket.on('groupMemberLeft', handleGroupUpdate);
    socket.on('kickedFromGroup', handleGroupUpdate);
    socket.on('chatCreated', handleGroupUpdate);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('receiverSeenMessage', handleReceiverSeenMessage);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('groupMemberJoined', handleGroupUpdate);
      socket.off('groupSettingsUpdated', handleGroupUpdate);
      socket.off('groupMemberLeft', handleGroupUpdate);
      socket.off('kickedFromGroup', handleGroupUpdate);
      socket.off('chatCreated', handleGroupUpdate);
    };
  }, [user, selectedChat, dispatch]);

  return null; // purely side-effect component
}
