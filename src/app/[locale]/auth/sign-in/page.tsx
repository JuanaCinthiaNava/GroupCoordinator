// Sign-in page — Surface 5 entry point.
//
// RSC. Renders the Logo + a client SignInClient that mounts the bottom sheet
// open by default. Reads ?error= and ?next= so collision-recovery copy can be
// shown when the OAuth callback redirected us here.
//
// Already-signed-in users get redirected straight to `next ?? '/me'` — no
// reason to gate them behind the sheet.

import { Logo } from '@/components/Logo';
import { createServerClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignInClient } from './SignInClient';

export const metadata: Metadata = { robots: 'noindex, nofollow' };

function safeNext(raw: unknown): string {
  if (typeof raw !== 'string') return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const nextPath = safeNext(sp.next);
  const errorParam = typeof sp.error === 'string' ? sp.error : undefined;

  // If already authenticated, skip the sheet entirely.
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && user.is_anonymous !== true) {
    redirect(nextPath || '/me');
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-4">
      <div className="flex flex-col items-center">
        <Logo size="lg" />
      </div>
      <SignInClient initialError={errorParam} nextPath={nextPath} />
    </div>
  );
}
