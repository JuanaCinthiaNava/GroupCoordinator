// App route group layout — sticky 56px header chrome. RSC.
//
// Reads the current Supabase user once at layout level so the header can
// render auth state without each child page re-fetching it. Per-page content
// (plan title, hero) still belongs in the page itself; the layout just owns
// the chrome.

import { PlanHeader } from '@/components/plan/PlanHeader';
import { createServerClient } from '@/lib/supabase/server';
import { setRequestLocale } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const headerList = await headers();
  // Best-effort current path for the next= sign-in redirect. Falls back to /me.
  const currentPath = headerList.get('x-pathname') ?? headerList.get('referer') ?? '/me';

  const userForHeader = user ? { id: user.id, isAnonymous: user.is_anonymous === true } : null;

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <PlanHeader currentPath={currentPath} user={userForHeader} />
      {children}
    </div>
  );
}
