/**
 * Local Key Store for Session-Based E2EE Keys.
 * Associates private and public keys strictly with the active sessionId.
 * Never stores or indexes keys by username.
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
