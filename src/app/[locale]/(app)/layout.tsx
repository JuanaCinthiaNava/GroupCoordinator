// App route group layout — minimal shell. RSC.
//
// Plan 01-04 moved PlanHeader rendering out of this layout so that
// /plan/[slug] can mount a plan-aware header (plan title + member stack +
// owner gear) while /plan/new can mount a simpler chrome. Each child page
// (or its own layout) owns its header instance now. This keeps the layout
// agnostic of per-page data.

import { setRequestLocale } from 'next-intl/server';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <div className="flex min-h-dvh flex-col bg-zinc-50">{children}</div>;
}
