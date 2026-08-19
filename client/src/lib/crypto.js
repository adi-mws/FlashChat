// Base64 helper functions
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate RSA-OAEP Key Pair for E2EE
export async function generateE2EEKeyPair() {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const exportedPublic = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const exportedPrivate = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    return {
      publicKeyString: JSON.stringify(exportedPublic),
      privateKeyString: JSON.stringify(exportedPrivate)
    };
  } catch (error) {
    console.error("Failed to generate E2EE key pair:", error);
    throw error;
  }
}

// Initialize user's keys locally and return the public key string if registered/generated
export async function initializeUserKeys(username) {
  const localPrivateKeyName = `e2ee_private_key_${username}`;
  const localPublicKeyName = `e2ee_public_key_${username}`;

  let privateKeyStr = localStorage.getItem(localPrivateKeyName);
  let publicKeyStr = localStorage.getItem(localPublicKeyName);

  if (!privateKeyStr || !publicKeyStr) {
    const keys = await generateE2EEKeyPair();
    localStorage.setItem(localPrivateKeyName, keys.privateKeyString);
    localStorage.setItem(localPublicKeyName, keys.publicKeyString);
    publicKeyStr = keys.publicKeyString;
  }

  return publicKeyStr;
}

// Import public key string
export async function importPublicKey(jwkString) {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

// Import private key string
export async function importPrivateKey(jwkString) {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

// Encrypt message content with hybrid RSA-OAEP + AES-GCM
export async function encryptMessage(text, senderId, senderPublicKeyJwk, receiverId, receiverPublicKeyJwk) {
  try {
    // generate random AES symmetric key
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // encrypting text using AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);
    const encryptedContentBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      encodedText
    );

    const ciphertextBase64 = arrayBufferToBase64(encryptedContentBuffer);
    const ivBase64 = arrayBufferToBase64(iv);

    // exporting raw AES key to encrypt it with recipients' RSA public keys
    const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

    const encryptedKeys = [];

    // Encrypting for sender
    if (senderPublicKeyJwk) {
      const senderPubKey = await importPublicKey(senderPublicKeyJwk);
      const senderEncryptedAesBuffer = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        senderPubKey,
        rawAesKey
      );
      encryptedKeys.push({
        userId: senderId,
        key: arrayBufferToBase64(senderEncryptedAesBuffer)
      });
    }

    // Encrypting for receiver
    if (receiverPublicKeyJwk && receiverId !== senderId) {
      const receiverPubKey = await importPublicKey(receiverPublicKeyJwk);
      const receiverEncryptedAesBuffer = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        receiverPubKey,
        rawAesKey
      );
      encryptedKeys.push({
        userId: receiverId,
        key: arrayBufferToBase64(receiverEncryptedAesBuffer)
      });
    }

    return {
      ciphertext: ciphertextBase64,
      encryption: {
        isEncrypted: true,
        iv: ivBase64,
        encryptedKeys
      }
    };
  } catch (error) {
    console.error("Message encryption failed:", error);
    throw error;
  }
}

// Decrypting message content using user's private key
export async function decryptMessage(encryptedMsg, currentUserId, currentUsername) {
  try {
    if (!encryptedMsg.encryption || !encryptedMsg.encryption.isEncrypted) {
      return encryptedMsg.content; // Not encrypted
    }

    const { iv: ivBase64, encryptedKeys } = encryptedMsg.encryption;
    const userKeyObj = encryptedKeys.find(k => k.userId?.toString() === currentUserId?.toString());

    if (!userKeyObj) {
      return "Decryption key not available for this session";
    }

    const localPrivateKeyName = `e2ee_private_key_${currentUsername}`;
    const privateKeyJwkStr = localStorage.getItem(localPrivateKeyName);

    if (!privateKeyJwkStr) {
      return "Private key missing (cannot decrypt)";
    }

    // 1. Import local private key
    const privateKey = await importPrivateKey(privateKeyJwkStr);

    // 2. Decrypt AES raw key
    const encryptedKeyBuffer = base64ToArrayBuffer(userKeyObj.key);
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedKeyBuffer
    );

    // 3. Import AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );

    // 4. Decrypt content
    const iv = base64ToArrayBuffer(ivBase64);
    const ciphertext = base64ToArrayBuffer(encryptedMsg.content);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Message decryption failed:", error);
    return "Error decrypting message";
  }
}
/**
 * Encrypt a File / Blob with AES-GCM, wrap the AES key for both sender + receiver.
 * Returns: { encryptedBlob: Blob, attachmentEncryption: { isEncrypted, iv, encryptedKeys } }
 */
export async function encryptFile(file, senderId, senderPublicKeyJwk, receiverId, receiverPublicKeyJwk) {
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    fileBuffer
  );

  const ivBase64 = arrayBufferToBase64(iv);
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encryptedKeys = [];

  if (senderPublicKeyJwk) {
    const senderPubKey = await importPublicKey(senderPublicKeyJwk);
    const senderEncryptedKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      senderPubKey,
      rawAesKey
    );
    encryptedKeys.push({ userId: senderId, key: arrayBufferToBase64(senderEncryptedKey) });
  }

  if (receiverPublicKeyJwk && receiverId !== senderId) {
    const receiverPubKey = await importPublicKey(receiverPublicKeyJwk);
    const receiverEncryptedKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      receiverPubKey,
      rawAesKey
    );
    encryptedKeys.push({ userId: receiverId, key: arrayBufferToBase64(receiverEncryptedKey) });
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
 * Fetch an encrypted attachment URL, decrypt it, and return an object URL for display.
 * attachmentEncryption: { isEncrypted, iv, encryptedKeys }
 */
export async function decryptFile(url, attachmentEncryption, currentUserId, currentUsername, mimeType = "application/octet-stream") {
  if (!attachmentEncryption?.isEncrypted) {
    // Not encrypted — return URL as-is
    return url;
  }

  const { iv: ivBase64, encryptedKeys } = attachmentEncryption;
  const userKeyObj = encryptedKeys?.find(k => k.userId?.toString() === currentUserId?.toString());
  if (!userKeyObj) throw new Error("No decryption key found for this user");

  const localPrivateKeyName = `e2ee_private_key_${currentUsername}`;
  const privateKeyJwkStr = localStorage.getItem(localPrivateKeyName);
  if (!privateKeyJwkStr) throw new Error("Private key missing");

  const privateKey = await importPrivateKey(privateKeyJwkStr);
  const encryptedKeyBuffer = base64ToArrayBuffer(userKeyObj.key);
  const rawAesKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedKeyBuffer
  );

  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM" },
    true,
    ["decrypt"]
  );

  // Fetch the encrypted blob from the server
  const response = await fetch(url, { credentials: "include" });
  const encryptedBuffer = await response.arrayBuffer();

  const iv = base64ToArrayBuffer(ivBase64);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedBuffer
  );

  return URL.createObjectURL(new Blob([decryptedBuffer], { type: mimeType }));
}
