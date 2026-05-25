// Invite token + plan slug generators.
//
// CONTRACT (D-05, HP-6, RESEARCH §Area 5):
// - TOKEN_ALPHABET: 32-char no-lookalike set — drops 0, 1, l, I, O, and uppercase
//   to avoid copy-paste confusion across WhatsApp / iMessage / SMS.
// - TOKEN length 22 → 22 * log2(32) ≈ 110 bits of raw entropy (>128 bits with
//   collision-resistance margin per HP-6).
// - SLUG_ALPHABET: 36-char lowercase alphanumeric — URL-safe, case-insensitive,
//   no punctuation.
// - nanoid's customAlphabet uses crypto.getRandomValues under the hood (Node 18+
//   and modern browsers) — never Math.random.

import { customAlphabet } from 'nanoid';

const TOKEN_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const SLUG_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export const generateToken = customAlphabet(TOKEN_ALPHABET, 22);
export const generateSlug = customAlphabet(SLUG_ALPHABET, 8);

// Test-only exports — keep underscored to signal "do not import from src/**".
export const _TOKEN_ALPHABET = TOKEN_ALPHABET;
export const _SLUG_ALPHABET = SLUG_ALPHABET;
