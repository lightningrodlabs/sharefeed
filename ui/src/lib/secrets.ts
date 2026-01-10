/**
 * Secret words (passphrase) generation and conversion utilities.
 * Used for creating and joining sharing networks.
 *
 * Pattern follows Acorn's implementation where the passphrase
 * becomes the network seed for DNA cloning.
 */

/**
 * Generate a new 5-word passphrase using diceware.
 * Returns 5 random dictionary words separated by spaces.
 */
export async function generatePassphrase(): Promise<string> {
  // Dynamic import to keep bundle size down
  const { default: randomWord } = await import('diceware-word');
  return `${randomWord()} ${randomWord()} ${randomWord()} ${randomWord()} ${randomWord()}`;
}

/**
 * Convert a passphrase to a network seed (UID).
 * The network seed is used as the DNA modifier when cloning cells.
 *
 * @example
 * passphraseToNetworkSeed("word1 word2 word3 word4 word5")
 * // Returns: "sharefeed-word1-word2-word3-word4-word5"
 */
export function passphraseToNetworkSeed(passphrase: string): string {
  return `sharefeed-${passphrase.trim().split(/\s+/).join('-')}`;
}

/**
 * Convert a network seed back to a passphrase.
 *
 * @example
 * networkSeedToPassphrase("sharefeed-word1-word2-word3-word4-word5")
 * // Returns: "word1 word2 word3 word4 word5"
 */
export function networkSeedToPassphrase(seed: string): string {
  return seed.replace('sharefeed-', '').split('-').join(' ');
}

/**
 * Validate that a passphrase has the correct format.
 * Must be exactly 5 words separated by spaces.
 */
export function validatePassphrase(passphrase: string): { valid: boolean; error?: string } {
  const trimmed = passphrase.trim();

  if (!trimmed) {
    return { valid: false, error: 'Passphrase is required' };
  }

  const words = trimmed.split(/\s+/);

  if (words.length !== 5) {
    return { valid: false, error: `Passphrase must be exactly 5 words (got ${words.length})` };
  }

  if (!words.every(word => word.length > 0)) {
    return { valid: false, error: 'Each word must have at least one character' };
  }

  return { valid: true };
}

/**
 * Check if a string looks like a valid passphrase (5 words).
 * Simpler version of validatePassphrase for quick checks.
 */
export function isValidPassphrase(passphrase: string): boolean {
  return validatePassphrase(passphrase).valid;
}
