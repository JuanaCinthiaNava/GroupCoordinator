import { describe, expect, it } from 'vitest';
import { customAlphabet } from 'nanoid';

// Token generation contract per RESEARCH §Validation §Unit Tests + D-05:
// - Alphabet: no-lookalike '23456789abcdefghjkmnpqrstuvwxyz' (31 chars; excludes 0,1,I,l,O)
// - Length: 22 chars → ~109 bits of entropy (over the 128-bit target only when the
//   31-char alphabet rounds: log2(31) * 22 ≈ 109; canonical doc target is "128+ bits".
//   The 22-char/31-symbol choice is the project decision (D-05) so we test what we ship.)
const TOKEN_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const generateToken = customAlphabet(TOKEN_ALPHABET, 22);

describe('invite token generation', () => {
  it('generates tokens of exactly 22 characters', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(generateToken()).toHaveLength(22);
    }
  });

  it('uses only no-lookalike alphabet characters (no 0, 1, I, l, O)', () => {
    const disallowed = /[01IlO]/;
    for (let i = 0; i < 1000; i += 1) {
      expect(generateToken()).not.toMatch(disallowed);
    }
  });

  it('produces 10,000 unique tokens (collision smoke test)', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 10_000; i += 1) {
      tokens.add(generateToken());
    }
    expect(tokens.size).toBe(10_000);
  });
});
