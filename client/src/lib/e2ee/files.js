import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  importPublicKey,
  importPrivateKey,
  getRandomValues,
} from './keys.js';
import { getSessionPrivateKey } from './keyStore.js';

const getCryptoSubtle = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto API (crypto.subtle) is not available.");
};

/**
 * Encrypt a file using hybrid cryptography:
 * 1. Generates ONE random AES-GCM-256 key per file.
 * 2. Encrypts the entire file buffer ONCE with AES-GCM.
 * 3. Wraps the same AES key separately for each authorized active session in `encryptionRecipients`.
 *
 * @param {File|Blob} file File to encrypt
 * @param {Array<{ sessionId: string, publicKey: string, userId?: string }>} encryptionRecipients
 * @returns {Promise<{ encryptedBlob: Blob, attachmentEncryption: { isEncrypted: boolean, iv: string, encryptedKeys: Array } }>}
 */
export async function encryptFile(file, encryptionRecipients = []) {
  if (!file) throw new Error("File is required for encryption");
  if (!Array.isArray(encryptionRecipients) || encryptionRecipients.length === 0) {
    throw new Error("At least one recipient session is required to encrypt file");
  }

  const subtle = getCryptoSubtle();

  // 1. Generate one AES symmetric key
  const aesKey = await subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt file buffer once with AES-GCM
  const iv = getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();
  const encryptedBuffer = await subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    fileBuffer
  );

  const ivBase64 = arrayBufferToBase64(iv);
  const rawAesKey = await subtle.exportKey("raw", aesKey);

  // 3. Wrap AES key for each active recipient session
  const encryptedKeys = [];
  const seenSessions = new Set();

  for (const recipient of encryptionRecipients) {
    const { sessionId, publicKey, userId } = recipient;
    if (!sessionId || !publicKey || seenSessions.has(sessionId)) continue;
    seenSessions.add(sessionId);

    try {
      const pubKey = await importPublicKey(publicKey);
      const encryptedKeyBuffer = await subtle.encrypt(
        { name: "RSA-OAEP" },
        pubKey,
        rawAesKey
      );
      encryptedKeys.push({
        sessionId,
        userId: userId ? userId.toString() : undefined,
        key: arrayBufferToBase64(encryptedKeyBuffer),
      });
    } catch (err) {
      console.warn(`Failed to wrap file AES key for session ${sessionId}:`, err);
    }
  }

  if (encryptedKeys.length === 0) {
    throw new Error("Failed to wrap file key for any recipient session");
  }

  return {
    encryptedBlob: new Blob([encryptedBuffer], { type: "application/octet-stream" }),
    attachmentEncryption: {
      isEncrypted: true,
      iv: ivBase64,
      encryptedKeys,
    },
  };
}

/**
 * Fetch and decrypt an encrypted attachment using the current session's private key.
 *
 * @param {string} url Server URL to encrypted file
 * @param {object} attachmentEncryption Metadata containing IV and session encryptedKeys
 * @param {string} currentSessionId Active session ID
 * @param {string} [mimeType="application/octet-stream"]
 * @param {string} [currentUserId=null] Optional fallback user ID for legacy messages
 * @returns {Promise<string>} Blob URL for display / download
 */
export async function decryptFile(url, attachmentEncryption, currentSessionId, mimeType = "application/octet-stream", currentUserId = null) {
  if (!attachmentEncryption?.isEncrypted) {
    return url;
  }

  const { iv: ivBase64, encryptedKeys } = attachmentEncryption;
  if (!ivBase64 || !Array.isArray(encryptedKeys)) {
    throw new Error("Malformed attachment encryption metadata");
  }

  let sessionKeyObj = null;
  if (currentSessionId) {
    sessionKeyObj = encryptedKeys.find(k => k.sessionId === currentSessionId);
  }

  // Fallback: Check for legacy userId envelope
  if (!sessionKeyObj && currentUserId) {
    sessionKeyObj = encryptedKeys.find(k => !k.sessionId && k.userId?.toString() === currentUserId.toString());
  }

  if (!sessionKeyObj) {
    throw new Error("NO_SESSION_KEY_ENVELOPE");
  }

  const privateKeyJwkStr = currentSessionId ? getSessionPrivateKey(currentSessionId) : null;
  if (!privateKeyJwkStr) {
    throw new Error("PRIVATE_KEY_MISSING");
  }

  const subtle = getCryptoSubtle();
  const privateKey = await importPrivateKey(privateKeyJwkStr);
  const encryptedKeyBuffer = base64ToArrayBuffer(sessionKeyObj.key);

  const rawAesKey = await subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedKeyBuffer
  );

  const aesKey = await subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM" },
    true,
    ["decrypt"]
  );

  // Fetch the encrypted bytes from the server
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to fetch attachment: ${response.statusText}`);
  }
  const encryptedBuffer = await response.arrayBuffer();

  const iv = base64ToArrayBuffer(ivBase64);
  const decryptedBuffer = await subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedBuffer
  );

  return URL.createObjectURL(new Blob([decryptedBuffer], { type: mimeType }));
}
