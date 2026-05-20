# Architecture Research

**Domain:** Group coordination web app — PWA mobile-first, event-scoped plans with hybrid (anonymous link-view + OAuth edit) access
**Researched:** 2026-05-20
**Confidence:** HIGH for stack-shaped patterns (Next.js + Supabase + MapLibre + next-intl); MEDIUM for hybrid-auth specifics where the cleanest implementation depends on a final stack pick and warrants a small spike.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                            CLIENT (PWA)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐  │
│  │ Plan View    │  │ Itinerary    │  │ Map (Maplibre│  │ Notes/  │  │
│  │ (RSC shell)  │  │ (Client + RQ)│  │  + pin sync) │  │ Uploads │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬────┘  │
│         │                 │                 │               │       │
│  ┌──────┴─────────────────┴─────────────────┴───────────────┴────┐  │
│  │  TanStack Query cache  +  Realtime channels (votes/itinerary) │  │
│  └──────┬─────────────────────────────────┬──────────────────────┘  │
│         │                                 │                         │
│  ┌──────┴───────┐                  ┌──────┴────────┐                │
│  │ Service      │                  │ IndexedDB     │                │
│  │ Worker       │                  │ (read cache,  │                │
│  │ (app shell,  │                  │  last plan)   │                │
│  │  /~offline)  │                  └───────────────┘                │
│  └──────────────┘                                                   │
└────────────┬─────────────────────────────────────────────────────────┘
             │ HTTPS (RSC fetch, Server Actions, signed URLs)
             │ WebSocket (Supabase Realtime)
┌────────────┴─────────────────────────────────────────────────────────┐
│                         EDGE / SERVER (Next.js)                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Middleware: locale routing + invite-token → session cookie   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │ /plan/[id] │  │ Server     │  │ /api/      │  │ Auth       │     │
│  │ RSC pages  │  │ Actions    │  │ uploads    │  │ callbacks  │     │
│  │ (read)     │  │ (mutations)│  │ (signed URL│  │ (Google,   │     │
│  │            │  │            │  │  minting)  │  │  Apple)    │     │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘     │
│        │               │               │               │            │
│        └───────────────┴───────┬───────┴───────────────┘            │
│                                │ Supabase JS client (server)        │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │
┌────────────────────────────────┴─────────────────────────────────────┐
│                          SUPABASE (BaaS)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ Postgres     │  │ Auth (OAuth  │  │ Realtime     │  │ Storage  │  │
│  │ + RLS        │  │ + anonymous  │  │ (postgres    │  │ (private │  │
│  │ + functions  │  │  sessions)   │  │  changes,    │  │  buckets,│  │
│  │              │  │              │  │  broadcast)  │  │  signed) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Plan RSC page** | Server-render plan shell (itinerary, places, notes summary) from a single Postgres read; owns SEO/OG tags. | Next.js App Router server component, Supabase server client, no client JS for first paint. |
| **Plan client island** | Hydrate interactive pieces: vote button, "edit item" modal, realtime subscription. | Client component subtree with TanStack Query + Supabase realtime channel. |
| **Auth boundary middleware** | Convert invite URL token → anonymous Supabase session cookie; gate edit routes for authenticated users. | Next.js middleware + Supabase `signInAnonymously` / OAuth callback handlers. |
| **Permission layer (RLS)** | Single source of truth for "who can read/write what". Every query/mutation passes through it. | Postgres RLS policies keyed off `auth.uid()`, `auth.jwt() ->> 'plan_id'`, and a `plan_members` join. |
| **Mutation surface** | Validated writes: create plan, add itinerary item, cast vote, upload note. | Next.js Server Actions (preferred) or `/api` route handlers; thin wrappers over Supabase calls with Zod validation. |
| **Realtime channel** | Push vote tallies and itinerary edits to all currently-viewing clients. | Supabase Realtime postgres_changes filtered by `plan_id`; one channel per open plan. |
| **Map module** | Render MapLibre instance; reconcile pin layer with `places` table. | Client-only component, dynamically imported, lazy-loaded with `next/dynamic({ ssr: false })`. |
| **Upload pipeline** | Mint short-lived signed upload URLs after authorization check; client uploads directly to Storage. | Server Action → `createSignedUploadUrl` → client `uploadToSignedUrl` → on success, insert `note` row referencing object path. |
| **Service worker** | Cache app shell + last-viewed plan JSON; serve `/~offline` fallback. | `@ducanh2912/next-pwa` (App Router compatible) with Workbox runtime caching. |
| **i18n layer** | Localized routing, message catalogs, formatting (dates/numbers). | `next-intl` with `[locale]` segment; Spanish default, English/Portuguese stubs scaffolded but unfilled. |
| **Landing** | Public marketing pages on same domain, no auth needed. | Static RSC pages under `/(marketing)` route group. |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── [locale]/                       # next-intl locale segment
│   │   ├── (marketing)/                # Landing, /about, /pricing — no auth
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx              # PWA chrome (install prompt, header)
│   │   │   ├── plan/
│   │   │   │   ├── new/page.tsx        # Create plan (auth required)
│   │   │   │   └── [planId]/
│   │   │   │       ├── page.tsx        # RSC plan overview (anon OK via link)
│   │   │   │       ├── itinerary/page.tsx
│   │   │   │       ├── map/page.tsx
│   │   │   │       ├── votes/page.tsx
│   │   │   │       ├── notes/page.tsx
│   │   │   │       └── settings/page.tsx  # Owner-only
│   │   │   └── me/page.tsx             # "My plans" — auth required
│   │   ├── auth/
│   │   │   ├── callback/route.ts       # OAuth return
│   │   │   └── sign-in/page.tsx
│   │   └── ~offline/page.tsx           # PWA fallback (App Router naming)
│   ├── api/
│   │   ├── uploads/route.ts            # Mint signed upload URL
│   │   └── invite/[token]/route.ts     # Token → session cookie redirect
│   └── manifest.ts                     # PWA manifest as TS
├── components/
│   ├── plan/                           # PlanHeader, ItineraryItem, VoteCard...
│   ├── map/                            # MapCanvas (dynamic, ssr:false), PinLayer
│   ├── ui/                             # shadcn/ui primitives
│   └── pwa/                            # InstallPrompt, OfflineBanner
├── lib/
│   ├── supabase/
│   │   ├── server.ts                   # Server-side client (cookies-aware)
│   │   ├── browser.ts                  # Client-side singleton
│   │   └── service-role.ts             # Admin operations (server-only)
│   ├── auth/
│   │   ├── invite-token.ts             # nanoid generation + verification
│   │   └── permissions.ts              # canEdit(plan, user), canView(plan, token)
│   ├── i18n/
│   │   ├── routing.ts                  # next-intl config
│   │   └── messages/{es,en,pt}.json
│   ├── queries/                        # TanStack Query keys + fetchers
│   └── validation/                     # Zod schemas (shared client/server)
├── server/
│   ├── actions/                        # Server Actions (one file per domain)
│   │   ├── plan.ts
│   │   ├── itinerary.ts
│   │   ├── votes.ts
│   │   ├── places.ts
│   │   └── notes.ts
│   └── realtime/                       # Channel helpers
├── middleware.ts                       # i18n + invite-token handoff
└── styles/

