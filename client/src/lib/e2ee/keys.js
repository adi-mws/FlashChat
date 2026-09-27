// Helper functions for base64 conversions
export function arrayBufferToBase64(buffer) {
  if (!buffer) return '';
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
  return Buffer.from(buffer).toString('base64');
}

export function base64ToArrayBuffer(base64) {
  if (!base64 || typeof base64 !== 'string') return new ArrayBuffer(0);
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const getCryptoSubtle = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto API (crypto.subtle) is not available in this environment.");
};

export const getRandomValues = (array) => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.getRandomValues(array);
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto.getRandomValues(array);
  }
  throw new Error("crypto.getRandomValues is not available.");
};

/**
 * Generate RSA-OAEP 2048-bit Key Pair for an E2EE session.
 * Returns JWK string representations.
 */
export async function generateE2EEKeyPair() {
  const subtle = getCryptoSubtle();
  const keyPair = await subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const exportedPublic = await subtle.exportKey("jwk", keyPair.publicKey);
  const exportedPrivate = await subtle.exportKey("jwk", keyPair.privateKey);

  return {
    publicKeyString: JSON.stringify(exportedPublic),
    privateKeyString: JSON.stringify(exportedPrivate),
  };
}

/**
 * Import an RSA-OAEP public key from a JWK string.
 */
export async function importPublicKey(jwkString) {
  const subtle = getCryptoSubtle();
  const jwk = typeof jwkString === 'string' ? JSON.parse(jwkString) : jwkString;
  return await subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

/**
 * Import an RSA-OAEP private key from a JWK string.
 */
export async function importPrivateKey(jwkString) {
  const subtle = getCryptoSubtle();
  const jwk = typeof jwkString === 'string' ? JSON.parse(jwkString) : jwkString;
  return await subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

/**
 * Encrypt a private key string with a user recovery passphrase or 12-word phrase.
 * Uses PBKDF2 (100,000 iterations SHA-256) and AES-GCM (256-bit).
 */
export async function encryptPrivateKeyWithPassphrase(privateKeyStr, passphrase) {
  const subtle = getCryptoSubtle();
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);
  
  const salt = getRandomValues(new Uint8Array(16));
  const iv = getRandomValues(new Uint8Array(12));
  
  const keyMaterial = await subtle.importKey(
    "raw",
    passphraseBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const aesKey = await subtle.deriveKey(
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
  const encryptedBuffer = await subtle.encrypt(
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
 * Decrypt an encrypted private key with a user recovery passphrase or 12-word phrase.
 */
export async function decryptPrivateKeyWithPassphrase(encryptedPrivateKeyBase64, passphrase, saltBase64, ivBase64) {
  const subtle = getCryptoSubtle();
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);
  
  const keyMaterial = await subtle.importKey(
    "raw",
    passphraseBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const salt = base64ToArrayBuffer(saltBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  
  const aesKey = await subtle.deriveKey(
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
  
  const encryptedBytes = base64ToArrayBuffer(encryptedPrivateKeyBase64);
  const decryptedBuffer = await subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encryptedBytes
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

