/**
 * FlashChat E2EE Cryptographic Library.
 * 
 * NOTE: Legacy user-level single-key functions have been migrated to the
 * modular session-based E2EE subsystem located at `./e2ee/`.
 * 
 * This file re-exports modern session-based E2EE APIs and provides backward-compatible
 * adapters for legacy call sites.
 */

export * from './e2ee/index.js';

import {
  generateE2EEKeyPair,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from './e2ee/keys.js';
import {
  encryptMessage as sessionEncryptMessage,
  decryptMessage as sessionDecryptMessage,
} from './e2ee/messages.js';
import {
  encryptFile as sessionEncryptFile,
  decryptFile as sessionDecryptFile,
} from './e2ee/files.js';

/**
 * @deprecated Use initializeSessionKeys(sessionId, serverPublicKey) instead.
 */
export async function initializeUserKeys(username) {
  console.warn("[DEPRECATION] initializeUserKeys(username) is deprecated. Use initializeSessionKeys(sessionId) instead.");
  const legacyKey = localStorage.getItem(`e2ee_public_key_${username}`);
  if (legacyKey) return legacyKey;
  const keys = await generateE2EEKeyPair();
  localStorage.setItem(`e2ee_private_key_${username}`, keys.privateKeyString);
  localStorage.setItem(`e2ee_public_key_${username}`, keys.publicKeyString);
  return keys.publicKeyString;
}

/**
 * Encrypt a text message for a list of active recipient sessions.
 * @param {string} text Plaintext message
 * @param {Array<{ sessionId: string, publicKey: string, userId?: string }>} recipients
 */
export async function encryptMessage(text, recipients = []) {
  if (Array.isArray(recipients)) {
    return await sessionEncryptMessage(text, recipients);
  }
  return await sessionEncryptMessage(text, []);
}

/**
 * Decrypt a received message using the active session private key.
 */
export async function decryptMessage(encryptedMsg, currentSessionOrUserId, currentUsernameOrUserId = null) {
  return await sessionDecryptMessage(encryptedMsg, currentSessionOrUserId, currentUsernameOrUserId);
}

/**
 * Encrypt a file/attachment for a list of active recipient sessions.
 * @param {File|Blob} file File to encrypt
 * @param {Array<{ sessionId: string, publicKey: string, userId?: string }>} recipients
 */
export async function encryptFile(file, recipients = []) {
  if (Array.isArray(recipients)) {
    return await sessionEncryptFile(file, recipients);
  }
  return await sessionEncryptFile(file, []);
}

/**
 * Backward-compatible adapter for decryptFile.
 */
export async function decryptFile(url, attachmentEncryption, currentSessionOrUserId, mimeType = "application/octet-stream", currentUsernameOrUserId = null) {
  return await sessionDecryptFile(url, attachmentEncryption, currentSessionOrUserId, mimeType, currentUsernameOrUserId);
}

/**
 * @deprecated Legacy Passphrase Backup: preserved for backward-compatibility only.
 */
export async function encryptPrivateKeyWithPassphrase(privateKeyStr, passphrase) {
  console.warn("[DEPRECATION] encryptPrivateKeyWithPassphrase is deprecated under multi-session E2EE.");
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);
  
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  
  const privateKeyBytes = encoder.encode(privateKeyStr);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    privateKeyBytes
  );
  
  return {
    encryptedPrivateKey: arrayBufferToBase64(encryptedBuffer),
    backupSalt: arrayBufferToBase64(salt),
    backupIv: arrayBufferToBase64(iv)
  };
}

/**
 * @deprecated Legacy Passphrase Restore: preserved for backward-compatibility only.
 */
export async function decryptPrivateKeyWithPassphrase(encryptedPrivateKeyBase64, passphrase, saltBase64, ivBase64) {
  console.warn("[DEPRECATION] decryptPrivateKeyWithPassphrase is deprecated under multi-session E2EE.");
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);
  
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const salt = base64ToArrayBuffer(saltBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  
  const encryptedBuffer = base64ToArrayBuffer(encryptedPrivateKeyBase64);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encryptedBuffer
  );
  
  return new TextDecoder().decode(decryptedBuffer);
}