supabase/
├── migrations/                         # SQL migrations (declarative schema)
├── policies/                           # RLS policies (split per table for review)
└── seed.sql
```

### Structure Rationale

- **`[locale]` segment first:** next-intl convention; keeps i18n routing-level instead of per-component, makes URL-based language switching trivial, and lets the middleware do locale detection once.
- **Route groups `(marketing)` vs `(app)`:** different layouts (marketing has no PWA chrome, no auth context), but same domain — important for link-share branding and SEO.
- **`server/actions/` separated from `app/`:** Server Actions are not "pages" — keeping them in a sibling tree makes them discoverable, testable, and reusable across routes.
- **`lib/supabase/` triplet (server/browser/service-role):** prevents the most common Supabase footgun — using the wrong client and either leaking the service role to the browser or losing the user's session on the server.
- **`supabase/policies/` split per table:** RLS policies are load-bearing for the hybrid auth model. One-file-per-table makes PR review tractable and the policy intent visible at the entity level.

---

## Data Model

### Core Entities (v1)

```
auth.users (Supabase managed)
   │
   │ 1:N (owner)
   ▼
plans ─────── 1:N ───── plan_members ────── N:1 ──── auth.users
   │                       (role: owner|editor)
   │
   ├── 1:N ── invite_tokens (slug, role, expires_at, revoked_at)
   ├── 1:N ── itinerary_items (starts_at, place_id?, title, notes)
   ├── 1:N ── places (lat, lng, label, category)
   ├── 1:N ── notes (kind: text|link|file, body, storage_path?)
   └── 1:N ── polls ─── 1:N ── poll_options ─── 1:N ── votes
                                                       └── voter_id (user) or voter_token (anon hash)
