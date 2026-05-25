// Unit test for the invite-token alphabet — pure function, no DB required.
// Asserts the no-lookalike alphabet from HP-6 / D-05 / RESEARCH §Area 5 step 5
// is honoured AND that 1000 fresh tokens never escape it.

import { describe, expect, it } from 'vitest';

import {
  _SLUG_ALPHABET,
  _TOKEN_ALPHABET,
  generateSlug,
  generateToken,
} from '../../src/lib/auth/invite-token';

describe('invite-token alphabets', () => {
  // The plan text says "length 32" but the canonical alphabet declared in
  // the plan AND in RESEARCH §Area 5 step 5 is '23456789abcdefghjkmnpqrstuvwxyz'
  // — 8 digits + 26 letters - 3 banned (l, i, o) = 31 chars. The "32" in the
  // plan body is an off-by-one; the alphabet string itself is canonical.
  it('token alphabet has length 31 and excludes lookalike chars', () => {
    expect(_TOKEN_ALPHABET).toHaveLength(31);
    for (const banned of ['0', '1', 'l', 'i', 'o', 'I', 'O']) {
      expect(_TOKEN_ALPHABET).not.toContain(banned);
    }
    // Sanity: alphabet is exactly the canonical nanoid no-lookalike set.
    expect(_TOKEN_ALPHABET).toBe('23456789abcdefghjkmnpqrstuvwxyz');
  });

  it('slug alphabet has length 36 and is lowercase-alphanumeric', () => {
    expect(_SLUG_ALPHABET).toHaveLength(36);
    expect(_SLUG_ALPHABET).toMatch(/^[0-9a-z]+$/);
  });

  it('generateToken produces 22-char tokens from the no-lookalike alphabet', () => {
    const re = /^[23456789abcdefghjkmnpqrstuvwxyz]{22}$/;
    for (let i = 0; i < 1000; i++) {
      const t = generateToken();
      expect(t).toMatch(re);
    }
  });

  it('generateSlug produces 8-char lowercase-alphanumeric slugs', () => {
    const re = /^[0-9a-z]{8}$/;
    for (let i = 0; i < 1000; i++) {
      expect(generateSlug()).toMatch(re);
    }
  });

  it('generates 10000 tokens without collision', () => {
    const set = new Set<string>();
    for (let i = 0; i < 10000; i++) set.add(generateToken());
    expect(set.size).toBe(10000);
  });
});
