import axios from 'axios';

/**
 * Fetch authorized, active encryption recipient sessions for a chat conversation.
 * The server resolves chat participants and returns their active sessions that have
 * registered E2EE public keys.
 * 
 * Returns: Array of { sessionId, userId, publicKey }
 */
export async function fetchEncryptionRecipients(chatId) {
  if (!chatId) {
    throw new Error("Chat ID is required to resolve encryption recipients");
  }

  const apiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
    ? import.meta.env.VITE_API_URL
    : (process.env.VITE_API_URL || 'http://localhost:5000/api');

  const response = await axios.get(
    `${apiUrl}/chats/${chatId}/recipients`,
    { withCredentials: true }
  );

  return response.data?.recipients || [];
}