```

| Entity | Key fields | Notes |
|--------|-----------|-------|
| `plans` | `id`, `slug` (nanoid), `title`, `starts_at`, `ends_at`, `owner_id`, `created_at` | `slug` is the public URL identifier; `id` is the FK target. |
| `plan_members` | `plan_id`, `user_id`, `role`, `joined_via_token_id?` | Created when authenticated user accepts invite or owner adds them. Anonymous link-viewers DO NOT get a row here. |
| `invite_tokens` | `id`, `plan_id`, `token` (nanoid 12+), `role`, `expires_at`, `revoked_at`, `created_by` | Multiple tokens per plan allow per-channel revocation ("revoke the WhatsApp link without killing the email one"). |
| `itinerary_items` | `id`, `plan_id`, `starts_at`, `ends_at?`, `title`, `description`, `place_id?`, `sort_order` | Ordered by `starts_at` then `sort_order`. |
| `places` | `id`, `plan_id`, `lat`, `lng`, `label`, `category`, `notes`, `external_url?` | Free-form pins; could later reference Google Place IDs for richness. |
| `notes` | `id`, `plan_id`, `kind` (`text` \| `link` \| `file`), `title`, `body`, `url?`, `storage_path?`, `created_by` | `storage_path` references private Supabase Storage bucket. |
| `polls` | `id`, `plan_id`, `question`, `closes_at?`, `closed_at?`, `created_by` | "Closed" state matters — UI must surface a winner. |
| `poll_options` | `id`, `poll_id`, `label`, `metadata` (jsonb, e.g., place_id) | |
| `votes` | `id`, `poll_id`, `option_id`, `voter_id?`, `voter_token?`, `created_at` | Either `voter_id` (authed) or `voter_token` (hashed invite token) — see below. |

### How Anonymous Link-Viewers Fit

**They do not get a `plan_members` row.** They get a Supabase anonymous JWT (via `supabase.auth.signInAnonymously`) whose token includes a custom claim `plan_id` set at sign-in time by the `/api/invite/[token]` route after validating the nanoid against `invite_tokens`. RLS policies grant SELECT (and nothing else by default) when:

```sql
(auth.jwt() ->> 'plan_id')::uuid = plans.id
```

This means:
- No phantom-user rows in the members table.
- Revoking the invite token (setting `revoked_at`) invalidates all future sign-ins via that link, but does NOT kick existing anonymous sessions immediately. Acceptable for v1; if it becomes a problem, add a `plan_revocations` table the policy checks against.
- An anonymous user who later authenticates with Google/Apple goes through Supabase's `linkIdentity` flow, and on success a `plan_members` row is created (using the `joined_via_token_id` to preserve provenance).

### v2 Expansion Paths (designed for, not built)

- **Expenses:** new `expenses` and `expense_shares` tables hanging off `plan_id`. No schema migration of v1 entities required.
- **Photo album:** another `kind` on `notes` (`kind = 'photo'`) plus a sibling `albums` grouping table. Storage already in place.
- **Persistent groups:** new `groups` entity; `plans` gains nullable `group_id`. `plan_members` denormalizes from `group_members` for the group case but the column shape doesn't change. This is the only v2 path that touches v1 schema, and even then non-breaking.

---

## Permission Model

### The Hybrid Auth Flow

```
1. Owner creates plan          → owner_id = auth.uid()
2. Owner mints invite token    → INSERT invite_tokens (role='viewer'|'editor')
3. Owner shares URL            → https://app/plan/abc123?t=tkn_xyz
                                  (or the cleaner /i/tkn_xyz that 302s to /plan/abc123)
4. Friend clicks               → GET /api/invite/[token]
                                  → Validate token (not expired, not revoked)
                                  → If no session: supabase.auth.signInAnonymously()
                                                   with custom claim plan_id=abc123
                                  → Set cookie, 302 redirect to /plan/abc123
5. Friend views plan           → RSC reads plan via server Supabase client
                                  → RLS check: auth.jwt() ->> 'plan_id' matches → ALLOW SELECT
                                  → Edit buttons hidden in UI (role = 'viewer')
6. Friend wants to vote        → Click "Sign in to vote"
                                  → OAuth flow (Google/Apple)
                                  → On callback: linkIdentity (preserves session continuity)
                                  → INSERT plan_members (role from invite_token, joined_via_token_id)
                                  → Now auth.uid() is real; RLS for write paths passes
