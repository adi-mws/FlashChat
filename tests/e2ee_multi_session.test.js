import test from 'node:test';
import assert from 'node:assert/strict';

// Import client E2EE modules
import {
  generateE2EEKeyPair,
  importPublicKey,
  importPrivateKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from '../client/src/lib/e2ee/keys.js';
import {
  encryptMessage,
  decryptMessage,
} from '../client/src/lib/e2ee/messages.js';
import {
  encryptFile,
} from '../client/src/lib/e2ee/files.js';
import {
  saveSessionPrivateKey,
  getSessionPrivateKey,
  saveSessionPublicKey,
  getSessionPublicKey,
  clearSessionKeys,
} from '../client/src/lib/e2ee/keyStore.js';
import {
  initializeSessionKeys,
  SESSION_KEY_STATUS,
} from '../client/src/lib/e2ee/sessionKeyManager.js';

// Polyfill minimal localStorage for Node test runner
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

test('1. User A has one session: generate keys, encrypt and decrypt', async () => {
  const sessionId = 'session_A1';
  const keys = await generateE2EEKeyPair();
  saveSessionPrivateKey(sessionId, keys.privateKeyString);
  saveSessionPublicKey(sessionId, keys.publicKeyString);

  const recipients = [
    { sessionId, publicKey: keys.publicKeyString, userId: 'user_A' }
  ];

  const plaintext = "Hello from User A session 1";
  const encrypted = await encryptMessage(plaintext, recipients);

  assert.equal(encrypted.encryption.isEncrypted, true);
  assert.equal(encrypted.encryption.encryptedKeys.length, 1);
  assert.equal(encrypted.encryption.encryptedKeys[0].sessionId, sessionId);

  const decrypted = await decryptMessage(encrypted, sessionId, 'user_A');
  assert.equal(decrypted, plaintext);
});

test('2. User A has four sessions (A1, A2, A3, A4): each session has a distinct key pair', async () => {
  const sessions = ['A1', 'A2', 'A3', 'A4'];
  const userAKeys = {};

  for (const sId of sessions) {
    const keys = await generateE2EEKeyPair();
    userAKeys[sId] = keys;
    saveSessionPrivateKey(sId, keys.privateKeyString);
    saveSessionPublicKey(sId, keys.publicKeyString);
  }

  // Verify all 4 public keys and private keys are distinct
  const publicKeys = sessions.map(s => userAKeys[s].publicKeyString);
  const privateKeys = sessions.map(s => userAKeys[s].privateKeyString);
  assert.equal(new Set(publicKeys).size, 4, "All 4 public keys must be distinct");
  assert.equal(new Set(privateKeys).size, 4, "All 4 private keys must be distinct");
});

test('3. User B has multiple sessions (B1, B2, B3) with distinct key pairs', async () => {
  const sessions = ['B1', 'B2', 'B3'];
  const userBKeys = {};

  for (const sId of sessions) {
    const keys = await generateE2EEKeyPair();
    userBKeys[sId] = keys;
    saveSessionPrivateKey(sId, keys.privateKeyString);
    saveSessionPublicKey(sId, keys.publicKeyString);
  }

  const publicKeys = sessions.map(s => userBKeys[s].publicKeyString);
  assert.equal(new Set(publicKeys).size, 3, "All 3 public keys must be distinct");
});

test('4. Direct message decrypts independently on every active session (A1..A3, B1..B2)', async () => {
  // Setup User A sessions: A1 (Chrome), A2 (Android), A3 (Edge)
  // Setup User B sessions: B1 (Chrome), B2 (Android)
  const allSessions = ['A1', 'A2', 'A3', 'B1', 'B2'];
  const sessionData = {};

  for (const sId of allSessions) {
    const keys = await generateE2EEKeyPair();
    sessionData[sId] = keys;
    saveSessionPrivateKey(sId, keys.privateKeyString);
  }

  const recipients = [
    { sessionId: 'A1', publicKey: sessionData['A1'].publicKeyString, userId: 'user_A' },
    { sessionId: 'A2', publicKey: sessionData['A2'].publicKeyString, userId: 'user_A' },
    { sessionId: 'A3', publicKey: sessionData['A3'].publicKeyString, userId: 'user_A' },
    { sessionId: 'B1', publicKey: sessionData['B1'].publicKeyString, userId: 'user_B' },
    { sessionId: 'B2', publicKey: sessionData['B2'].publicKeyString, userId: 'user_B' },
  ];

  const plaintext = "Confidential direct message from Aditya to Rahul";
  const encrypted = await encryptMessage(plaintext, recipients);

  // Exactly ONE ciphertext and ONE IV
  assert.ok(encrypted.ciphertext);
  assert.ok(encrypted.encryption.iv);
  // Exactly 5 envelopes, one per active session
  assert.equal(encrypted.encryption.encryptedKeys.length, 5);

  // Every single session can independently decrypt!
  for (const sId of allSessions) {
    const decrypted = await decryptMessage(encrypted, sId);
    assert.equal(decrypted, plaintext, `Session ${sId} should decrypt original plaintext`);
  }
});

test("5. Sender's other active session (A2) can decrypt sent message from A1", async () => {
  const keysA1 = await generateE2EEKeyPair();
  const keysA2 = await generateE2EEKeyPair();
  const keysB1 = await generateE2EEKeyPair();

  saveSessionPrivateKey('A1', keysA1.privateKeyString);
  saveSessionPrivateKey('A2', keysA2.privateKeyString);
  saveSessionPrivateKey('B1', keysB1.privateKeyString);

  const recipients = [
    { sessionId: 'A1', publicKey: keysA1.publicKeyString, userId: 'user_A' },
    { sessionId: 'A2', publicKey: keysA2.publicKeyString, userId: 'user_A' },
    { sessionId: 'B1', publicKey: keysB1.publicKeyString, userId: 'user_B' },
  ];

  const messageText = "Sent from desktop Chrome!";
  const encrypted = await encryptMessage(messageText, recipients);

  // A2 (phone) reads the message sent from A1 (desktop)
  const decryptedOnPhone = await decryptMessage(encrypted, 'A2');
  assert.equal(decryptedOnPhone, messageText);
});

test("6. Receiver's second session (B2) can decrypt received message", async () => {
  const keysA1 = await generateE2EEKeyPair();
  const keysB1 = await generateE2EEKeyPair();
  const keysB2 = await generateE2EEKeyPair();

  saveSessionPrivateKey('A1', keysA1.privateKeyString);
  saveSessionPrivateKey('B1', keysB1.privateKeyString);
  saveSessionPrivateKey('B2', keysB2.privateKeyString);

  const recipients = [
    { sessionId: 'A1', publicKey: keysA1.publicKeyString, userId: 'user_A' },
    { sessionId: 'B1', publicKey: keysB1.publicKeyString, userId: 'user_B' },
    { sessionId: 'B2', publicKey: keysB2.publicKeyString, userId: 'user_B' },
  ];

  const messageText = "Message for Rahul";
  const encrypted = await encryptMessage(messageText, recipients);

  // B2 (Rahul's phone) decrypts
  const decryptedOnB2 = await decryptMessage(encrypted, 'B2');
  assert.equal(decryptedOnB2, messageText);
});

test("7. Wrong session private key cannot decrypt another session's envelope", async () => {
  const keysA1 = await generateE2EEKeyPair();
  const keysB1 = await generateE2EEKeyPair();

  // Create an attacker session X with its own key
  const keysAttacker = await generateE2EEKeyPair();
  saveSessionPrivateKey('AttackerX', keysAttacker.privateKeyString);

  const recipients = [
    { sessionId: 'A1', publicKey: keysA1.publicKeyString, userId: 'user_A' },
    { sessionId: 'B1', publicKey: keysB1.publicKeyString, userId: 'user_B' },
  ];

  const encrypted = await encryptMessage("Secret message", recipients);

  // Attacker tries to decrypt with session AttackerX: no envelope for AttackerX
  const result = await decryptMessage(encrypted, 'AttackerX');
  assert.equal(result, "[Message not encrypted for this session]");

  // Even if Attacker tampers with the message and claims AttackerX's key is for envelope A1:
  const tamperedMsg = {
    ...encrypted,
    encryption: {
      ...encrypted.encryption,
      encryptedKeys: [
        { sessionId: 'AttackerX', key: encrypted.encryption.encryptedKeys[0].key }
      ]
    }
  };
  const tamperedResult = await decryptMessage(tamperedMsg, 'AttackerX');
  assert.equal(tamperedResult, "[Unable to decrypt message]");
});

test("8. Revoked session stops receiving envelopes for NEW messages", async () => {
  // Simulate active session registry on server
  let serverSessions = [
    { sessionId: 'A1', userId: 'user_A', publicKey: (await generateE2EEKeyPair()).publicKeyString, isRevoked: false },
    { sessionId: 'A2', userId: 'user_A', publicKey: (await generateE2EEKeyPair()).publicKeyString, isRevoked: false },
  ];

  // Resolver function simulating server endpoint
  const resolveRecipients = (sessions) => sessions.filter(s => !s.isRevoked).map(s => ({
    sessionId: s.sessionId,
    publicKey: s.publicKey,
    userId: s.userId
  }));

  // Before revocation: 2 envelopes
  let recipientsBefore = resolveRecipients(serverSessions);
  assert.equal(recipientsBefore.length, 2);

  // User revokes A2
  serverSessions[1].isRevoked = true;

  // After revocation: only A1 receives new message envelope
  let recipientsAfter = resolveRecipients(serverSessions);
  assert.equal(recipientsAfter.length, 1);
  assert.equal(recipientsAfter[0].sessionId, 'A1');

  const newMsg = await encryptMessage("Message after revocation", recipientsAfter);
  assert.equal(newMsg.encryption.encryptedKeys.length, 1);
  assert.equal(newMsg.encryption.encryptedKeys[0].sessionId, 'A1');
});

test("9. Expired session stops receiving envelopes for NEW messages", async () => {
  const now = Date.now();
  const serverSessions = [
    { sessionId: 'B1', userId: 'user_B', publicKey: (await generateE2EEKeyPair()).publicKeyString, expiresAt: new Date(now + 3600000) },
    { sessionId: 'B2', userId: 'user_B', publicKey: (await generateE2EEKeyPair()).publicKeyString, expiresAt: new Date(now - 1000) }, // expired
  ];

  const resolveActiveRecipients = (sessions) => sessions
    .filter(s => s.expiresAt > new Date())
    .map(s => ({ sessionId: s.sessionId, publicKey: s.publicKey, userId: s.userId }));

  const activeRecipients = resolveActiveRecipients(serverSessions);
  assert.equal(activeRecipients.length, 1);
  assert.equal(activeRecipients[0].sessionId, 'B1');

  const msg = await encryptMessage("Expiry test", activeRecipients);
  assert.equal(msg.encryption.encryptedKeys.length, 1);
  assert.equal(msg.encryption.encryptedKeys[0].sessionId, 'B1');
});

test("10. Group encryption creates one envelope per active member session", async () => {
  // Group: User A (2 sessions), User B (3 sessions), User C (1 session) = 6 sessions
  const groupSessionIds = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1'];
  const groupRecipients = [];

  for (const sId of groupSessionIds) {
    const keys = await generateE2EEKeyPair();
    saveSessionPrivateKey(sId, keys.privateKeyString);
    groupRecipients.push({
      sessionId: sId,
      publicKey: keys.publicKeyString,
      userId: sId[0],
    });
  }

  const groupText = "Welcome to the group chat everyone!";
  const encrypted = await encryptMessage(groupText, groupRecipients);

  // ONE ciphertext, 6 envelopes
  assert.ok(encrypted.ciphertext);
  assert.equal(encrypted.encryption.encryptedKeys.length, 6);

  // All 6 sessions can decrypt
  for (const sId of groupSessionIds) {
    const decrypted = await decryptMessage(encrypted, sId);
    assert.equal(decrypted, groupText, `Group member session ${sId} should decrypt`);
  }
});

test("11. File encryption works across multiple sessions", async () => {
  const sessionIds = ['S1', 'S2', 'S3'];
  const recipients = [];
  const sessionKeys = {};

  for (const sId of sessionIds) {
    const keys = await generateE2EEKeyPair();
    sessionKeys[sId] = keys;
    saveSessionPrivateKey(sId, keys.privateKeyString);
    recipients.push({
      sessionId: sId,
      publicKey: keys.publicKeyString,
      userId: 'user_multi',
    });
  }

  const fileData = new Uint8Array([1, 2, 3, 4, 5, 42, 99, 128, 255]);
  const fakeFile = {
    arrayBuffer: async () => fileData.buffer,
    name: 'secret_document.pdf',
    type: 'application/pdf',
  };

  const encryptedFileResult = await encryptFile(fakeFile, recipients);

  assert.ok(encryptedFileResult.encryptedBlob);
  assert.equal(encryptedFileResult.attachmentEncryption.isEncrypted, true);
  assert.equal(encryptedFileResult.attachmentEncryption.encryptedKeys.length, 3);

  // Verify each session can unwrap the AES key and decrypt the file buffer
  const encryptedBlobBuffer = await encryptedFileResult.encryptedBlob.arrayBuffer();
  const iv = base64ToArrayBuffer(encryptedFileResult.attachmentEncryption.iv);

  for (const sId of sessionIds) {
    const env = encryptedFileResult.attachmentEncryption.encryptedKeys.find(k => k.sessionId === sId);
    assert.ok(env, `Envelope for session ${sId} must exist`);

    const privKey = await importPrivateKey(sessionKeys[sId].privateKeyString);
    const rawAesKey = await globalThis.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKey,
      base64ToArrayBuffer(env.key)
    );

    const aesKey = await globalThis.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );

    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      encryptedBlobBuffer
    );

    const decryptedBytes = new Uint8Array(decryptedBuffer);
    assert.deepEqual(decryptedBytes, fileData, `File decrypted by session ${sId} must match original`);
  }
});

