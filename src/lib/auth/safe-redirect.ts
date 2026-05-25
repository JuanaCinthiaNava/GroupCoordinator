// T-05-01 — Open-redirect guard for OAuth callback / sign-in `next` params.
//
// Reject anything that could escape the application:
//   - null / empty                       → fallback
//   - missing leading slash              → fallback
//   - protocol-relative ('//evil.com')    → fallback
//   - embedded scheme ('/javascript:…')   → fallback
//
// Single source of truth. Used by /auth/callback (server) and
// /auth/sign-in's SignInClient (browser) so both reject identically.

export function safeNext(raw: string | null | undefined, fallback = '/me'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (raw.toLowerCase().startsWith('/javascript:')) return fallback;
  return raw;
}
