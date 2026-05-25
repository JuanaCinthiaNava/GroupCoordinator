// Dynamic OG image for /plan/[slug] share previews.
//
// CONTRACT (D-09, MP-5):
// - Public surface. Uses the service-role Supabase client because the OG image
//   is intentionally readable by any link recipient before they hold a session
//   — that's the marketing crawler's path. Only minimal data is selected:
//   title, start_date, end_date, owner_id (T-04-03 mitigation).
// - 1200×630 PNG. Emerald-700 → emerald-900 gradient. Geist Sans bold 56px
//   plan title (white), 'Creado por {name}' regular 28px (rgba white 0.8),
//   date range regular 24px (rgba white 0.7) when set, wordmark semibold 20px
//   (rgba white 0.6) anchored bottom-right.
// - 404 fallback: when the plan is missing OR archived, render a generic
//   "Plan no disponible" 1200×630 PNG with the same gradient so crawler
//   probes don't surface a 4xx (and so the response is still edge-cacheable).
// - Cache-Control: short edge-cache so title edits become visible within
//   ~1 hour without a CDN purge.
//
// We deliberately keep this on the default (Node) runtime so the service-role
// import path is identical to other server routes. Edge runtime would also
// work but introduces Edge-only quirks for next/og fonts and Supabase Admin.

import { loadGeistSans } from '@/lib/og/fonts';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
// Vitest's esbuild loader inherits tsconfig `jsx: "preserve"` and uses the
// classic JSX runtime when running this file outside Next's build pipeline.
// The explicit React import keeps `<div>` JSX valid in both Next builds
// (automatic runtime) and the test runner (classic runtime).
import * as React from 'react';

const WIDTH = 1200;
const HEIGHT = 630;

// Short edge cache so a title change becomes visible within an hour without
// forcing a CDN purge. SWR keeps the previous render until the new one is
// ready.
const CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

interface PlanForOg {
  title: string;
  start_date: string | null;
  end_date: string | null;
  owner_id: string;
  archived_at: string | null;
}

interface UserDisplayMeta {
  full_name?: string;
  name?: string;
}

function formatDateRange(startISO: string | null, endISO: string | null): string | null {
  if (!startISO) return null;
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : null;
  const dateFmt = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short' });
  const yearFmt = new Intl.DateTimeFormat('es', { year: 'numeric' });
  if (!end) return `${dateFmt.format(start)} ${yearFmt.format(start)}`;
  return `${dateFmt.format(start)} – ${dateFmt.format(end)} ${yearFmt.format(end)}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max - 1).trimEnd()}…` : str;
}

async function renderImage(opts: {
  title: string;
  creatorLabel: string | null;
  dateRange: string | null;
  fonts: { regular: ArrayBuffer; semibold: ArrayBuffer; bold: ArrayBuffer };
}): Promise<Response> {
  const { title, creatorLabel, dateRange, fonts } = opts;
  const hasFonts = fonts.regular.byteLength > 0;

  const node = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'linear-gradient(to right, #047857, #064e3b)',
        padding: 64,
        fontFamily: hasFonts ? 'Geist' : undefined,
        color: 'white',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          maxWidth: 900,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'white',
          }}
        >
          {truncate(title, 80)}
        </div>
        {creatorLabel ? (
          <div
            style={{
              display: 'flex',
              marginTop: 32,
              fontSize: 28,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {creatorLabel}
          </div>
        ) : null}
        {dateRange ? (
          <div
            style={{
              display: 'flex',
              marginTop: 16,
              fontSize: 24,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            {dateRange}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          right: 64,
          display: 'flex',
          fontSize: 20,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        GroupCoordinator
      </div>
    </div>
  );

  const responseInit: ConstructorParameters<typeof ImageResponse>[1] = {
    width: WIDTH,
    height: HEIGHT,
  };
  if (hasFonts) {
    responseInit.fonts = [
      { name: 'Geist', data: fonts.regular, weight: 400, style: 'normal' },
      { name: 'Geist', data: fonts.semibold, weight: 600, style: 'normal' },
      { name: 'Geist', data: fonts.bold, weight: 700, style: 'normal' },
    ];
  }

  const img = new ImageResponse(node, responseInit);
  // Re-emit with our cache headers so the platform CDN treats this as a
  // public, swr-able asset.
  return new Response(img.body, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': CACHE_CONTROL,
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ plan_slug: string }> }
): Promise<Response> {
  const { plan_slug } = await params;

  // Load fonts in parallel with the DB lookup — they cache after the first
  // request so the steady-state cost is just one fetch from the cache.
  const fontsPromise = loadGeistSans();

  let plan: PlanForOg | null = null;
  let creatorName: string | null = null;
  try {
    const admin = createServiceRoleClient();
    const lookup = await admin
      .from('plans')
      .select('title, start_date, end_date, owner_id, archived_at')
      .eq('slug', plan_slug)
      .maybeSingle<PlanForOg>();
    if (!lookup.error && lookup.data && !lookup.data.archived_at) {
      plan = lookup.data;
      try {
        const ownerLookup = await admin.auth.admin.getUserById(plan.owner_id);
        if (!ownerLookup.error && ownerLookup.data.user) {
          const meta = (ownerLookup.data.user.user_metadata ?? {}) as UserDisplayMeta;
          creatorName =
            meta.full_name ?? meta.name ?? ownerLookup.data.user.email?.split('@')[0] ?? null;
        }
      } catch {
        // ignore — creator name is best-effort
      }
    }
  } catch {
    // Fall through to the "Plan no disponible" fallback below.
  }

  const fonts = await fontsPromise;

  if (!plan) {
    return renderImage({
      title: 'Plan no disponible',
      creatorLabel: null,
      dateRange: null,
      fonts,
    });
  }

  return renderImage({
    title: plan.title,
    creatorLabel: creatorName ? `Creado por ${creatorName}` : null,
    dateRange: formatDateRange(plan.start_date, plan.end_date),
    fonts,
  });
}
