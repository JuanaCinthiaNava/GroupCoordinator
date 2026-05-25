// Security headers helper consumed by next.config.ts.
//
// CONTRACT (D-22):
// - Site-wide: Referrer-Policy: strict-origin-when-cross-origin
// - /plan/* and /i/*: X-Robots-Tag: noindex, nofollow + Referrer-Policy
//
// next.config.ts's `headers()` reads this list. Page-level <meta name="robots">
// is set per-page via Next 15.5's `metadata.robots` export — both layers run
// because some surface area (RSC `<head>`) and some (API/route handlers) only
// see HTTP headers.

export interface NextHeaderRule {
  source: string;
  headers: Array<{ key: string; value: string }>;
}

const REFERRER_POLICY = {
  key: 'Referrer-Policy',
  value: 'strict-origin-when-cross-origin',
} as const;

const X_ROBOTS_NOINDEX = {
  key: 'X-Robots-Tag',
  value: 'noindex, nofollow',
} as const;

export async function securityHeaders(): Promise<NextHeaderRule[]> {
  return [
    // Site-wide Referrer-Policy
    {
      source: '/:path*',
      headers: [REFERRER_POLICY],
    },
    // /plan/* — noindex + referrer policy
    {
      source: '/plan/:path*',
      headers: [X_ROBOTS_NOINDEX, REFERRER_POLICY],
    },
    // /i/* — noindex + referrer policy
    {
      source: '/i/:path*',
      headers: [X_ROBOTS_NOINDEX, REFERRER_POLICY],
    },
  ];
}