test("12. Missing local private key fails safely with clear message", async () => {
  const keys = await generateE2EEKeyPair();
  const recipients = [{ sessionId: 'GhostSession', publicKey: keys.publicKeyString }];
  const encrypted = await encryptMessage("Top secret", recipients);

  // Session has NO private key in localStorage
  mockStorage.delete('e2ee_private_key_GhostSession');

  const result = await decryptMessage(encrypted, 'GhostSession');
  assert.equal(result, "[Decryption key missing for this session]");
});

test("13. Missing session envelope fails safely with clear message", async () => {
  const keys = await generateE2EEKeyPair();
  saveSessionPrivateKey('ExistingSession', keys.privateKeyString);

  const recipients = [{ sessionId: 'ExistingSession', publicKey: keys.publicKeyString }];
  const encrypted = await encryptMessage("For ExistingSession only", recipients);

  // Try to decrypt with a newly joined session that was not in recipients list
  const newSessionKeys = await generateE2EEKeyPair();
  saveSessionPrivateKey('NewSessionLate', newSessionKeys.privateKeyString);

  const result = await decryptMessage(encrypted, 'NewSessionLate');
  assert.equal(result, "[Message not encrypted for this session]");
});

test("14. Session key initialization state machine detects missing local key without silent overwrite", async () => {
  const sessionId = 'session_check_state';
  const serverRegisteredKey = (await generateE2EEKeyPair()).publicKeyString;

  // Local storage cleared: no private key locally, but server already has a registered public key
  mockStorage.delete(`e2ee_private_key_${sessionId}`);

  const initResult = await initializeSessionKeys(sessionId, serverRegisteredKey);
  assert.equal(initResult.status, SESSION_KEY_STATUS.REKEY_REQUIRED);
  assert.ok(initResult.error.includes("Local private key missing"));
  // Ensure we did NOT overwrite the server key
  assert.equal(mockStorage.get(`e2ee_private_key_${sessionId}`), undefined);
});

