# Stack Research

**Project:** GroupCoordinator
**Domain:** Group coordination PWA (mobile-first web hub, OAuth + anonymous link-view, event-scoped plans in v1)
**Researched:** 2026-05-20
**Confidence:** HIGH (most decisions); MEDIUM (one or two genuinely close calls flagged below)

---

## TL;DR — The Prescribed Stack

> **Next.js 15.5 (App Router) on Vercel, with Supabase (Postgres + Auth + Storage + Realtime) and Drizzle ORM, styled with Tailwind v4 + shadcn/ui, mapped with MapLibre GL JS + OpenFreeMap tiles, and tested with Playwright + Vitest.**

This is the modern, marketable, free-to-launch, solo-friendly default for exactly this product shape in 2026. It supports every v2 candidate (expenses, photos, persistent groups, collaborative realtime) without rewrites.

### Why NOT Next.js 16 yet
Next.js 16 shipped May 7, 2026 (13 days before this research). It is stable but the wider ecosystem (shadcn CLI, Auth helpers, Supabase SSR cookbook, Serwist examples) still references 15.x patterns. For a solo learning-first project where polish > novelty, pin to **15.5 LTS** for the first milestone and upgrade to 16 in a dedicated "Upgrade" phase after the MVP ships. Revisit in 2-3 months.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why for this project |
|------------|---------|---------|----------------------|
| **Next.js** | 15.5.x (App Router) | Full-stack React framework (UI + API + SSR + edge) | Same codebase serves PWA, landing page, and API. App Router is now mature; built-in `manifest.ts` and `metadata` support cover PWA basics. Marketable on a portfolio. |
| **React** | 19.2.x | UI library | Bundled with Next 15.5. Stable Server Components, Server Actions, `use()` hook. Required by current shadcn/ui. |
| **TypeScript** | 5.6+ | Type safety | Non-negotiable in 2026 for portfolio polish and AI-assist productivity. Strict mode on from day 1. |
| **Tailwind CSS** | v4.x | Utility-first styling | v4 has zero-config setup, native CSS engine, dramatically faster builds. Pairs with shadcn/ui. |
| **shadcn/ui** | latest CLI (Tailwind v4 + React 19 compatible) | Copy-paste primitives over Radix | You own the code → infinitely customizable. Looks modern (the 2026 portfolio default). Spanish-language UI is trivial (no library lock-in). |
| **Supabase** | latest hosted | Postgres + Auth + Storage + Realtime in one platform | One vendor for DB, auth (Google + Apple OAuth + anonymous), file storage, and realtime. Free tier covers MVP. RLS is the killer feature for an "edit only if member of event" permission model. |
| **Drizzle ORM** | 0.36+ | Type-safe SQL builder + migrations | Lightweight (~1MB), no codegen step, edge-compatible, SQL-first (you'll learn SQL, not Prisma DSL). Works cleanly on Supabase Postgres. |
| **MapLibre GL JS** | 5.x | Map rendering | Open-source fork of Mapbox GL JS. WebGL vector tiles, smooth on mobile, no per-load fees. Pair with OpenFreeMap or MapTiler free tier. |
| **next-intl** | 3.x | i18n routing & messages | Spanish primary, but architected so English/Portuguese can be added in v2 without refactor. App Router native. |
| **Zod** | 3.23+ | Runtime validation schemas | Pairs with Drizzle, react-hook-form, Server Actions. Shared between client and server. |
| **react-hook-form** | 7.x | Form state & validation | Standard. Pairs with `@hookform/resolvers/zod`. |
| **TanStack Query** | v5.x | Client cache for interactive views | Server Components handle initial load; TanStack Query handles itinerary-during-event refresh, optimistic voting updates, polling fallback if realtime not yet wired. |
| **date-fns** | 4.x (with `date-fns-tz`) | Date math for itineraries | Lightweight, tree-shakable, Spanish locale built in. Avoid Moment (deprecated) and Day.js (smaller ecosystem). |

### Supporting Libraries

| Library | Version | Purpose | When to use |
|---------|---------|---------|-------------|
| `@supabase/ssr` | latest | Cookie-based Supabase auth helper for Next.js App Router | All auth flows (server components, route handlers, middleware). Required, not optional. |
| `@serwist/next` | 9.x | Service worker generation for PWA (next-pwa successor) | Once the app shell is stable. Skip in week 1 — add at end of MVP. |
| `@maplibre/maplibre-gl-leaflet` or `react-map-gl/maplibre` | latest | React wrapper for MapLibre | `react-map-gl` is the de-facto React binding; supports MapLibre since v7. |
| `lucide-react` | latest | Icon set used by shadcn/ui | Already a shadcn dependency. |
| `@tanstack/react-query-devtools` | matching v5 | Cache inspector | Dev-only. |
| `sonner` | latest | Toast notifications | shadcn-recommended; minimal API. |
| `cmdk` | latest | Command-K menu (search, "find that booking link") | Aligns perfectly with the *findability* core value. Add in v1 — it IS the wedge. |
| `nuqs` | 2.x | URL-as-state for filters/tabs | Keeps deep-linkable filters in the URL. Useful for "share link to a specific itinerary day." |
| `next-safe-action` (optional) | 7.x | Type-safe Server Actions with Zod | Use if you go Server Actions over tRPC (you should — see below). |
| `vitest` | 2.x | Unit / integration testing | Faster, ESM-native, drop-in replacement for Jest. |
| `@playwright/test` | 1.49+ | E2E + mobile viewport + PWA install testing | The 2026 default. Free, fast, supports iOS Safari and Chrome Android emulation. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `pnpm` | Package manager | Faster, disk-efficient, handles React 19 peer deps without `--legacy-peer-deps`. |
| Biome (or ESLint + Prettier) | Lint + format | Biome is faster and one tool, but ESLint has more Next.js plugins. **Pick Biome** for a greenfield solo project — less config, modern. |
| Drizzle Kit | Migrations + studio | `drizzle-kit push` for dev, `generate` + `migrate` for prod. |
| Vercel CLI | Deploy + env management | `vercel env pull` for local `.env.local` sync. |
| Supabase CLI | Local Postgres + migrations + types | `supabase start` runs full stack in Docker locally. Required for offline dev. |

---

## Decisions With Rationale

### Frontend framework: **Next.js 15.5 (App Router)** ✅
- **Why:** App Router gives you streaming SSR (fast first paint on mobile), Server Components (less JS shipped), Server Actions (mutations without an API layer), and built-in PWA manifest support. Same project hosts the marketing landing page (`/`) and the app (`/app`) on the same domain — solves your "one deploy serves marketing + app" requirement directly.
- **Alternatives considered:** SvelteKit (smaller community, less marketable on portfolio), Remix/React Router 7 (smaller ecosystem for this domain), Astro (excels at content sites, weaker for stateful app shell). Next.js is the safe, marketable, high-ceiling choice.
- **Confidence:** HIGH

### Backend / API style: **Server Actions + Route Handlers, NOT tRPC** ✅
- **Why:** For a solo dev on Next.js App Router building forms-and-mutations CRUD (vote, add itinerary item, edit note), Server Actions are simpler, server-component-native, and one less abstraction to learn. tRPC shines for SPA-style heavy client interaction with pagination/filters — not your shape.
- **When you'd add tRPC:** Only if v2 brings a separate mobile native client. Until then, Server Actions + `next-safe-action` (or raw + Zod) is enough.
- **Route Handlers** still get used for webhooks, OAuth callbacks, and any public API endpoints.
- **Confidence:** HIGH

### Database + ORM: **Postgres on Supabase + Drizzle ORM** ✅
- **Why Supabase Postgres:** Free tier (500 MB DB, 1 GB storage, 50K MAU auth) covers MVP and likely first year. Bundles auth + storage + realtime under one bill. RLS is *the* right primitive for "members of event X can edit, others can read." Trade-off: free projects pause after 7 days of zero traffic (wakes on visit, ~2s cold start).
- **Why Drizzle over Prisma:** Drizzle is ~90% smaller bundle, no codegen step, edge-compatible, and SQL-first (you'll *learn SQL*, valuable for portfolio). Prisma 7 narrowed the gap dramatically, so this is a MEDIUM-confidence call — both are fine. Drizzle is the trending choice in 2026 and pairs naturally with Supabase RLS (you keep writing real SQL).
- **Alternative if Supabase pauses worry you:** Neon (scale-to-zero with fast cold start, ~$5/mo if you outgrow free). But then you give up bundled Auth/Storage/Realtime — you'd reassemble those from Clerk + S3 + Pusher, multiplying complexity and cost. Stick with Supabase.
- **Confidence:** HIGH (Supabase), MEDIUM (Drizzle vs Prisma — both viable; roadmap may decide)

### Auth: **Supabase Auth** ✅
- **Why:** Native Google OAuth + native Apple Sign In + native **anonymous sessions with `linkIdentity()`** — this last one is critical and unique. Your hybrid onboarding flow ("view by link without account, vote requires OAuth") maps *directly* onto Supabase's `signInAnonymously()` → `linkIdentity()` pattern: a viewer gets an anonymous session on first link visit, and when they tap "Vote," they upgrade by linking a Google/Apple identity to the same user row. Zero data migration; identical user ID.
- **Cost:** 50K MAU free; ~$25/mo Pro at scale.
- **Apple gotcha:** Apple OAuth secret expires every 6 months. Calendar a reminder.
- **Use `sb_publishable_*` / `sb_secret_*`** key format (the legacy `anon` / `service_role` keys deprecate end of 2026).
- **Alternatives:** Clerk (gorgeous UI, but $25/mo at 10K MAU and no Postgres-native RLS); Auth.js v5 / Better Auth (more boilerplate, no built-in anonymous→OAuth linking primitive).
- **Confidence:** HIGH

### PWA tooling: **Serwist (`@serwist/next`)** ✅
- **Why:** `next-pwa` is unmaintained as of 2025. Serwist is the maintained successor by the same author, built on Workbox, Next 15 + App Router compatible. Handles precache manifest, runtime caching strategies, offline fallback, and install prompts.
- **Defer to end of MVP:** Ship the responsive web app first; bolt PWA on as a polish phase. PWA debugging eats time and shouldn't block feature work.
- **Confidence:** HIGH

### Realtime: **Supabase Realtime (Broadcast + Postgres Changes), NOT Liveblocks** ✅
- **Why:** Your collaboration model is *coarse-grained* (someone adds an itinerary item, others see it within seconds) — NOT fine-grained collaborative text editing (Figma/Notion-style). Supabase Realtime handles the coarse case natively, free up to 2 million messages / 200 concurrent connections. Liveblocks is $939/mo at 10K MAU and overkill for "show me the new vote count."
- **For v1:** You may not even need realtime — TanStack Query polling every 10s during event days is "good enough" and ships in a day. Wire Supabase Realtime in milestone 2.
- **For v2 collaborative editing of itinerary blocks:** If you ever want true conflict-free concurrent editing, add Yjs + `y-supabase` (community provider). Don't pay for Liveblocks until validated.
- **Confidence:** HIGH

### Map provider: **MapLibre GL JS + OpenFreeMap tiles** ✅
- **Why MapLibre:** Open-source, no vendor lock-in, no per-load fees, WebGL vector tiles look modern on mobile. Same API as Mapbox GL JS so swapping providers later is trivial.
- **Why OpenFreeMap tiles (vs MapTiler/Mapbox):** OpenFreeMap is genuinely free, CDN-backed, OSM-based. Good enough for "pin a restaurant and a hotel." If style quality matters for portfolio screenshots, MapTiler free tier (100K requests/mo) gives prettier tiles.
- **NOT Google Maps:** ~28K free loads/mo, $7/1K overage, expensive at scale, and visually generic. The 2025+ pricing changes made it the worst hobby choice.
- **NOT Mapbox:** Generous free tier (50K loads) but you risk vendor lock-in and the open-source/free-forever story is stronger for a portfolio piece.
- **Library:** Use `react-map-gl/maplibre` (the React wrapper). Skip `react-leaflet` — Leaflet is raster-tile-based, looks dated, and the gap on bundle size no longer favors it.
- **Confidence:** HIGH

### File storage: **Supabase Storage** ✅
- **Why:** Already in the stack, bundled in the free tier (1 GB), RLS-secured buckets (same permission model as your DB), CDN-backed. For "screenshot of a hotel booking" and "PDF of festival ticket" — perfectly sufficient.
- **Image transformations:** Supabase Storage has a built-in image transformation API (resize, format) on paid tier. On free tier, use Next.js `<Image />` for resizing.
- **NOT Cloudinary:** Adds a second vendor + bill. Only add when you ship the v2 photo album feature *and* validate user demand for transformations.
- **NOT UploadThing:** Convenient SDK but yet another vendor; Supabase Storage's DX is already good with `@supabase/ssr`.
- **Confidence:** HIGH

### Hosting: **Vercel (Hobby tier)** ✅
- **Why:** Next.js is a Vercel product → unparalleled DX, zero-config deploys, preview URLs per PR, fastest cold starts for Next.js specifically. Hobby tier: 100 GB bandwidth, 1M edge requests, unlimited deploys.
- **Hobby tier caveat:** Vercel's Hobby tier is for **personal/non-commercial** use. If GroupCoordinator starts charging users or running ads, you'd technically need Pro ($20/mo). For pure portfolio + free public app, Hobby is compliant.
- **Alternative if commercial intent:** Cloudflare Pages (unlimited bandwidth, free for commercial) — but you'll fight more edge-runtime quirks with Next.js. Stick with Vercel until you have revenue.
- **Confidence:** HIGH

### Styling/UI: **Tailwind v4 + shadcn/ui** ✅
- **Why:** The 2026 portfolio-default combo. Tailwind v4 has near-zero config, fast builds. shadcn/ui gives you Radix-based, accessible, customizable primitives — and crucially, you OWN the code, so customizing the visual language to feel less "generic shadcn" is straightforward (the wedge for a polished portfolio piece).
- **NOT Mantine / daisyUI / Chakra:** Those are component libraries you import → harder to customize visually → portfolio app looks like everyone else's.
- **NOT raw Radix:** Too much wiring for a solo dev under time pressure.
- **Confidence:** HIGH

### State management: **Server-first + TanStack Query for interactive views; tiny Zustand only if needed** ✅
- **Why:** Server Components fetch data on the server (no client state needed for static reads). TanStack Query handles client cache for the live itinerary view, voting page, etc. URL state via `nuqs`. You likely do not need a global client store at all in v1.
- **If you need ephemeral client state** (sidebar open, modal stack): React `useState` + small Zustand store. Skip Jotai/Redux entirely.
- **Confidence:** HIGH

### Forms + validation: **react-hook-form + Zod + (optionally) next-safe-action** ✅
- **Why:** The undisputed 2026 default. Zod schemas shared between client (RHF resolver) and server (Server Action validation). `next-safe-action` adds typed return values to Server Actions if you want even less boilerplate.
- **Confidence:** HIGH

### Testing: **Vitest (unit) + Playwright (E2E) + Storybook (later, optional)** ✅
- **Why this layering for a solo dev:**
  - **Vitest** for pure functions (date math, vote tallying, RLS policy logic) — fast, ESM-native.
  - **Playwright** for one happy-path E2E per critical flow: create plan → invite → anon view → OAuth login → vote → see result. Five tests cover 80% of regression risk. Mobile viewport built in.
  - **Skip component tests in v1** — they have the worst ROI for a solo dev.
  - **Storybook in v2** if/when the visual library grows past ~20 components.
- **NOT Cypress:** Playwright is faster, free-er to scale in CI, multi-browser by default, and the 2026 trend line is unambiguous.
- **Confidence:** HIGH

---

## Installation

```bash
# Project bootstrap (pnpm + Next 15.5 + TS + Tailwind v4 + App Router)
pnpm create next-app@15.5 group-coordinator \
  --typescript --tailwind --app --eslint=false --src-dir --import-alias "@/*"

cd group-coordinator

# Replace ESLint with Biome
pnpm remove eslint
pnpm add -D --save-exact @biomejs/biome
pnpm biome init

# shadcn/ui (Tailwind v4 + React 19 compatible)
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card dialog form input label \
  select sonner tabs toast tooltip dropdown-menu avatar badge \
  command sheet

# Supabase (DB + Auth + Storage + Realtime)
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D supabase

# Drizzle ORM + Postgres driver
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Data / forms / validation
pnpm add @tanstack/react-query @tanstack/react-query-devtools
pnpm add react-hook-form @hookform/resolvers zod
pnpm add next-safe-action
pnpm add nuqs

# Maps
pnpm add maplibre-gl react-map-gl

# i18n
pnpm add next-intl

# Dates
pnpm add date-fns date-fns-tz

# PWA (add in MVP polish phase, not week 1)
pnpm add @serwist/next serwist

# Testing
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps

# Misc UI helpers
pnpm add cmdk lucide-react
```

---

## Cost Projection (Hobby Tier)

| Stage | Vercel | Supabase | Maps | Total / month |
|-------|--------|----------|------|---------------|
| Pre-launch (dev only) | $0 (Hobby) | $0 (Free) | $0 (OpenFreeMap) | **$0** |
| Public launch, <50K MAU | $0 (Hobby, if non-commercial) | $0 (Free, if active enough not to pause) | $0 | **$0** |
| Growing, paused-DB risk | $0 | $25 (Pro, removes pause) | $0 | **$25** |
| If commercial intent declared | $20 (Pro) | $25 (Pro) | $0 | **$45** |
| Scale: 100K MAU, lots of writes | $20 | ~$50 (compute add-ons) | $0–20 (maybe paid tiles) | **~$90** |

You stay free until product-market fit signals are clear. The stack never forces a cost cliff.

---

## Alternatives Considered

| Recommended | Alternative | When the alternative is better |
|-------------|-------------|--------------------------------|
| Next.js 15.5 | Next.js 16 | If you start in 3+ months — by then ecosystem will have caught up. Re-evaluate at next milestone. |
| Next.js | SvelteKit | If you want to *learn Svelte* specifically. Sacrifices portfolio marketability and ecosystem depth. |
| Supabase Auth | Clerk | If gorgeous prebuilt UI matters more than cost and you can stomach $25/mo at low MAU. NOT for this project. |
| Supabase DB | Neon + Clerk + S3 + Pusher | If your DB must never sleep AND you've outgrown Supabase free. Adds 3 vendors. Defer this decision. |
| Drizzle | Prisma 7 | If you prefer schema DSL > raw SQL and don't mind 1MB bundle. Genuinely close call. Roadmap may pick. |
| MapLibre + OpenFreeMap | Mapbox GL JS | If pixel-perfect cartography is a product differentiator (it isn't for v1). |
| Server Actions | tRPC | If you add a native mobile client in v2 that needs a typed API surface separate from web. |
| Vercel | Cloudflare Pages | If commercial use on free tier matters AND you accept some Next.js edge-runtime debugging. |
| Supabase Realtime | Liveblocks / Yjs | If you ship real concurrent text editing of itinerary blocks (Notion-style). Not v1. |
| Playwright | Cypress | If you value GUI debugger ergonomics over CI cost and multi-browser support. |

---

## What NOT to Use

| Avoid | Why | Use instead |
|-------|-----|-------------|
| `next-pwa` | Unmaintained since 2024 | `@serwist/next` |
| Pages Router | Legacy, App Router is the future and what shadcn/Supabase/Auth.js docs target | App Router |
| Prisma <7 | Old bundle size, slow cold starts | Drizzle (or Prisma 7+ if you must) |
| Mongoose / MongoDB | Your data is relational (events ↔ items ↔ votes ↔ users) — fighting the wrong tool | Postgres |
| Firebase | Vendor lock-in, NoSQL forces awkward modeling, security rules are painful | Supabase |
| Redux / Redux Toolkit | Overkill for this app shape; Server Components + TanStack Query make global stores unnecessary | TanStack Query + nuqs + (maybe) Zustand |
| Moment.js | Deprecated since 2020 | date-fns |
| Material UI / Chakra / Mantine | Hard to make NOT look like every other MUI app — kills portfolio polish | shadcn/ui (you own the code) |
| Google Maps Platform | Expensive at scale, generic visuals, recent pricing changes hurt hobby use | MapLibre + OpenFreeMap |
| Cypress | Slower, paid scaling, single-browser feel | Playwright |
| Jest | Slower, CJS-rooted, dying for new React projects | Vitest |
| `create-react-app` | Officially deprecated | `create-next-app` |
| Auth0 (for this scale) | Enterprise pricing, overkill | Supabase Auth |
| `react-leaflet` for new builds | Raster tiles look dated; smaller perf ceiling | `react-map-gl/maplibre` |

---

## Stack Patterns by Variant

**If milestone 1 ships in 4 weekends (tight):**
- Skip PWA service worker, skip realtime, skip i18n routing (just hardcode Spanish strings). Add them in milestone 2.
- Skip Storage entirely if you defer screenshot/doc upload to milestone 2.
- This leaves you with: Next + Supabase Auth + Drizzle + shadcn + MapLibre + Server Actions. ~6 dependencies of substance.

**If you discover you need true collaborative editing in v2:**
- Add Yjs + `y-supabase` for CRDT sync over Supabase Realtime (free).
- Do NOT default to Liveblocks until proven.

**If v2 brings persistent groups + expense splitting:**
- Schema-wise: add `groups`, `group_memberships` tables; `events.group_id` becomes nullable (event-scoped OR group-scoped). Drizzle migrations handle this.
- Expenses: a separate `expenses` + `expense_splits` table model is straightforward in Postgres. No new infra needed.

**If portfolio reception is strong and you want a native mobile app in v3:**
- Add Expo (React Native) → reuse Supabase client, reuse Zod schemas, reuse business logic. The web-first Next.js stack is friendly to this expansion.

---

## Version Compatibility

| Package | Version | Notes |
|---------|---------|-------|
| Next.js | 15.5.x | Pin to 15.5 (LTS-ish). Avoid 16.x until ecosystem catches up (revisit Aug 2026). |
| React | 19.2.x | Bundled with Next 15.5. shadcn/ui requires 19+. |
| Tailwind | 4.x | Requires modern browsers (no IE11 support — fine for PWA). |
| pnpm | 9+ | Required for clean React 19 peer-dep resolution (npm needs `--legacy-peer-deps`). |
| Drizzle ORM | 0.36+ | Required for full Postgres feature parity. |
| `@supabase/ssr` | latest | Replaces older `@supabase/auth-helpers-nextjs` (deprecated). |
| Supabase API keys | `sb_publishable_*` / `sb_secret_*` | New format. Old `anon` / `service_role` keys deprecate end of 2026. |
| Serwist | 9.x | Next 15 + App Router support. |
| Playwright | 1.49+ | Trace viewer + mobile emulation. |

---

## Open Questions for Roadmap

1. **Drizzle vs Prisma 7** — both viable; Drizzle recommended but if you prefer schema DSL, Prisma is fine. Lock this in milestone 1 planning.
2. **i18n in v1 vs v2** — recommended to install `next-intl` from day 1 to avoid string-extraction refactor later, but full multi-language can wait.
3. **PWA timing** — recommended at end of MVP, but if "installable" is core to marketing, move earlier.
4. **Realtime in v1?** — recommended NO (polling is good enough), but a 1-2 day investment in Supabase Realtime would feel more "live" for portfolio demos. Roadmap decision.
5. **Vercel Hobby vs Pro at launch** — Hobby is fine for personal/portfolio framing; if you put a "buy me a coffee" or affiliate link, you've nominally entered commercial territory. Decide framing before public launch.

---

## Sources

- [Next.js 15.5 release notes](https://nextjs.org/blog/next-15-5) — HIGH confidence
- [Next.js 16 release notes](https://nextjs.org/blog/next-16) — HIGH (used to justify NOT-yet decision)
- [Supabase Pricing](https://supabase.com/pricing) and [Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing) — HIGH
- [Supabase Anonymous Sign-Ins docs](https://supabase.com/docs/guides/auth/auth-anonymous) — HIGH (validates the OAuth-link-upgrade flow)
- [Supabase Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple) — HIGH
- [Drizzle vs Prisma 2026 comparisons](https://www.bytebase.com/blog/drizzle-vs-prisma/) and [makerkit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — MEDIUM (verified against Prisma's own comparison page)
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) and [Next.js 15 + React 19 docs](https://ui.shadcn.com/docs/react-19) — HIGH
- [Serwist + Next.js guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — HIGH
- [Mapbox vs MapLibre vs Google Maps pricing 2026](https://www.buildmvpfast.com/api-costs/maps) — MEDIUM (cross-verified with vendor docs)
- [Vercel vs Cloudflare vs Netlify 2026](https://www.devtoolreviews.com/reviews/vercel-vs-netlify-vs-cloudflare-pages-pricing-comparison-2026) — MEDIUM
- [tRPC Server Actions guidance](https://trpc.io/blog/trpc-actions) and [Server Actions vs tRPC 2026](https://caisy.io/blog/trpc-vs-server-actions) — HIGH
- [Auth.js v5 / Clerk / Supabase Auth 2026 comparison](https://makerkit.dev/blog/tutorials/better-auth-vs-clerk) — MEDIUM
- [Playwright vs Cypress 2026](https://bugbug.io/blog/test-automation-tools/cypress-vs-playwright/) — HIGH
- [TanStack Query SSR + App Router docs](https://tanstack.com/query/v5/docs/framework/react/guides/ssr) — HIGH

---

*Stack research for: GroupCoordinator (group coordination PWA, mobile-first, OAuth + anonymous, event-scoped v1)*
*Researched: 2026-05-20*
