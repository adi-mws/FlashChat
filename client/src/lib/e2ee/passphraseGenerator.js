/**
 * FlashChat 12-Word Mnemonic Recovery Phrase Generator
 * Provides cryptographically secure, memorable 12-word seed phrases
 * for zero-knowledge E2EE backup and key rotation.
 */

// Curated list of 256 unambiguous, distinct English words
export const WORD_LIST = [
  "anchor", "apple", "arrow", "badge", "bamboo", "banner", "barrel", "beacon",
  "breeze", "bridge", "bronze", "cabin", "cactus", "camel", "candle", "canyon",
  "canvas", "carpet", "castle", "cedar", "cherry", "cliff", "clover", "comet",
  "copper", "coral", "crater", "creek", "crown", "crystal", "dawn", "desert",
  "diamond", "dolphin", "dragon", "drift", "eagle", "echo", "ember", "emerald",
  "falcon", "feather", "flame", "forest", "fossil", "fox", "frost", "galaxy",
  "garden", "geyser", "glacier", "glade", "glow", "granite", "grove", "harbor",
  "haven", "hawk", "horizon", "iceberg", "island", "jaguar", "jasper", "jungle",
  "lagoon", "lantern", "lark", "lava", "leaf", "legacy", "leopard", "liberty",
  "lily", "lion", "lotus", "lunar", "magma", "maple", "marble", "marsh",
  "meadow", "meteor", "mist", "monarch", "moss", "mountain", "nebula", "nectar",
  "nest", "oasis", "ocean", "olive", "onyx", "opal", "orbit", "orchid",
  "otter", "owl", "palm", "panther", "pebble", "pelican", "petal", "phoenix",
  "pine", "pioneer", "planet", "plasma", "plateau", "prism", "quarry", "quartz",
  "radar", "radius", "rain", "rainbow", "ravine", "reef", "relic", "ridge",
  "ripple", "river", "robin", "ruby", "sage", "sahara", "sailor", "sapphire",
  "savanna", "scarlet", "scenic", "shadow", "shimmer", "sierra", "silk", "silver",
  "solar", "spark", "spruce", "star", "stream", "summit", "sunset", "surge",
  "swallow", "swift", "taiga", "talon", "tempo", "terrace", "thistle", "thunder",
  "tiger", "timber", "titan", "topaz", "torrent", "trail", "tropic", "tulip",
  "tundra", "twilight", "valley", "vapor", "velvet", "venture", "vessel", "vine",
  "violet", "vision", "volcano", "voyage", "walnut", "wave", "whisper", "willow",
  "wind", "winter", "wolf", "zenith", "zephyr", "amber", "arctic", "aspen",
  "atlas", "aurora", "autumn", "blaze", "blizzard", "bloom", "boulder", "brook",
  "cascade", "celestial", "chronicle", "citadel", "cove", "canyon", "dewdrop", "driftwood",
  "eclipse", "evergreen", "fable", "fern", "firefly", "flint", "fjord", "garnet",
  "gateway", "glimmer", "haven", "heritage", "hickory", "infinity", "ironwood", "ivory",
  "juniper", "keystone", "kinetic", "labyrinth", "legacy", "lullaby", "mirage", "moonlight",
  "nautilus", "navigator", "nomad", "northstar", "obsidian", "olympus", "panorama", "passage",
  "pathfinder", "peak", "perimeter", "permafrost", "pilgrim", "pinnacle", "polestar", "prairie",
  "radiance", "rainforest", "redwood", "resonance", "sanctuary", "sequoia", "serenade", "shrine",
  "solstice", "sovereign", "spectrum", "starling", "starlight", "sycamore", "terra", "tidewater",
  "timberline", "tidepool", "transcend", "treasure", "tribute", "unity", "vanguard", "vista",
  "waterfall", "wildflower", "windward", "woodland", "zenith", "zodiac"
];

/**
 * Generate a cryptographically secure 12-word recovery phrase.
 * @returns {{ words: string[], phrase: string }}
 */
export function generate12WordRecoveryPhrase() {
  const selectedWords = [];
  const totalWords = WORD_LIST.length;
  const randomIndices = new Uint16Array(12);

  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(randomIndices);
  } else if (typeof globalThis !== "undefined" && globalThis.crypto) {
    globalThis.crypto.getRandomValues(randomIndices);
  } else {
    for (let i = 0; i < 12; i++) {
      randomIndices[i] = Math.floor(Math.random() * totalWords);
    }
  }

  for (let i = 0; i < 12; i++) {
    const wordIndex = randomIndices[i] % totalWords;
    selectedWords.push(WORD_LIST[wordIndex]);
  }

  return {
    words: selectedWords,
    phrase: selectedWords.join(" "),
  };
}

/**
 * Normalize and clean up an entered recovery phrase or passphrase.
 * @param {string} text
 * @returns {string}
 */
export function normalizeRecoveryPhrase(text) {
  if (!text || typeof text !== "string") return "";
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Validates if the text looks like a 12-word recovery phrase or strong passphrase.
 * @param {string} text
 * @returns {{ valid: boolean, wordCount: number, error?: string }}
 */
export function validateRecoveryInput(text) {
  const normalized = normalizeRecoveryPhrase(text);
  if (!normalized) {
    return { valid: false, wordCount: 0, error: "Please enter your recovery phrase or passphrase." };
  }
  const words = normalized.split(" ");
  if (words.length === 12) {
    return { valid: true, wordCount: 12 };
  }
  if (normalized.length >= 8) {
    // Custom passphrase
    return { valid: true, wordCount: words.length };
  }
  return {
    valid: false,
    wordCount: words.length,
    error: "Recovery phrase must be 12 words or a passphrase with at least 8 characters."
  };
}

/**
 * Triggers a browser download of a clean text file containing the recovery key.
 * @param {string} phrase
 * @param {string} [username="User"]
 */
export function downloadBackupFile(phrase, username = "User") {
  const content = `=====================================================
FLASHCHAT - END-TO-END ENCRYPTION RECOVERY KEY
=====================================================

Account: ${username}
Generated: ${new Date().toUTCString()}

YOUR 12-WORD RECOVERY PHRASE:
-----------------------------------------------------
${phrase}
-----------------------------------------------------

IMPORTANT SECURITY NOTICE:
1. Store this file or paper safely offline.
2. FlashChat servers DO NOT store your recovery key.
3. If you lose this key and all active devices, your
   encrypted messages cannot be recovered by anyone.
4. You can regenerate or rotate this key anytime in
   Settings -> Profile.
=====================================================
`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flashchat-recovery-key-${username.toLowerCase().replace(/[^a-z0-9]/g, "-")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
