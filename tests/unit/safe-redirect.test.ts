import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/auth/safe-redirect';

describe('safeNext open-redirect guard', () => {
  it('returns fallback for null / empty input', () => {
    expect(safeNext(null)).toBe('/me');
    expect(safeNext(undefined)).toBe('/me');
    expect(safeNext('')).toBe('/me');
  });

  it('returns fallback for input missing leading slash', () => {
    expect(safeNext('me')).toBe('/me');
    expect(safeNext('http://evil.example/me')).toBe('/me');
  });

  it('rejects protocol-relative URLs that could escape to another origin', () => {
    expect(safeNext('//evil.example/path')).toBe('/me');
    expect(safeNext('///evil.example')).toBe('/me');
  });

  it('rejects javascript: schemes (case-insensitive)', () => {
    expect(safeNext('/javascript:alert(1)')).toBe('/me');
    expect(safeNext('/JavaScript:alert(1)')).toBe('/me');
    expect(safeNext('/JAVASCRIPT:void(0)')).toBe('/me');
  });

  it('allows normal in-app paths', () => {
    expect(safeNext('/me')).toBe('/me');
    expect(safeNext('/plan/abc')).toBe('/plan/abc');
    expect(safeNext('/plan/abc/settings')).toBe('/plan/abc/settings');
    expect(safeNext('/plan/abc?share=1')).toBe('/plan/abc?share=1');
  });

  it('honors a custom fallback', () => {
    expect(safeNext(null, '/')).toBe('/');
    expect(safeNext('//evil', '/')).toBe('/');
  });
});