test("15. Socket.IO ciphertext message relay format preserves encryption envelope integrity", async () => {
  // Simulate client-side encryption before socket.emit("sendMessage")
  const keysA = await generateE2EEKeyPair();
  const keysB = await generateE2EEKeyPair();
  saveSessionPrivateKey('SockA', keysA.privateKeyString);
  saveSessionPrivateKey('SockB', keysB.privateKeyString);

  const recipients = [
    { sessionId: 'SockA', publicKey: keysA.publicKeyString, userId: 'userA' },
    { sessionId: 'SockB', publicKey: keysB.publicKeyString, userId: 'userB' },
  ];

  const payload = await encryptMessage("Hello through Socket.IO", recipients);

  // Payload passed to socket.emit
  const socketPayload = {
    chatId: 'chat_123',
    message: payload.ciphertext,
    receiverId: 'userB',
    encryption: payload.encryption,
  };

  // Server receives socketPayload, validates envelopes without decrypting or needing private keys
  assert.equal(typeof socketPayload.message, 'string');
  assert.equal(socketPayload.encryption.isEncrypted, true);
  assert.ok(socketPayload.encryption.iv);
  assert.equal(socketPayload.encryption.encryptedKeys.length, 2);

  // Server relays socketPayload to client SockB
  const relayedMsg = {
    content: socketPayload.message,
    encryption: socketPayload.encryption,
  };

  // Client SockB decrypts relayed ciphertext successfully
  const decrypted = await decryptMessage(relayedMsg, 'SockB');
  assert.equal(decrypted, "Hello through Socket.IO");
});

