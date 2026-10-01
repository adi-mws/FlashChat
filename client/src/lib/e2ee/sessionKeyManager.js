import axios from 'axios';
import { generateE2EEKeyPair } from './keys.js';
import {
  getSessionPrivateKey,
  saveSessionPrivateKey,
  getSessionPublicKey,
  saveSessionPublicKey,
} from './keyStore.js';

export const SESSION_KEY_STATUS = {
  READY: 'READY',
  INITIALIZED: 'INITIALIZED',
  REGISTERED: 'REGISTERED',
  REKEY_REQUIRED: 'REKEY_REQUIRED',
  ERROR: 'ERROR',
};

const getApiUrl = () => {
  return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
    ? import.meta.env.VITE_API_URL
    : (process.env.VITE_API_URL || 'http://localhost:5000/api');
};

/*
  Upload the current session's public key to the server.
  Associates the public key strictly with the authenticated session on the backend.
*/
export async function uploadSessionPublicKey(publicKeyString, forceRekey = false) {
  const apiUrl = getApiUrl();
  const response = await axios.put(
    `${apiUrl}/auth/session/public-key`,
    { publicKey: publicKeyString, forceRekey },
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Initialize E2EE keys for the current authenticated session.
 * Handles fresh key generation, key registration, and rekey verification.
 * 
 * @param {string} sessionId Authenticated session ID
 * @param {string|null} [serverPublicKey=null] Public key known by the server for this session
 * @returns {Promise<{ status: string, publicKey?: string, error?: string }>}
 */
export async function initializeSessionKeys(sessionId, serverPublicKey = null) {
  if (!sessionId) {
    throw new Error("sessionId is required to initialize session keys");
  }

  const localPrivateKey = getSessionPrivateKey(sessionId);
  const localPublicKey = getSessionPublicKey(sessionId);

  // Partial State: Server already has a public key, but this client lacks the corresponding private key
  if (!localPrivateKey && serverPublicKey) {
    console.warn(`[E2EE] Server session ${sessionId} has a public key registered, but local private key is missing on this browser.`);
    return {
      status: SESSION_KEY_STATUS.REKEY_REQUIRED,
      error: "Local private key missing for this active session. An explicit rekey is required.",
      serverPublicKey,
    };
  }

  // State: Both local private key and server key (or local public key) exist
  if (localPrivateKey && (serverPublicKey || localPublicKey)) {
    const pubKey = serverPublicKey || localPublicKey;
    if (!localPublicKey && pubKey) {
      saveSessionPublicKey(sessionId, pubKey);
    }
    // If server has no key but local key exists, register it to the server
    if (!serverPublicKey && localPublicKey) {
      try {
        await uploadSessionPublicKey(localPublicKey);
        return { status: SESSION_KEY_STATUS.REGISTERED, publicKey: localPublicKey };
      } catch (err) {
        console.error("[E2EE] Failed to register existing local key to server:", err);
      }
    }
    return { status: SESSION_KEY_STATUS.READY, publicKey: pubKey };
  }

  // State: Local private key exists, but no public key locally or on server
  if (localPrivateKey && !localPublicKey && !serverPublicKey) {
    // If local public key string wasn't cached, generate a fresh pair or rekey
    return rekeySession(sessionId);
  }

  // State: Fresh session — neither local private key nor server public key exists
  try {
    const keys = await generateE2EEKeyPair();
    saveSessionPrivateKey(sessionId, keys.privateKeyString);
    saveSessionPublicKey(sessionId, keys.publicKeyString);

    await uploadSessionPublicKey(keys.publicKeyString);

    return {
      status: SESSION_KEY_STATUS.INITIALIZED,
      publicKey: keys.publicKeyString,
    };
  } catch (error) {
    console.error("[E2EE] Failed to initialize fresh session keys:", error);
    return {
      status: SESSION_KEY_STATUS.ERROR,
      error: error.message || "Failed to initialize session keys",
    };
  }
}

/*
  Explicit user-authorized rekeying of the active session.
  Used when the local private key is lost or intentionally replaced.
*/
export async function rekeySession(sessionId) {
  if (!sessionId) {
    throw new Error("sessionId is required to rekey session");
  }

  try {
    const keys = await generateE2EEKeyPair();
    saveSessionPrivateKey(sessionId, keys.privateKeyString);
    saveSessionPublicKey(sessionId, keys.publicKeyString);

    await uploadSessionPublicKey(keys.publicKeyString, true);

    return {
      status: SESSION_KEY_STATUS.INITIALIZED,
      publicKey: keys.publicKeyString,
    };
  } catch (error) {
    console.error("[E2EE] Failed to rekey session:", error);
    throw error;
  }
}
