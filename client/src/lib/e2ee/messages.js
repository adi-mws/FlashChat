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

export const CRYPTO_ERRORS = {
  NO_SESSION_KEY_ENVELOPE: 'NO_SESSION_KEY_ENVELOPE',
  PRIVATE_KEY_MISSING: 'PRIVATE_KEY_MISSING',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
};

/**
 * Encrypt a text message using hybrid cryptography:
 * 1. Generates ONE random AES-GCM-256 key per message.
 * 2. Encrypts the plaintext ONCE with AES-GCM.
 * 3. Wraps the same AES key separately for each authorized active session in `encryptionRecipients`.
 *
 * @param {string} text Plaintext message
 * @param {Array<{ sessionId: string, publicKey: string, userId?: string }>} encryptionRecipients
 * @returns {Promise<{ ciphertext: string, encryption: { isEncrypted: boolean, iv: string, encryptedKeys: Array } }>}
 */
export async function encryptMessage(text, encryptionRecipients = []) {
  if (!text && text !== '') {
    throw new Error("Plaintext message is required for encryption");
  }

  if (!Array.isArray(encryptionRecipients) || encryptionRecipients.length === 0) {
    throw new Error("At least one recipient session is required to encrypt");
  }

  const subtle = getCryptoSubtle();

  // 1. Generate one random AES symmetric key
  const aesKey = await subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt text ONCE with AES-GCM
  const iv = getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);
  const encryptedContentBuffer = await subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encodedText
  );

  const ciphertextBase64 = arrayBufferToBase64(encryptedContentBuffer);
  const ivBase64 = arrayBufferToBase64(iv);

  // 3. Export raw AES key to wrap it for each recipient session
  const rawAesKey = await subtle.exportKey("raw", aesKey);

  // 4. Wrap AES key for each active recipient session
  const encryptedKeys = [];
  const seenSessions = new Set();

  for (const recipient of encryptionRecipients) {
    const { sessionId, publicKey, userId } = recipient;
    if (!sessionId || !publicKey || seenSessions.has(sessionId)) continue;
    seenSessions.add(sessionId);

    try {
      const pubKey = await importPublicKey(publicKey);
      const encryptedAesBuffer = await subtle.encrypt(
        { name: "RSA-OAEP" },
        pubKey,
        rawAesKey
      );
      encryptedKeys.push({
        sessionId,
        userId: userId ? userId.toString() : undefined,
        key: arrayBufferToBase64(encryptedAesBuffer),
      });
    } catch (err) {
      console.warn(`Failed to wrap AES key for session ${sessionId}:`, err);
    }
  }

  if (encryptedKeys.length === 0) {
    throw new Error("Failed to encrypt key envelope for any recipient session");
  }

  return {
    ciphertext: ciphertextBase64,
    encryption: {
      isEncrypted: true,
      iv: ivBase64,
      encryptedKeys,
    },
  };
}

/**
 * Decrypt a message using the current session's private key.
 *
 * @param {object} encryptedMsg The message object containing content and encryption metadata
 * @param {string} currentSessionId The active session ID of this client
 * @param {string} [currentUserId] Optional user ID for fallback resolution on legacy messages
 * @returns {Promise<string>} Plaintext message or error description
 */
export async function decryptMessage(encryptedMsg, currentSessionId, currentUserId = null) {
  try {
    if (!encryptedMsg || !encryptedMsg.encryption || !encryptedMsg.encryption.isEncrypted) {
      return encryptedMsg?.content || "";
    }

    const { iv: ivBase64, encryptedKeys } = encryptedMsg.encryption;
    if (!ivBase64 || !Array.isArray(encryptedKeys)) {
      return "[Malformed encrypted message]";
    }

    // 1. Locate current session's encrypted AES key envelope
    let sessionKeyObj = null;
    if (currentSessionId) {
      sessionKeyObj = encryptedKeys.find(k => k.sessionId === currentSessionId);
    }

    // Fallback: If no sessionId match, check for legacy userId envelope
    if (!sessionKeyObj && currentUserId) {
      sessionKeyObj = encryptedKeys.find(k => !k.sessionId && k.userId?.toString() === currentUserId.toString());
    }

    if (!sessionKeyObj) {
      return "[Message not encrypted for this session]";
    }

    // 2. Retrieve local session private key
    let privateKeyJwkStr = currentSessionId ? getSessionPrivateKey(currentSessionId) : null;

    // Fallback: Check legacy username key if session key is not found
    if (!privateKeyJwkStr && typeof localStorage !== 'undefined') {
      const legacyKey = localStorage.getItem(`e2ee_private_key_legacy`);
      if (legacyKey) privateKeyJwkStr = legacyKey;
    }

    if (!privateKeyJwkStr) {
      return "[Decryption key missing for this session]";
    }

    const subtle = getCryptoSubtle();

    // 3. Import private key and decrypt AES key
    const privateKey = await importPrivateKey(privateKeyJwkStr);
    const encryptedKeyBuffer = base64ToArrayBuffer(sessionKeyObj.key);
    const rawAesKey = await subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedKeyBuffer
    );

    // 4. Import AES key and decrypt ciphertext
    const aesKey = await subtle.importKey(
      "raw",
      rawAesKey,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );

    const iv = base64ToArrayBuffer(ivBase64);
    const rawCiphertext = encryptedMsg.content !== undefined ? encryptedMsg.content : encryptedMsg.ciphertext;
    const ciphertext = base64ToArrayBuffer(rawCiphertext);
    const decryptedBuffer = await subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Message decryption failed:", error);
    return "[Unable to decrypt message]";
  }
}