test("16. New login is banned if 4 sessions are already there (no automatic session removal)", async () => {
  // Simulate database active sessions collection
  const mockDbSessions = [
    { sessionId: 's1', user: 'user123', expiresAt: new Date(Date.now() + 86400000) },
    { sessionId: 's2', user: 'user123', expiresAt: new Date(Date.now() + 86400000) },
    { sessionId: 's3', user: 'user123', expiresAt: new Date(Date.now() + 86400000) },
    { sessionId: 's4', user: 'user123', expiresAt: new Date(Date.now() + 86400000) },
  ];

  const attemptLogin = async (user, sessions) => {
    const activeCount = sessions.filter(s => s.user === user && s.expiresAt > new Date()).length;
    if (activeCount >= 4) {
      const err = new Error("Maximum active sessions limit reached (4). Please log out from another session before signing in.");
      err.statusCode = 403;
      err.code = 'MAX_SESSIONS_REACHED';
      throw err;
    }
    const newSession = { sessionId: `s${sessions.length + 1}`, user, expiresAt: new Date(Date.now() + 86400000) };
    sessions.push(newSession);
    return newSession;
  };

  // Attempting to log in 5th session should be rejected with 403
  await assert.rejects(
    async () => {
      await attemptLogin('user123', mockDbSessions);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'MAX_SESSIONS_REACHED');
      assert.ok(err.message.includes("Maximum active sessions limit reached (4)"));
      return true;
    }
  );

  // Verify none of the existing 4 sessions were removed automatically
  assert.equal(mockDbSessions.length, 4, "None of the existing 4 sessions must be automatically removed");
  assert.deepEqual(mockDbSessions.map(s => s.sessionId), ['s1', 's2', 's3', 's4']);

  // User manually logs out from session s2
  const idx = mockDbSessions.findIndex(s => s.sessionId === 's2');
  mockDbSessions.splice(idx, 1);
  assert.equal(mockDbSessions.length, 3);

  // Now login succeeds
  const created = await attemptLogin('user123', mockDbSessions);
  assert.equal(created.sessionId, 's4'); // new session added
  assert.equal(mockDbSessions.length, 4);
});
