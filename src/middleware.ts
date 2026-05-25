import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// D-01 fallback: /plan/[slug]?t=[token] is equivalent to /i/[token].
// We rewrite to /api/invite/[token]?next=/plan/[slug] so the handler can mint
// the session and redirect back to the same slug the user typed.
//
// The matcher (see export below) excludes /api, so the rewrite target naturally
// bypasses next-intl's locale prefixing. We strip a leading /es|/en|/pt segment
// when computing the `next` param so the handler does not get confused.
const PLAN_PATH_REGEX = /^\/(?:(es|en|pt)\/)?plan\/([^/?#]+)\/?$/;

export default function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const planMatch = pathname.match(PLAN_PATH_REGEX);
  const tokenParam = searchParams.get('t');
  if (planMatch && tokenParam) {
    const slug = planMatch[2];
    const target = request.nextUrl.clone();
    target.pathname = `/api/invite/${tokenParam}`;
    target.search = '';
    target.searchParams.set('next', `/plan/${slug}`);
    return NextResponse.rewrite(target);
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for:
  // - API routes (/api/*)
  // - Next.js internals (/_next/*, /_vercel/*)
  // - Static files (anything with a dot, e.g. /favicon.ico, /robots.txt)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
