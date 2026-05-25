// AUTH-06 enforcement: every mutation surface uses this guard.
//
// CONTRACT:
// - Server-side only. Reads the current Supabase user via the RLS-bound server
//   client. If no user OR the user is anonymous (is_anonymous === true), calls
//   Next.js `redirect()` to /auth/sign-in?next=… (handled by the OAuth flow in
//   src/app/[locale]/auth/sign-in + src/app/auth/callback).
// - Returns the resolved authenticated user record so the caller can read
//   user.id, user.email, etc. without re-fetching.
//
// USAGE:
//   const cookieStore = await cookies();
//   const user = await getRequiredUser(cookieStore, '/plan/new');

import { createServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { redirect } from 'next/navigation';

export async function getRequiredUser(
  cookieStore: ReadonlyRequestCookies,
  nextPath: string
): Promise<User> {
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous === true) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}
