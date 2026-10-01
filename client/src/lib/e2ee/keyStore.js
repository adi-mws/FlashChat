/*
  Local Key Store for Session-Based E2EE Keys.
  Associates private and public keys strictly with the active sessionId.
  Never stores or indexes keys by username.
*/

const isStorageAvailable = () => typeof localStorage !== 'undefined';

export function getSessionPrivateKey(sessionId) {
  if (!sessionId || !isStorageAvailable()) return null;
  return localStorage.getItem(`e2ee_private_key_${sessionId}`);
}

export function saveSessionPrivateKey(sessionId, privateKeyString) {
  if (!sessionId || !isStorageAvailable()) return;
  localStorage.setItem(`e2ee_private_key_${sessionId}`, privateKeyString);
}

export function removeSessionPrivateKey(sessionId) {
  if (!sessionId || !isStorageAvailable()) return;
  localStorage.removeItem(`e2ee_private_key_${sessionId}`);
}

export function getSessionPublicKey(sessionId) {
  if (!sessionId || !isStorageAvailable()) return null;
  return localStorage.getItem(`e2ee_public_key_${sessionId}`);
}

export function saveSessionPublicKey(sessionId, publicKeyString) {
  if (!sessionId || !isStorageAvailable()) return;
  localStorage.setItem(`e2ee_public_key_${sessionId}`, publicKeyString);
}

export function removeSessionPublicKey(sessionId) {
  if (!sessionId || !isStorageAvailable()) return;
  localStorage.removeItem(`e2ee_public_key_${sessionId}`);
}

export function hasSessionKeys(sessionId) {
  if (!sessionId || !isStorageAvailable()) return false;
  return !!localStorage.getItem(`e2ee_private_key_${sessionId}`);
}

export function clearSessionKeys(sessionId) {
  removeSessionPrivateKey(sessionId);
  removeSessionPublicKey(sessionId);
}

/*
  Returns a stable device/installation ID for this browser.
  If this browser already has private keys from a previous login, seamlessly adopts that sessionId.
*/
export function getOrCreateDeviceId() {
  if (!isStorageAvailable()) return null;
  let deviceId = localStorage.getItem('flashchat_device_id');
  if (deviceId) return deviceId;

  // Seamlessly adopt existing session key if this browser already generated one in a previous login
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('e2ee_private_key_') && key !== 'e2ee_private_key_legacy') {
        const candidateSessionId = key.replace('e2ee_private_key_', '');
        if (candidateSessionId && !candidateSessionId.includes(' ') && candidateSessionId.length > 5) {
          deviceId = candidateSessionId;
          localStorage.setItem('flashchat_device_id', deviceId);
          return deviceId;
        }
      }
    }
  } catch (e) {
    console.warn("Error scanning existing session keys:", e);
  }

  deviceId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  localStorage.setItem('flashchat_device_id', deviceId);
  return deviceId;
}
