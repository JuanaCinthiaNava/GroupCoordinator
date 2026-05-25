// Sign-out — POST only (T-05-02 CSRF mitigation).
//
// Drive-by attacks via image src or pre-fetched links cannot trigger sign-out
// because we reject every method except POST. HeaderUserMenu (and any other
// in-app sign-out affordance) MUST use a <form method="post"> or fetch POST.

import { type CookieOptions, createServerClient as createSsrServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

async function handleSignOut(request: NextRequest): Promise<NextResponse> {
  // Build the redirect response BEFORE the Supabase client so setAll can
  // mutate response.cookies (the auth cookie clearing must land on the same
  // response as the redirect — Pitfall 2).
  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return response;
  }

  const supabase = createSsrServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: CookieOptions;
        }>
      ) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    await supabase.auth.signOut();
  } catch {
    // Best-effort: even if signOut fails (e.g., already signed out), we still
    // clear any cookies @supabase/ssr emitted and return the redirect.
  }

  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleSignOut(request);
}

// Reject all other methods to keep drive-by GETs from logging users out.
const METHOD_NOT_ALLOWED = (): NextResponse =>
  new NextResponse('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST' },
  });

export const GET = METHOD_NOT_ALLOWED;
export const PUT = METHOD_NOT_ALLOWED;
export const DELETE = METHOD_NOT_ALLOWED;
export const PATCH = METHOD_NOT_ALLOWED;