```

### Why This Pattern

- **RLS as the security spine.** Every query — RSC, Server Action, client realtime subscription — hits Postgres through Supabase and is filtered by the same policies. There is no "back door" route that bypasses authorization.
- **Server-side checks for invariants RLS can't express.** Token validation (`expires_at`, `revoked_at`) runs in `/api/invite/[token]` because RLS would need to re-execute the lookup on every query. The token check happens once at session-mint time; the resulting JWT carries the proof of access.
- **Edit vs view enforced two ways.** Anonymous JWT's `plan_id` claim grants SELECT only (policy split per action). Edit/insert/update policies require `auth.uid() IN (SELECT user_id FROM plan_members WHERE plan_id = ...)`. This is defense-in-depth: a malicious anon JWT cannot become an editor even if forged, because forgery would still fail the membership check.
- **No URL-leak panic.** If an invite link leaks, the owner revokes that token. Existing anon sessions degrade gracefully (read still works until cookie expires, then re-mint fails). The user's own data is never exposed to the anonymous viewer because Postgres only returns rows the policy allows.

### Mitigation for the "anonymous votes" question

In v1, **voting requires authentication.** This sidesteps double-vote prevention complexity. Anonymous = read-only. This is also a deliberate adoption funnel: voting is the moment of highest engagement → highest motivation to sign in.

---

## Realtime Strategy

**Default: refetch on focus/mutation. Realtime only where the value is obvious.**

| Surface | Realtime? | Why |
|---------|-----------|-----|
| Vote tally on open poll | YES | Highly visible "live" feeling; the moment friends are watching together. Use `postgres_changes` on `votes` filtered by `poll_id`. |
| Itinerary edits | YES (lightweight) | If two organizers edit simultaneously, last-write-wins is fine but seeing the other person's change appear feels magical. `postgres_changes` on `itinerary_items` filtered by `plan_id`. |
| Place additions | YES | Same as itinerary — small payloads, high collaborative value. |
| Notes/links/files | NO | Refetch on focus is fine. Updates are infrequent and not collaborative-edit shaped. |
| Plan settings | NO | Owner-only; conflict windows are negligible. |
| Member presence ("who's looking now?") | DEFER | Lovely in v2; not table-stakes. Use Realtime Presence when needed. |

**Channel discipline:** one channel per `plan_id`, joined on plan mount, left on unmount. Multiplex events by table on the client. Avoid one-channel-per-table — Supabase has connection limits and channels are not free.

**Recovery pattern:** on reconnect, invalidate TanStack Query caches for the plan, refetch. Realtime is a "nice path", refetch is the "correct path". Never trust realtime as the only source.

---

## PWA Architecture

### What Offline Means Here

This is a coordination app, not a notes app. **Offline scope for v1 is intentionally narrow:**

| Capability | Offline behavior |
|------------|------------------|
| Open last-viewed plan | YES (read from IndexedDB cache, banner: "Showing offline copy") |
| Browse itinerary / map / notes of cached plan | YES (read-only) |
| Vote, add item, upload | NO — queue is overkill for v1; show "You're offline" toast and disable. |
| Install to home screen | YES (manifest + install prompt) |
| Cold-load offline | YES (app shell + `/~offline` fallback) |

The "during the trip" use case (looking up the booking code while in the airport with sketchy wifi) is the killer offline scenario. Read-only is enough.

### Service Worker Approach

Use `@ducanh2912/next-pwa` — confirmed App Router compatible, actively maintained, the only mature option as of 2026. Configuration sketch:

- `cacheOnFrontEndNav: true` — instant offline navigation between cached plans
- `aggressiveFrontEndNavCaching: true` — pre-cache routes the user is likely to visit
- `runtimeCaching` with `NetworkFirst` for `/api/*` and Supabase REST, `StaleWhileRevalidate` for plan pages
- `fallback: { document: '/~offline' }` — App Router uses `/~offline` (note the tilde, not underscore)

### Install Prompt UX

- **Do not show on first visit.** Wait until: user has visited 2+ plans OR voted once OR added one item. Engagement signals trump aggression.
- **Defer the `beforeinstallprompt` event** and surface it from a low-friction banner ("Add to home screen for quick access during the trip — install"). Dismiss-able, don't re-show for 30 days.
- **iOS Safari has no install prompt.** Detect Safari + iOS, show a "tap Share → Add to Home Screen" instructional sheet instead.

### Critical Caveat

Service worker scope must include `/` but exclude Supabase auth callback URLs and OAuth redirects. Bad SW config will intercept the OAuth redirect and break sign-in — common footgun, well-documented in the next-pwa issues. Cover this in an integration test.

---

## Map Architecture

### Recommendation: MapLibre GL JS + MapTiler tiles

- **MapLibre:** free, no API key required, BSD-3 license. Active fork of pre-license-change Mapbox GL JS.
- **Tiles:** MapTiler free tier = 100k map loads/month. Plenty for a side project; alternative is Protomaps (self-hostable static tiles) if you ever exceed it. Mapbox's "free tier" gets expensive as MAUs grow and creates vendor lock-in for no advantage in this product.
- **Geocoding** (place search): MapTiler also includes geocoding in the free tier; alternative is Nominatim (OSM-hosted, free, rate-limited).

### State Boundaries

```
Server (RSC)              Client (Map component)
─────────────             ─────────────────────
places (SELECT * ─────►   places[] passed as initial data
WHERE plan_id=...)        │
                          ▼
                     MapLibre instance (lazy, ssr:false)
                          │
                          ├─ markers/popups (DOM layer)
                          ├─ user pin draft (local component state)
                          └─ "save pin" → Server Action → INSERT places
                                                            │
                                                            ▼
                                                     Realtime channel
                                                     pushes to all clients
```

- **Map state lives client-side.** Camera position, selected pin, draft pin, all local React state. Don't try to put map state in URL or server state — it thrashes.
- **Pins are server state.** Always sourced from `places` table via TanStack Query, hydrated from RSC initial data. Realtime updates trigger query invalidation, which re-renders the pin layer.
- **Lazy-load the map module.** `next/dynamic({ ssr: false })` is mandatory — MapLibre touches `window` on import. This also saves ~200KB on the initial bundle for users who never open the map tab.

### Cost Sanity Check

At 1,000 active plans/month, ~10 members each, ~5 plan-views/member, ~3 of those open the map = ~150,000 map loads/month. Above MapTiler free tier; add the $25/mo "Hobby" tier. Below 1,000 active plans, free.

---

## File Upload Pipeline

### Pattern: Signed Upload URL, Direct-to-Storage

```
Client                      Server (Action)              Supabase Storage
──────                      ──────────────              ─────────────────
[user picks file]
       │
       │ 1. requestUpload(planId, filename, mime)
       ├───────────────────►│
                            │ 2. permission check
                            │    (is user a plan_member with editor role?)
                            │ 3. generate path: plans/{planId}/notes/{nanoid}.{ext}
                            │ 4. createSignedUploadUrl(path, expiresIn: 300s)
                            │◄───────────────────────────────│
                            │ 5. return { signedUrl, path }
       │◄───────────────────│
       │
       │ 6. uploadToSignedUrl (direct, multipart) ──────────►│
       │◄───────────────────────────────────────────────────│ 200 OK
       │
       │ 7. confirmUpload(path, noteMeta)
       ├───────────────────►│
                            │ 8. INSERT notes (storage_path = path, ...)
                            │    (RLS check happens here)
       │◄───────────────────│
```

### Why This Pattern

- **Server route is small and stateless.** Just permission check + URL mint. No proxying of bytes through your serverless function (which would be slow, expensive, and bound by Vercel's request body limits).
- **Direct upload uses Supabase's CDN.** Better throughput than routing through Next.js.
- **Two-phase commit (mint → upload → confirm).** Lets you enforce metadata at the `confirmUpload` step. Orphaned uploads (mint without confirm) are cleaned up by a Postgres cron that deletes Storage objects without a matching `notes.storage_path`. Run weekly.
- **Image optimization:** Supabase Storage offers on-the-fly image transforms (`?width=400&quality=80`). Use it for thumbnails. For OG image rendering of plans, use Vercel/Next's built-in `next/og` route handler — separate concern.

### Anonymous Upload? No.

In v1, only authenticated `plan_members` can upload. Anonymous viewers cannot. This avoids: spam, copyright nightmares, storage cost surprises, and "who owns this file?" ambiguity. Revisit in v2 if validated as needed.

---

## Routing Structure

| URL | Auth | Purpose |
|-----|------|---------|
| `/` | none | Marketing landing |
| `/es`, `/en`, `/pt` | none | Locale roots (locale prefix optional; default es) |
| `/i/[token]` | none → anon | Invite landing; validates token, mints session, 302s to plan |
| `/plan/[slug]` | anon (link) OR authed | Plan overview — server-rendered |
| `/plan/[slug]/itinerary` | same | Itinerary view |
| `/plan/[slug]/map` | same | Map view |
| `/plan/[slug]/votes` | same | Polls (vote requires auth) |
| `/plan/[slug]/notes` | same | Notes/links/files |
| `/plan/[slug]/settings` | owner only | Edit plan, manage members, revoke tokens |
| `/me` | authed | "My plans" dashboard |
| `/auth/sign-in` | none | OAuth entry |
| `/auth/callback` | — | OAuth return |
| `/~offline` | — | PWA offline fallback |

### Invite URL Choices

- **Short form: `/i/[token]`** — what gets shared. 12-char nanoid token. Token is opaque; plan slug is not revealed until after token validation. This is the safer default because revoking the token kills the link; the plan slug stays stable.
- **Long form: `/plan/[slug]?t=[token]`** — works if someone shares the post-redirect URL. Middleware should also accept `?t=` and do the same handoff.
- **Slugs are nanoids, not user-chosen.** Avoids squatting, slug collisions, profanity moderation. 8-char nanoid (~3.5T combinations) is fine for plans; not enumerable in practice.

### Token Generation & Revocation

- **nanoid with no-lookalike alphabet** for tokens (URL-safe, no `0/O/1/l` confusion since users will sometimes type these from screenshots).
- **12 characters minimum** for tokens; this gives ~71 bits of entropy. Brute-force is computationally implausible AND rate-limited at the `/api/invite/[token]` route (10/min/IP).
- **One row per token, multiple per plan.** Owner can mint a new token, share via different channel, revoke individually. UI shows: "WhatsApp link (created May 3, used 7 times) [revoke]".
- **Revocation = soft delete.** Set `revoked_at`. Don't physically delete (need for audit/analytics).
- **Expiry is optional.** Default = never expires. Owners can set explicitly. Defaulting to expiry is hostile UX for "the trip I'm on right now".

---

## State Boundaries (Server vs Client)

| State Type | Lives Where | Pattern |
|------------|-------------|---------|
| Plan list, itinerary items, places, notes, polls | Server (Postgres) | RSC fetches, passes as initial data to client islands, TanStack Query caches and refetches. |
| Vote tallies | Server + Realtime | RSC initial render; Realtime subscription updates the cache; TanStack Query invalidation on mutation. |
| Current user identity | Server (cookie/JWT) | Read in RSC; passed via React context to client islands. |
| Form drafts (typing in "add item" modal) | Client | Local React state. Persist drafts to localStorage if form is long. |
| Map camera position | Client | Local component state. Could persist last-position per plan in localStorage. |
| UI state (sheet open, tab selected, theme) | Client | React state / `useState`. Consider `nuqs` for URL-synced UI state where shareability matters. |
| Offline cache | Client (IndexedDB) | TanStack Query persister + service worker for asset cache. |

### React Query Pattern

```typescript
// Server (RSC)
const queryClient = getQueryClient();  // request-scoped, NOT shared
await queryClient.prefetchQuery({
  queryKey: ['plan', planId, 'itinerary'],
  queryFn: () => supabase.from('itinerary_items').select('*').eq('plan_id', planId),
});

return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <ItineraryClient planId={planId} />
  </HydrationBoundary>
);

// Client
const { data } = useQuery({
  queryKey: ['plan', planId, 'itinerary'],
  queryFn: fetchItinerary,
});
// Server-prefetched data hydrates immediately, no loading spinner.
```

**Key discipline:** request-scoped QueryClient on the server (never module-singleton — would leak data across users). Module-singleton on the browser. The `getQueryClient` helper enforces this.

---

## Multi-Locale Architecture

### Approach: `next-intl` with `[locale]` segment

- **Default locale:** Spanish (`es`), no URL prefix for default (`/plan/abc` is Spanish).
- **Other locales:** prefixed (`/en/plan/abc`).
- **Detection:** middleware reads `Accept-Language` for the very first visit; subsequent visits use cookie preference. Manual switcher in header.
- **Message catalogs:** one JSON file per locale in `src/lib/i18n/messages/`, organized by feature namespace.
- **Date/time/number formatting:** `next-intl` wraps `Intl.*` — important for trip dates ("23 de mayo, 14:30" vs "May 23, 2:30 PM").

### v1 Discipline

- **Ship with Spanish only.** Create `en.json` and `pt.json` files seeded with the same keys but English/Portuguese values stubbed as TODO or copy-of-Spanish. Translation can happen later without code changes.
- **No hardcoded user-facing strings anywhere.** Lint rule: ESLint plugin `eslint-plugin-i18next` or `react-intl/no-literal-string`. Catches regressions during development.
- **Database is locale-neutral.** Plan titles, item descriptions, notes — all user-generated content. Don't try to translate user content. Only chrome/UI is internationalized.
- **OAuth providers respect locale.** Pass `locale=es` to Supabase auth options.

---

## Data Flow

### Request Flow: Anonymous Link-View (Cold)

```
User clicks WhatsApp link  /i/abc123
       │
       ▼
Next.js middleware → /api/invite/[token] route
       │
       ├─ Look up invite_tokens WHERE token = 'abc123'
       ├─ Check not expired, not revoked
       ├─ supabase.auth.signInAnonymously({ data: { plan_id, role: 'viewer' } })
       ├─ Set session cookie
       └─ 302 → /plan/{slug}
       │
       ▼
RSC page /plan/[slug]/page.tsx
       │
       ├─ supabase.from('plans').select(*, itinerary_items(*), places(*))
       │   ↓ Postgres RLS evaluates auth.jwt() ->> 'plan_id' = plans.id → ALLOW
       │
       ├─ Render server HTML, ship to browser
       └─ Hydrate client islands (no edit affordances visible — role = viewer)
       │
       ▼
Service worker caches plan JSON for next offline visit
```

### Request Flow: Mutation (Authenticated Edit)

```
User clicks "Add item"
       │
       ▼
Client form (Zod-validated)
       │
       ▼
Server Action addItineraryItem(planId, payload)
       │
       ├─ Re-validate with Zod
       ├─ supabase.from('itinerary_items').insert({...})
       │   ↓ RLS: auth.uid() IN (SELECT user_id FROM plan_members WHERE plan_id = ?)
       │       AND role IN ('owner','editor') → ALLOW
       │
       ├─ revalidatePath(`/plan/${slug}`) for any cached RSC
       └─ return new item
       │
       ▼
Client TanStack Query: setQueryData + invalidate
Other clients (via Realtime): receive postgres_changes event → invalidate
```

---

## Suggested Build Order

### The Spine: Plans + Invite Tokens + RLS

This is everything. Get this right and the rest is leaves on a tree. Get this wrong and you re-do everything.

**Phase A (the spine):**
1. Supabase project + schema: `plans`, `plan_members`, `invite_tokens` only.
2. RLS policies for these three tables, with tests.
3. Auth: Google OAuth, Apple OAuth, anonymous sessions, link identity flow.
4. Routes: `/api/invite/[token]` → session mint → redirect. `/plan/[slug]` RSC that just reads and renders plan title.
5. Server Actions: `createPlan`, `mintInviteToken`, `revokeInviteToken`.
6. Bare-bones UI: create plan, share link, friend opens link, sees title.

**Done when:** A friend can open your shared link, see the plan name, and you can revoke their access. The auth+permission spine is proven before you build anything pretty.

### Then Parallelizable Branches

Once the spine works, these can run in parallel (different sessions or different days):

**Branch 1: Itinerary** (the most-used feature)
- `itinerary_items` table + RLS
- List view (RSC + client island)
- Add/edit/delete modal
- Realtime subscription
- Time-zone-aware date display (next-intl)

**Branch 2: Map** (highest tech risk)
- `places` table + RLS
- MapLibre integration, lazy-loaded
- Pin add/edit/delete
- Realtime sync

**Branch 3: Votes** (highest engagement payoff)
- `polls`, `poll_options`, `votes` tables + RLS
- Create poll, vote, view tally
- Realtime tally updates
- Close poll flow

**Branch 4: Notes/Files** (highest infrastructure dependency)
- `notes` table + RLS
- Supabase Storage bucket, signed-URL pipeline
- Text/link/file note types
- Thumbnail rendering for images

### Then Cross-Cutting

**Phase C (cross-cutting, do after content branches):**
- PWA: manifest, service worker, offline fallback, install prompt
- i18n scaffolding: locale routing, message extraction (Spanish only, en/pt stubbed)
- Landing pages
- Polish: empty states, error boundaries, loading skeletons
- OG image generation for shared links (huge for WhatsApp UX)

### What NOT to parallelize

- **Don't build content branches before the spine.** Without RLS in place you'll write queries assuming "any logged-in user can do anything" and re-do them later.
- **Don't add Realtime in v1 before the non-realtime version works.** Build sync via refetch first, layer realtime on top. Easier to debug; gives a working fallback when WebSocket reconnect fails.
- **Don't build offline before online is stable.** Service worker caching of broken UI is worse than no offline.

### Component Dependency Graph

```
                  ┌──────────────────┐
                  │ Supabase project │
                  │ + RLS + Auth     │  ◄── spine, blocks everything
                  └────────┬─────────┘
                           │
                  ┌────────┴─────────┐
                  │  Plans + Invites │  ◄── spine
                  └────────┬─────────┘
        ┌──────────┬───────┼───────┬──────────┐
        ▼          ▼       ▼       ▼          ▼
   Itinerary    Map      Votes   Notes    Plan Settings
        └──────────┴───────┬───────┴──────────┘
                           │
                  ┌────────┴─────────┐
                  │ Realtime layer   │  ◄── added per-branch after basic CRUD works
                  └────────┬─────────┘
                           │
                  ┌────────┴─────────┐
                  │  PWA + i18n      │  ◄── cross-cutting, end of v1
                  │  + Landing       │
                  └──────────────────┘
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–100 plans/month | Monolith Next.js on Vercel free tier + Supabase free tier. No changes needed. |
| 100–10k plans/month | Supabase Pro ($25/mo) for connection pooling and storage. MapTiler Hobby tier. Add Sentry for error tracking. Same architecture. |
| 10k+ plans/month | Realtime connection count may push into Supabase Team tier. Consider Vercel Pro for image optimization quota. Add CDN caching headers for public plan pages (RSC output is cacheable when no per-user data). Same architecture. |

### First Bottlenecks (in order)

1. **Supabase Realtime concurrent connections.** Free tier = 200 concurrent. At 100 active plans with 10 viewers each, you're at the limit. Mitigation: only subscribe when plan is "active" (open in foreground tab), unsubscribe on visibility hidden.
2. **MapTiler tile loads.** Free tier = 100k/month. Mitigation: aggressive tile caching in service worker; consider Protomaps self-hosted ($0) at scale.
3. **Storage egress.** Photos add up. Mitigation: thumbnail-by-default, full-size on click; image transforms aggressively.
4. **Vercel function invocations.** Server Actions count. Mitigation: this is the LAST one to optimize; usually fine.

Notably absent from the bottleneck list: **Postgres reads.** Even at 10k plans this is trivial. Don't waste time pre-optimizing schema or adding caching layers before measurement.

---

## Anti-Patterns

### Anti-Pattern 1: Bypassing RLS with the service role for "convenience"

**What people do:** Hit a permission error, switch to the service-role Supabase client to make it work.
**Why it's wrong:** Service role bypasses ALL security. One leaked usage in a client-reachable path = total data exposure.
**Do this instead:** Treat any RLS error as a bug. Fix the policy or pass the right `auth` context. Service role is for migrations and cron jobs only, never per-request.

### Anti-Pattern 2: Storing invite token in the database in plaintext, transmitting in URL

**What people do:** Generate token, store as-is, share in URL — fine for v1 BUT then add token-based actions (vote-as-anonymous) using the same token.
**Why it's wrong:** Token in URL = token in browser history, in server logs, in WhatsApp link previews. Read-only access is acceptable risk; mutation is not.
**Do this instead:** Tokens authenticate the SESSION mint, then we use the resulting Supabase JWT (cookie-bound, not URL-bound) for everything else. Don't extend the token's privileges over time.

### Anti-Pattern 3: Putting plan data in a global client store (Zustand/Redux)

**What people do:** Mirror plans in a client-side store so "the UI is always responsive".
**Why it's wrong:** Now you have two sources of truth. Stale data, cache invalidation bugs, hard to reason about.
**Do this instead:** TanStack Query is the cache. Server is the source of truth. RSC + hydration pattern. No global client store needed.

### Anti-Pattern 4: Realtime everywhere

**What people do:** "We have Realtime, let's subscribe to every table from every component."
**Why it's wrong:** Connection limits, battery drain on mobile, debugging nightmare when stale data appears.
**Do this instead:** Refetch on focus is the default. Realtime opt-in per surface where the live-update value is obvious (votes, itinerary).

### Anti-Pattern 5: Optimizing for offline-writes before validating online

**What people do:** Build sync engine, CRDT, conflict resolution, etc. for a side project.
**Why it's wrong:** Months of work for a use case the user research hasn't validated.
**Do this instead:** Read-only offline for v1. If users actually request offline-write (they probably won't — the use case is "look up the booking code at the airport"), revisit then.

### Anti-Pattern 6: Translating user-generated content automatically

**What people do:** Run plan titles through Google Translate so "English users can read Spanish plans".
**Why it's wrong:** Garbled translation, weird UX, semantic shifts (place names, slang). Users own their content.
**Do this instead:** Localize chrome only. User content is the user's responsibility.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Postgres | Server + browser clients with cookie-based session | Use SSR helpers; never share clients across requests on server. |
| Supabase Auth (Google, Apple) | OAuth via Supabase callbacks | Apple requires paid developer account ($99/yr); plan for it. |
| Supabase Realtime | WebSocket via channels filtered by `plan_id` | Subscribe on plan mount, unsubscribe on unmount and on tab hidden. |
| Supabase Storage | Signed upload URLs, signed download URLs | Set buckets private; never use public buckets for user content. |
| MapTiler (tiles) | Style URL + API key (env var) | Restrict key to your domain in MapTiler dashboard. |
| MapTiler (geocoding) | REST | Cache results for ~24h; geocoding is the highest-cost MapTiler endpoint. |
| Vercel (hosting) | Git push deploy; env vars for Supabase keys | Use preview deployments per PR with separate Supabase project for staging. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| RSC ↔ Client island | Props (serializable) + HydrationBoundary | Don't pass non-serializable values; date strings, not Date objects. |
| Client ↔ Server Action | Function call (RPC-shaped) | Always Zod-validate at action boundary; client validation is UX, not security. |
| Server Action ↔ Supabase | Supabase JS server client | One client per request; use `cookies()` for session. |
| Client ↔ Realtime | Single channel per plan, multiplexed | One subscribe call per plan, fan-out to consumers via TanStack Query invalidations. |
| App ↔ Service Worker | Workbox messages + cache APIs | Version your cache keys; on deploy, old SW caches must be invalidated. |
| Marketing ↔ App | Route group split, shared design tokens | Marketing must not import auth context; it's allowed to be statically generated. |

---

## Sources

- [Supabase: Row Level Security guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Token Security and RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security)
- [Supabase: JWTs and custom claims](https://supabase.com/docs/guides/auth/jwts)
- [Supabase: Realtime concepts](https://supabase.com/docs/guides/realtime/concepts)
- [Supabase: createSignedUploadUrl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
- [Supabase: uploadToSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl)
- [Supabase Storage Deep Dive — Bucket Design, Signed URLs, Image Transforms, RLS](https://dev.to/kanta13jp1/supabase-storage-deep-dive-bucket-design-signed-urls-image-transforms-and-rls-3b9k)
- [Next.js: Internationalization guide](https://nextjs.org/docs/app/guides/internationalization)
- [next-intl: App Router setup](https://next-intl.dev/docs/getting-started/app-router)
- [TanStack Query: Server Rendering & Hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
- [TanStack Query: Advanced Server Rendering](https://tanstack.com/query/v5/docs/framework/react/guides/advanced-ssr)
- [Building Native-Like Offline Experience in Next.js PWAs](https://www.getfishtank.com/insights/building-native-like-offline-experience-in-nextjs-pwas)
- [@ducanh2912/next-pwa: offline fallbacks](https://ducanh-next-pwa.vercel.app/docs/next-pwa/offline-fallbacks)
- [MapLibre vs Mapbox vs Leaflet 2026 comparison](https://www.pkgpulse.com/guides/mapbox-vs-leaflet-vs-maplibre-interactive-maps-2026)
- [Mapbox vs MapTiler vs MapLibre vs Leaflet](https://www.gispeople.com.au/mapbox-vs-maptiler-vs-maplibre-vs-leaflet-which-to-choose/)
- [Nano ID: Popular, Secure, URL-Friendly Unique Identifiers](https://medium.com/@gaspm/nano-id-popular-secure-and-url-friendly-unique-identifiers-1fa86c9fdf7c)
- [Magic Link Security: Best Practices & Advanced Techniques](https://guptadeepak.com/mastering-magic-link-security-a-deep-dive-for-developers/)

---
*Architecture research for: group-coordination PWA*
*Researched: 2026-05-20*
