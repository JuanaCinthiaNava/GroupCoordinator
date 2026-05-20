# Pitfalls Research

**Domain:** Group-coordination / trip-planning web app (PWA) for friend groups of 3–15, ephemeral-event use, hybrid auth (view-by-link, edit-with-OAuth), solo-dev side project with public-marketing ambition.
**Researched:** 2026-05-20
**Confidence:** HIGH on technical/cost facts (verified against official docs and 2026 industry sources), MEDIUM-HIGH on product/adoption claims (consistent across multiple market analyses and aligned with well-documented social-graph product failure patterns).

> **Reading order:** The Critical Pitfalls section is the spine. The "weakest-link adoption problem" (CP-1) and the "WhatsApp gravity well" (CP-2) are the two failure modes that kill this category. Everything else is downstream. If the roadmap only addresses two pitfalls in v1, those are the two.

---

## Critical Pitfalls

These are existential. Hit one and the product is dead — not slow, dead. They are ranked by frequency-of-kill in this category.

---

### CP-1: The Weakest-Link Adoption Problem (a.k.a. "one person didn't install, the group went back to WhatsApp")

**What goes wrong:**
The organizer sets up the plan, shares the link, 8 of 10 group members open it. The 9th person is on an old Android, doesn't see the preview, types "what's this?" in WhatsApp. The 10th is the friend's mom on iOS who can't figure out Safari "Add to Home Screen." Within 48 hours the conversation has fully migrated back to WhatsApp because the group operates at the speed of its slowest adopter. The app becomes a write-only museum — the organizer keeps updating it, nobody reads it, decisions happen in chat.

**Why it happens:**
Group coordination products have a viral coefficient ceiling of `K ≈ floor(group_engagement)` — if any single member opts out, the *whole group's* utility collapses, because the value is "everyone has the same info." Most founders model adoption as "what % of invited users sign up" (additive). The correct model is "what % of *groups* have 100% of members reading" (multiplicative). At 90% per-member activation in a 10-person group, only 35% of groups achieve full coverage (0.9¹⁰).

**How to avoid (concrete, in priority order):**

1. **Hybrid auth is non-negotiable.** The current PROJECT.md decision (view-by-link without account, OAuth only for editing) is correct and is the single most important product decision. Defend it ruthlessly against feature creep that adds login walls.
2. **Make the shared link the universal interface.** The URL is the product. It must work in: WhatsApp preview, iMessage rich link, Telegram, Instagram DM, plain SMS, email. Test all of these. OpenGraph + Twitter card metadata is Phase 1 work, not polish.
3. **Designate the "view passenger" as a first-class role.** Don't gate map pins, itinerary, attached PDFs, or addresses behind login. View-only must include everything the organizer would screenshot into the chat.
4. **Read-only "screenshot-friendly" rendering.** A view-only user should be able to take a screenshot of any single screen and paste it in WhatsApp and have it be useful. If a view needs context from other views to make sense, it fails this test.
5. **Don't measure signups. Measure "group coverage."** Define a north-star metric like *"% of plans where ≥80% of unique link-openers returned within 24h."* Signup counts will lie to you.
6. **Accept that some members will never install the PWA.** Optimize the browser-tab experience so it's just as good. Treat PWA install as a delight bonus, not a requirement.

**Warning signs:**
- Plan-creation rate is healthy but median sessions-per-plan is < 3.
- Most plans have one heavy editor and many one-time viewers who never return.
- Plans get created Monday, abandoned Wednesday.
- User interviews surface "yeah we used it to set up, then talked in WhatsApp."

**Phase to address:** **Phase 1 (foundations).** Hybrid auth and link-first sharing are foundational architecture decisions. Retrofitting is expensive.

---

### CP-2: The WhatsApp + Google Maps + Notes Gravity Well

**What goes wrong:**
The competitor isn't TripIt or Heya. The competitor is a workflow that costs zero, has zero install friction, and that 100% of the group already runs. Every "switch to GroupCoordinator" requires the group to *actively choose more friction* (open a new app, learn its UI, remember it exists) in exchange for benefits that are abstract ("information won't get lost") versus concrete (chat is instant). The default state of the group is *not using your app*. You must overcome inertia on every single plan, forever.

**Why it happens:**
- WhatsApp's switching cost is 0; yours is non-zero by definition.
- The pain ("I lost the reservation link in scroll") is felt acutely *once*, then forgotten, then re-felt next trip — too rare for habit formation.
- Users do not remember "there was an app for this" three months later when the next trip happens. **Recall failure** is the silent killer.
- Sub-categories (itinerary, polls, file sharing) each have stronger point solutions (Google Docs, Doodle, Drive). You're worse at each individual thing.

**How to avoid:**

1. **Pick one acute, repeating pain and own it.** Per PROJECT.md the chosen wedge candidates are "setup in 30s," "truly unified," or "during-the-trip UX." Force a choice — do not ship all three. The wedge must be one sentence a user will text a friend: *"This is the thing where X."*
2. **Be obviously better at one moment, not marginally better at many.** A common winning moment for this category: *"During the trip, the person who knows where we're going next is whoever has the link, not just the organizer."* That's a wedge.
3. **Embrace WhatsApp, don't compete with it.** Per PROJECT.md "no chat in v1" is correct. Reinforce: "We don't replace your group chat. We're the link you paste in it."
4. **Reduce time-to-shareable-link to under 30 seconds for the organizer.** First-run friction is paid by exactly one person (the organizer), so this is the cheapest dimension to optimize and the biggest unlock.
5. **Build for trip-recall, not just trip-planning.** Every shipped plan is a future hook: a 30-day-later email or post-trip recap surfaces *"want to plan another?"* which is the only natural re-acquisition moment.
6. **Resist the "let's add chat / let's add expenses / let's add bookings" expansion in v1.** Each expansion makes you marginally better at something WhatsApp + Splitwise + Booking already do well. Stay in your lane until the wedge is validated.

**Warning signs:**
- Users say "love it!" but don't use it on their next trip 2 months later.
- Repeat-organizer rate (same person creating ≥2 plans in 90d) below 25%.
- Most plan creations come from marketing-driven first-time users, not word of mouth.
- When asked "would you have used this for [last trip]?" users say "oh yeah, I forgot it existed."

**Phase to address:** **Phase 0 (positioning) and ongoing.** This is a product-strategy pitfall more than an engineering one. Phase 0 must lock in the wedge in PROJECT.md (currently marked "Wedge competitivo aún no definido" — this is the single biggest open question and resolving it should block Phase 1).

---

### CP-3: The "We'll Use It Next Trip" Drawer Trap

**What goes wrong:**
Users love the demo, install the PWA, create one plan for their next trip, then never open it again. Reviews are 5 stars. Retention is brutal. The product is, technically, *too useful per use* and *too rare in use* — closer to TurboTax (once-a-year) than to WhatsApp (daily). Once-a-year products struggle to build brand recall, and brand recall is the only acquisition channel that scales for ephemeral-use products.

**Why it happens:**
Trips happen 1–4 times per year per typical friend group. There is no daily-use surface. The user uninstalls without malice — the home-screen icon survives 30 days of irrelevance and then loses to a game.

**How to avoid:**

1. **Maximize use-density *inside* the event window.** During the trip the app should be opened 5–10x/day (next event, where's the hotel, what time tomorrow). That cluster is what creates memory.
2. **Engineer a recall moment 60–90 days after the trip.** Post-trip recap, "create your next plan from this template," shared photo album invite (PROJECT.md already flagged this as a v2 candidate — promote it to v1.5 importance).
3. **Persistent groups in v2 are a retention play, not just a feature.** PROJECT.md correctly defers them; just don't forget they're the *answer* to this pitfall, not just an organic feature request.
4. **Don't fight the use frequency — exploit it.** Position as "the trip app" not "the daily app." Marketing copy: *"You don't need it every day. You'll be glad it's there when you do."*
5. **Lifecycle email/push: one well-placed touch beats five generic ones.** A single high-quality "trip done, here's the highlight reel" email outperforms a weekly "tips" newsletter.

**Warning signs:**
- D7 retention < 15% but per-session depth is high.
- Reviews say "I love this app" but DAU is flat.
- Most "active users" are organizers in pre-trip planning week — no during-trip surge.

**Phase to address:** **Phase 3+ (retention/lifecycle).** Don't over-engineer this in v1 — first prove someone wants the core. But the *architectural decision* to design plans as long-lived objects (not deletable after the event) should land in Phase 1.

---

### CP-4: The Empty-Canvas First-Run

**What goes wrong:**
Organizer creates a plan, shares the link, group opens it — and sees a blank itinerary with no places, no polls, no notes. They think "this isn't a thing yet" and leave. The organizer is now alone in the app, demotivated, and abandons it too.

**Why it happens:**
The product's value is created collaboratively, but the empty state forces the organizer to do unrewarded solo work first. Compare to WhatsApp: the moment a group is created, *the group chat is the value*. Here, the moment the plan is created, the value is *the promise of future content* — much weaker.

**How to avoid:**

1. **Seed the plan from a template chosen at creation time** (weekend trip, festival, bachelor party, dinner reservation). Templates pre-fill 3–6 itinerary slots, 1 sample poll, 1 sample saved place. Group sees a structured skeleton, not a blank doc.
2. **Make the *invite link* itself an artifact worth visiting** — animated preview of "what's coming," countdown to event date, the organizer's intro note.
3. **Onboarding microcopy assumes the second visitor, not the first**: "While [Carlos] adds the details, here's what you can do…"
4. **First-action friction must be tiny.** The first thing a group member does should be one tap ("vote on this," "RSVP," "drop a pin where you live"). Build the value loop into the empty state itself.
5. **The organizer should see "preview as guest" before sharing.** Lets them notice the emptiness before the group does and fill in stub content.

**Warning signs:**
- High plan-creation, low plan-population (median plan has < 3 items at first share).
- Time-from-create-to-first-share is hours/days, not minutes.
- Group members open link, bounce in < 15s.

**Phase to address:** **Phase 2 (collaboration).** Templates and "preview as guest" are Phase 2 — once core authoring exists, prioritize the cold-start experience before chasing more features.

---

### CP-5: Abandoned-Plan / Bad-Actor Recovery Has No Story

**What goes wrong:**
The organizer creates a plan, then ghosts the group (got sick, lost interest, fight in the group). Nobody else has edit rights. Plan is frozen. Group has no recourse. Alternative version: the organizer goes nuts, deletes everyone's contributions, kicks people out, or makes the plan unreadable. Either way: **group loses trust in the platform forever**, because the failure was visible to all 10 members at once.

**Why it happens:**
Founders model the organizer as benevolent and permanent. Reality: in friend groups, leadership is fluid, fights happen, people drop out.

**How to avoid:**

1. **Default to collaborative editing, not single-organizer.** PROJECT.md's "wiki collaborativo" mode should be the *default*, with single-organizer as a setting, not the reverse.
2. **Co-organizer promotion built in from day 1.** Any editor can be promoted by the creator with one tap. Future plans can self-elect a backup.
3. **Soft-delete with restore window (7 days minimum).** No destructive action without recovery.
4. **Plan ownership is transferable**, including transfer-on-inactivity (a plan inactive for 14 days with an upcoming event can have any other editor request promotion to organizer).
5. **Audit log visible to all editors** ("Carlos removed Hotel Plaza 2h ago"). Visibility prevents quiet sabotage and lets the group self-police.
6. **Block-and-mute is an editor-level action, not just creator-level.** Any editor can hide content from a misbehaving member while the group decides what to do.

**Warning signs:**
- Support tickets like "the organizer disappeared and I can't update the plan."
- Plans with one editor and 8 view-only — high concentration of risk.
- "Deleted by accident, can I get it back" requests in support.

**Phase to address:** **Phase 2 (collaboration / roles).** Build the role model right the first time — retrofitting permissions models is one of the most painful refactors in collaborative software.

---

## High-Severity Pitfalls

Won't kill the product on day one, but will quietly cap its ceiling.

---

### HP-1: Map Provider Cost Explosion

**What goes wrong:**
You ship with Google Maps JS SDK because it's the obvious choice. Launch goes well. A few weeks in, you discover a single plan generates ~10 map loads (organizer + viewers, refreshes, etc.). 500 plans/month × 10 = 5,000 — fine. At 5,000 plans/month × 10 = 50,000 loads, you're well past the $200 monthly free credit and writing checks. A viral moment makes it five figures.

**Verified facts (2026):**
- Google Maps Platform: $200/mo free credit covers ~28,500 Dynamic Map loads. Beyond that, $7 per 1,000 additional loads. (Per [Google's pricing docs](https://developers.google.com/maps/billing-and-pricing/pricing) and [2026 cost analyses](https://radar.com/blog/google-maps-api-cost).)
- Since March 2025, each SKU has its own monthly free cap (10K Essentials, 5K Pro, 1K Enterprise). Maps Embed API and mobile SDK remain free.

**Why it happens:**
- Map loads compound across viewers (every link recipient = one load).
- Auto-pan, zoom, address autocomplete all count separately as billable events.
- Developers forget that production traffic differs from test traffic by 100×.
- A "viral moment" can produce a $10K bill in one week.

**How to avoid:**

1. **Default to Maps Embed API or Maps Static API for the public/view-only path.** Embed is free with no limits. Static images are dirt cheap. Reserve the interactive JS SDK for the editor experience only.
2. **Use MapLibre GL + free tiles (Protomaps self-hosted, or Stadia/MapTiler free tier) for the interactive map.** Mapbox is also viable but has its own pricing trap above 50K monthly active users.
3. **Aggressive caching of geocoding results in your DB.** Geocode once at place-creation, store lat/lng — never geocode on display.
4. **Hard-cap API key by HTTP referer AND set a daily quota in GCP console.** Daily quota at $X budget translates into a guaranteed-not-to-exceed bill.
5. **Billing alerts at 10/50/80% of monthly budget.** Set them on day 1 of integration.
6. **Defer Places Autocomplete / Routes API until paying customers exist.** These are the expensive SKUs.

**Warning signs:**
- Map loads per active plan > 20.
- "Map is slow" complaints — often a sign of throttling kicking in.
- Bill jumps > 2× month-over-month with no corresponding traffic jump.

**Phase to address:** **Phase 1 (foundations).** The choice of map provider is architectural — switching from Google Maps to MapLibre after launch is a multi-week refactor.

---

### HP-2: Vercel Bandwidth Surprise on Viral Moment

**What goes wrong:**
You launch on Show HN or get a TikTok mention. Site goes down (Hobby plan, hit the 100GB cap, deployment pauses) OR you wake up to a $300 bill (Pro plan with overage charges). Either outcome destroys momentum at the exact moment momentum matters.

**Verified facts (2026):**
- Vercel Hobby: 100GB bandwidth, 1M edge requests/mo. **Hard stop, no overage** — site goes offline until next billing cycle. (Per [Vercel pricing](https://vercel.com/pricing) and [2026 breakdowns](https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing).)
- Vercel Pro: 1TB bandwidth included, $40 per additional 100GB. A 3TB viral month = $300 extra.
- [Reports](https://schematichq.com/blog/vercel-pricing) of single-day bandwidth burning through Hobby quota during launches.

**Why it happens:**
- Image-heavy plans (place thumbnails, profile pics, screenshots) chew bandwidth fast.
- PWA service worker pre-caches large assets — multiply by viewers.
- Vercel charges for *all* bandwidth including static asset delivery.
- The "hobby" plan's hard-stop is dangerous specifically because there's no graceful degradation.

**How to avoid:**

1. **Offload all user-uploaded media (photos, screenshots, PDFs) to Cloudflare R2** ($0 egress) or Backblaze B2. Never serve uploaded files from Vercel.
2. **Use `next/image` with a remote loader pointed at Cloudflare Images or a similar CDN** — not Vercel's Image Optimization (billed per source image and per transformation).
3. **Set up a budget cap in Vercel dashboard at 80% of your tolerance**. Vercel Pro lets you set Spend Management limits — use them.
4. **Use Cloudflare in front of Vercel for static assets.** Reduces Vercel egress by 70%+.
5. **Plan for the launch spike**: when you tweet/post launch, pre-warm the cache; if expecting traffic, temporarily upgrade Hobby → Pro the day of, downgrade after if needed.
6. **Consider alternative deploy targets if cost-anxious**: Cloudflare Pages (unlimited bandwidth on free tier), Netlify, Railway, or self-host on Hetzner.

**Warning signs:**
- Bandwidth growing super-linearly vs. plan count.
- High percentage of bandwidth is image delivery.
- Spend Management alert fires before MAU growth justifies it.

**Phase to address:** **Phase 1 (foundations).** Storage architecture decision (R2/B2 vs. Vercel blob) must be made before user uploads ship.

---

### HP-3: Supabase Realtime Quota Blow-Up

**What goes wrong:**
You build collaborative voting and live presence ("who's looking at this now") on Supabase Realtime. Free tier looks generous. Then a few popular plans push you past the 200 concurrent connection cap, connections start dropping mid-session, votes vanish, users see "disconnected" toasts. Worst case: you forgot to set throttling, a hot plan generates 10 messages/sec × 50 viewers = throughput cap, all connections drop.

**Verified facts (2026):**
- Supabase free tier: **200 peak concurrent connections, 2M messages/month, 256KB max message size**. (Per [Supabase Realtime docs](https://supabase.com/docs/guides/realtime/limits).)
- Pro plan: 500 concurrent connections (only 2.5× more).
- Connections will be force-disconnected if your project generates too many messages/sec. (Per [Supabase troubleshooting docs](https://supabase.com/docs/guides/troubleshooting/realtime-concurrent-peak-connections-quota-jdDqcp).)

**Why it happens:**
- Every viewer with a tab open = 1 connection. PWA leaves tabs open across hours.
- Broadcast presence ("X is editing") fan-out goes O(N²) in active users per plan.
- Most devs test with 1–2 simulated users, never load-test.

**How to avoid:**

1. **Don't use Realtime presence/broadcast for things that can be polled.** "Last updated 3s ago" via a 10s poll is almost always good enough. Reserve Realtime for actual collaborative-edit conflict surfacing.
2. **Coalesce broadcasts: batch updates server-side**, send max 1 message/sec per channel per user.
3. **Lazy-subscribe: only open a Realtime channel when the user actively starts editing**, not on plan view.
4. **Disconnect on tab-hidden** (`visibilitychange` event). Reconnect on focus. Reclaims 70%+ of "phantom" connections.
5. **For voting specifically, use optimistic UI + DB writes + occasional poll**, not Realtime. Votes converge fine without sub-second sync.
6. **Set a hard ceiling: if a plan has > 25 active viewers, disable Realtime for that plan** and fall back to refresh-button. Friend groups are 3–15 — realistic ceiling is low.

**Warning signs:**
- Supabase dashboard shows connections at >80% of cap.
- Users report "I voted but it didn't save."
- Messages/sec graph spiky.

**Phase to address:** **Phase 2 (collaboration).** Realtime needs to be designed in from the start of collaboration features, with the throttling discipline baked in.

---

### HP-4: PWA iOS Safari Install UX is Awful and You Can't Fix It

**What goes wrong:**
You build a beautiful "install prompt" component. Then you discover iOS Safari has *no* `beforeinstallprompt` event. Users must tap Share → Add to Home Screen — a 4-tap journey buried in a system menu most users don't know exists. EU users on iOS 17.4+ literally cannot install your PWA at all in some configurations. Your "install conversion" funnel for iOS is in single-digit percent. Half your target market is iOS.

**Verified facts (2026):**
- iOS PWA install requires manual Safari Share menu → Add to Home Screen. **No automatic install prompts**. (Per [MagicBell 2026 guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) and [Mobiloud 2026](https://www.mobiloud.com/blog/progressive-web-apps-ios).)
- iOS 16.4+ required for push notifications, and only after install.
- EU iOS 17.4+ has had PWA restrictions affecting some install flows.
- No standard way to detect "this user already installed" reliably from a fresh visit.

**Why it happens:**
- Apple's commercial incentive is to push users into the App Store.
- The W3C `beforeinstallprompt` API was never implemented in Safari.
- Standard install-prompt libraries assume Chromium behavior.

**How to avoid:**

1. **Don't make PWA install the success criterion.** Treat the browser-tab experience as the primary product. Install is a delight bonus.
2. **iOS install affordance must be visual and contextual**: a short animation showing "tap the Share icon → Add to Home Screen" with the actual iOS icon, shown *once* after the user has had a successful interaction (not on first visit).
3. **Detect platform: don't show Android install prompts on iOS, and vice versa.** Show the right hint to the right OS.
4. **Use `display-mode: standalone` media query to detect already-installed state** and suppress the prompt. Imperfect but better than nothing.
5. **iOS push notifications require the PWA to be installed first** (iOS 16.4+). Plan your notification strategy assuming most iOS users won't have them.
6. **Test the "shared in WhatsApp → opened in WhatsApp's in-app browser" path.** Many users will arrive via WebKit-but-not-Safari, where install is impossible. Detect and gracefully suggest "Open in Safari."

**Warning signs:**
- iOS install rate < 5% of unique iOS visitors.
- "How do I install" support tickets from iOS users.
- iOS users have meaningfully worse retention than Android.

**Phase to address:** **Phase 1 (foundations) and Phase 3 (mobile polish).** Foundational decision: treat browser as first-class. Polish: install affordance in Phase 3 when you have data on where users actually drop off.

---

### HP-5: Notification Overload OR Notification Absence (Both Kill Engagement)

**What goes wrong:**
Two failure modes, mirror images:
- **Overload:** You enable push for every event (new comment, vote, edit, RSVP). User gets 30 pings in a planning week, disables notifications app-wide, then forgets the app exists.
- **Absence:** You don't enable push (or iOS users can't get push). User never gets a poke. Forgets the app exists. Same outcome.

**Verified facts (2026):**
- 60% of users stop using an app entirely if they get > 5 weekly notifications. (Per [Boundev push notification stats 2026](https://www.boundev.com/blog/push-notification-best-practices-mobile-engagement).)
- 10% of over-notified users turn the app off entirely; 6% uninstall. (Per [Appbot 2026 best practices](https://appbot.co/blog/app-push-notifications-2026-best-practices/).)
- 2–5 highly relevant pushes per week is the safe band for most non-news apps.

**Why it happens:**
- Default reaction to "users forget" is "notify more." This backfires linearly past the threshold.
- Granular preferences are an afterthought, not a first-class onboarding choice.
- Event-driven systems make it easy to add push, hard to add intelligence.

**How to avoid:**

1. **Bundle and batch.** Aggregate edits into a single "5 changes since you last looked" notification. Never 5 pings for 5 edits.
2. **Default to digest, not realtime.** Daily summary at user-chosen time. Realtime only for *explicitly opted-in* events (e.g., "the trip starts in 2 hours").
3. **Hard cap: max 1 notification per plan per day** unless event-window (T-24h, T-1h, during).
4. **Granular controls from day 1**: per-plan mute, mute-all-except-mentions, mute-all-except-organizer.
5. **Smart context: notify the right person.** "Carlos voted" matters to the organizer, not to all 9 members. Use mention-style targeting.
6. **For iOS: have an email fallback for users without push.** Email digest 24h before event is *more* effective than push for trip-planning.
7. **Measure unsubscribe rate as a first-class metric.** > 5% per-message unsub is a fire alarm.

**Warning signs:**
- Notification opt-out rate > 20%.
- Push click-through rate < 5%.
- "Stop sending me emails" feedback.

**Phase to address:** **Phase 3 (engagement/lifecycle).** Don't ship push in Phase 1 — easier to add later than to undo damage from over-notifying.

---

### HP-6: Anonymous-Link Token Security Mistakes

**What goes wrong:**
You generate share tokens like `/plan/abc123` (short, guessable) or you use a long token but expose it in URL query params that leak via Referer headers, server logs, browser history, and analytics tools. An attacker scrapes Twitter and Reddit for `/plan/` URLs, finds active plans, sees hotel addresses, names, dates, phone numbers, photos. Or: a token leaks to an analytics provider, gets indexed by Google, plan info becomes searchable.

**Verified facts (2026):**
- URLs with tokens in path or query parameters leak to: Referer headers (every external link on the page), browser history (synced across devices), analytics tools, server access logs, screen-share recordings. (Per [MDN Referer guide](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Referer_header:_privacy_and_security_concerns) and [web.dev best practices](https://web.dev/articles/referrer-best-practices).)
- Short or sequential tokens are scrapeable. Standard guidance: minimum 128 bits of entropy.

**Why it happens:**
- The product's whole value prop ("view by link without signup") makes the link itself the credential.
- Devs default to readable slugs for UX, sacrificing entropy.
- Default browser referrer policy still leaks in some configurations.

**How to avoid:**

1. **Use 128+ bit random tokens** (e.g., 22-char base62, or UUIDv4 cleaned). Never sequential, never short. Use `crypto.randomBytes`, not `Math.random`.
2. **Set `Referrer-Policy: strict-origin-when-cross-origin` (or stricter, `no-referrer`) on all pages that include the token in URL.** Prevents leakage to external links on the page.
3. **Avoid putting tokens in query strings if possible — prefer URL path.** Then strip the path from logs (Cloudflare/Vercel allow log scrubbing).
4. **Don't include the token in OpenGraph share previews or analytics events.** Send a hashed plan ID to analytics, never the raw token.
5. **Two-tier tokens:** a public "view token" (in URL) gives read-only access. A private "edit token" (never in URL, only via OAuth session) gives write access.
6. **Token rotation on demand**: organizer can revoke and regenerate the share link if it leaks. Old link 404s.
7. **Rate-limit token enumeration aggressively** — IP-level throttle on `/plan/:token` 404s to detect scraping.
8. **Add `noindex` meta and `robots.txt` Disallow on /plan/* paths.** Prevent Google indexing.
9. **Honeypot tokens** that page you when scraped — early detection of attacks.

**Warning signs:**
- Server logs show high 404 rate on `/plan/*` (enumeration).
- Plan URLs appearing in Google search results.
- Referer headers from external sites in your logs containing your tokens.

**Phase to address:** **Phase 1 (foundations).** Token generation and referrer policy are foundational — retrofitting requires invalidating all live links, which is user-visible damage.

---

### HP-7: Doxxing / Over-Sharing in Plan Content

**What goes wrong:**
Plan includes home addresses (pickup points), hotel room numbers, flight numbers, phone numbers, photos of group members. Someone shares the link "with their boyfriend" who shares it with someone else. The link, with no auth, propagates beyond the intended audience. A few days later, someone in the group is being harassed, stalked, or had a hotel break-in.

**Why it happens:**
- "Share via link" UX implicitly says: trust the recipient. But links forward trivially.
- Sensitive info ends up in plans because users don't think of plans as public-internet-adjacent.
- The product encourages "put everything here" which raises the blast radius of any leak.

**How to avoid:**

1. **Sensitive-field redaction in view-only mode.** Define field categories: "Address," "Phone," "Room/Confirmation #." View-only sees these masked ("Address: visible to editors") unless explicitly unredacted by the organizer.
2. **Link expiration with sane defaults.** Public view link auto-expires 7 days after the event date. Force regeneration for trips re-opened later.
3. **Optional passcode on link** (4-digit, shareable separately via WhatsApp). Trivial friction, huge security win.
4. **Educate the organizer at create-time**: "This link can be forwarded. Don't include things you wouldn't show a stranger." Inline, not in a TOS no one reads.
5. **Member opt-out for personal info display.** "Hide my phone from view-only mode" toggle.
6. **No EXIF location data on uploaded photos.** Strip on upload, server-side.
7. **For high-stakes content (hotel rooms, flight #s), default to "editors only"** — a deliberate organizer action is required to expose.

**Warning signs:**
- Plans containing addresses, phone numbers, IDs being shared via public-link mode.
- Support requests like "someone in our plan is harassing us."
- Plans showing up in search engines or social media outside the group.

**Phase to address:** **Phase 2 (collaboration) for redaction; Phase 1 for link expiration and EXIF stripping.**

---

## Medium-Severity Pitfalls

Annoyances and slow leaks. Address as discovered; don't block launch.

---

### MP-1: Offline State Divergence

**What goes wrong:**
Two group members edit the same plan item offline (no signal on the metro). Both come online. Whoever syncs last wins; the other's change vanishes silently. Plans where users edit on the move are exactly where this happens most.

**Why it happens:**
Last-write-wins (LWW) is the default for naive sync and silently destroys data when timestamps disagree. (Per [Engin Bolat 2026 sync analysis](https://medium.com/@engin.bolat/beyond-offline-first-the-nightmare-of-data-synchronization-crdts-c69501a96c8d).)

**How to avoid:**

1. **For v1, accept LWW BUT make conflict visible.** If a write fails server-side validation (e.g., the row was modified after the client's last-read timestamp), show a "your change conflicts with [name]'s edit — keep yours / keep theirs / merge manually" dialog. *Visible conflict* is acceptable; *silent data loss* is not.
2. **Field-level granularity, not document-level.** Conflict resolution per-field reduces actual collisions to near-zero in typical use.
3. **Server-authoritative timestamps**, not client-local (clock skew destroys LWW).
4. **Don't implement full CRDTs in v1 unless your core editing model demands it.** CRDTs have real costs: garbage collection complexity, bandwidth overhead, business-logic conflicts they can't solve (e.g., "both users reserved the last seat"). LWW + visible conflicts is the right v1 stance. Revisit if collaborative editing becomes the dominant use mode. (Per [CRDT pitfalls 2026](https://medium.com/@2nick2patel2/typescript-crdt-toolkits-for-offline-first-apps-conflict-free-sync-without-tears-df456c7a169b).)

**Warning signs:**
- Support reports of "I added X and it's gone."
- Audit log shows fast-succession writes from different users.

**Phase to address:** **Phase 2 (collaboration).**

---

### MP-2: File Upload Cost Spiral

**What goes wrong:**
Group enthusiastically uploads hotel PDFs, restaurant screenshots, boarding passes, vacation photos. Each upload survives forever. Storage bill creeps. Bandwidth for serving these images on every view multiplies. Single 20-person plan = 200MB of uploads.

**How to avoid:**

1. **Storage: Cloudflare R2 ($0 egress) or Backblaze B2.** Never Supabase Storage or Vercel for large files.
2. **Hard per-plan upload cap (e.g., 100MB) and per-file cap (e.g., 10MB)** with clear UI.
3. **Server-side image compression on upload** (resize to max 1920px, WebP/AVIF).
4. **Lifecycle: archive plan attachments to cold storage 90 days post-event.** Restore on demand.
5. **PDFs: thumbnail preview + on-demand download** (don't auto-render heavy PDFs in-line).
6. **Strip EXIF on upload (privacy + size).**

**Warning signs:**
- Storage growth >2× user growth.
- Plans with >50 attachments.

**Phase to address:** **Phase 2 (file sharing).**

---

### MP-3: GDPR Right-to-Erasure on Shared Content

**What goes wrong:**
EU user requests data deletion. Their contributions are scattered across plans owned by *other people*. Their name appears in 12 plans' audit logs, 8 plans' vote tallies, 3 plans' "added by" attributions. Deleting them naively breaks data integrity for other users. Not deleting them violates GDPR Article 17.

**Verified facts (2026):**
- The Feb 2026 EDPB Coordinated Enforcement Framework report identified backup/multi-user data deletion as a common compliance failure across 764 controllers. (Per [Custodia Privacy 2026](https://app.custodia-privacy.com/blog/gdpr-right-to-erasure).)
- Deletion must cover primary DB, backups, analytics, third-party processors.

**How to avoid:**

1. **Design for pseudonymization, not deletion, from day 1.** When a user requests erasure: replace their identifier with `deleted-user-7f3a` everywhere their contributions survive, delete their email, photo, real name. Other users' content stays intact.
2. **Audit logs reference a stable internal user_id, not display name.** Display name is resolved at render time and shows "Deleted user" after erasure.
3. **Backups: document a "rolling 30-day deletion" policy** — explain to user that backups containing their data will be purged within 30 days as backups roll over. This is GDPR-acceptable per current EDPB guidance.
4. **Data export endpoint (Article 20 — portability)** before deletion. Saves support tickets.
5. **Don't store IP addresses or precise geo** unless you actually need them.
6. **Third-party processor inventory** (Supabase, Cloudflare R2, Vercel, Sentry, etc.) and their DPAs documented from day 1.

**Warning signs:**
- Deletion requests requiring manual SQL.
- Display name appearing in places after a "delete user" call.

**Phase to address:** **Phase 1 (data model) for pseudonymization architecture; Phase 4 for user-facing self-serve deletion UI.**

---

### MP-4: Pricing Model Mismatch for Ephemeral Use

**What goes wrong:**
You build subscription pricing ($5/month). Users plan 2 trips a year. Subscription model is wrong for trip frequency. Conversion to paid is near zero, but you've sunk effort into Stripe integration.

**How to avoid:**

1. **For v1, don't monetize.** Side project; focus on PMF and growth, not revenue.
2. **When monetizing, consider:**
   - **Pay-per-plan** ($2 per plan with premium features — matches user mental model).
   - **Annual** instead of monthly (matches usage frequency).
   - **Organizer-pays, group-uses-free** (only the planner needs an account).
   - **Freemium with sensible limits**: free = 1 active plan, paid = unlimited.
3. **Avoid pricing as a Phase 1 decision** — it constrains the product unnecessarily. Better to validate retention first.
4. **Don't paywall the things that drive virality** (link sharing, view-only access). Paywall organizer power features (recurring trips, advanced templates, larger storage).

**Phase to address:** **Phase 4+ (monetization).** Punt.

---

### MP-5: Marketing Without Built-In Virality Mechanics

**What goes wrong:**
You launch on Show HN, get 200 signups, then nothing. The product has no native virality loop. Every user is a one-off acquisition. CAC compounds.

**How to avoid:**

1. **The share link IS the virality mechanic.** Every plan shared = 3–15 impressions. Optimize the link preview (OpenGraph image, title, description) like it's your landing page — because it is.
2. **Branded plan preview pages.** A plan link opened in WhatsApp shows "Carlos created a plan on GroupCoordinator: 'Despedida en Cádiz'" with a beautiful preview image. That's marketing.
3. **Public landing on the same domain (already in PROJECT.md decisions ✓)** — every plan link contains an implicit ad for the product.
4. **"Powered by" footer on view-only plans** — small, tasteful, links to landing.
5. **Post-trip "create your own plan" CTA on view-only mode** for people who came in as guests.
6. **Don't fight the virality model — exploit it.** Group-coordination products have built-in viral mechanics if you don't over-protect.

**Warning signs:**
- All traffic is paid or one-time PR.
- View-only visitors don't convert to organizers in subsequent trips.
- No measurable organic-from-shared-link cohort.

**Phase to address:** **Phase 1 (link/preview UX) and Phase 4 (growth analytics).**

---

## Minor Pitfalls

Worth knowing, but cheap to fix. Listed for the "looks done but isn't" checklist later.

| Pitfall | What goes wrong | Quick fix |
|---|---|---|
| Time zones | Group spans timezones; "8pm" ambiguous | Store UTC, render in viewer's local TZ, label the trip's primary TZ |
| Date formats | DD/MM vs MM/DD ambiguity | Always use named months in UI ("15 Jun") |
| Currency on prices | Multi-country trips | Per-item currency, show converted in viewer's preference |
| Drag-and-drop on mobile | Standard libs broken on touch | Use long-press + handle, not drag |
| Back-button on PWA | History stack confusion | Test SPA back navigation on iOS Safari + Android Chrome |
| Polls that never close | Decision rot | Auto-close after deadline, force a default resolution |
| "Maybe" votes | Functionally useless | Yes/No only, or weighted with comments |
| Saved place duplicates | Two users add same restaurant | Fuzzy-match on address before save, suggest merge |
| Plan-archive policy | Users want old trips back | Soft-delete forever, "archive" not "delete" UX |
| Email-only invites (lack of) | Edge case: WhatsApp-resistant guest | Email link as fallback, copy-paste link always works |
| Service worker stale cache | Users see outdated UI weeks after deploy | Versioned SW, force-update on focus |
| Locale-leak | i18n strings hardcoded in English buried in third-party libs | Audit dependencies for English-only strings, prefer libs with i18n |

---

## Technical Debt Patterns

Shortcuts that look reasonable but compound.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Use Supabase Auth UI directly | Free, fast | Locks you to Supabase auth forever; theming is painful | Phase 1 OK; rewrite if you swap providers |
| Store JSON blobs instead of normalized tables | Schema-flexible | Querying, indexing, migration nightmares at scale | Never for hot tables; OK for true blobs (preferences) |
| Use UUID v4 as primary keys everywhere | Simple, distributed-safe | Index bloat, poor cache locality at large table sizes | Acceptable at this project's scale |
| Skip migrations, run SQL ad-hoc | Fast iteration solo | Impossible to onboard a collaborator; impossible to rollback | Only in Phase 0 throwaway prototype |
| `useEffect` for data fetching | Simple, in component | Race conditions, no caching, no dedup | Never — use SWR / React Query from day 1 |
| Roll your own auth | "I want control" | You will get it wrong; security is unforgiving | Never — OAuth via Supabase/Clerk/Auth.js |
| One big "plan" JSON document | Easy to serialize | Concurrent edits become hell; can't paginate | Never |
| Skip i18n in v1 because Spanish-only | Saves a day | Every string baked in is a future migration | Acceptable BUT use a key/value lookup from day 1, even if only one locale loaded |
| Inline secrets in code "temporarily" | Quick deploy | One commit and they're in git history forever | Never |
| Skip analytics in v1 | "We'll add it when we need it" | You won't know what's working — fly blind | Never; lightweight analytics from day 1 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| Google OAuth | Hardcoded redirect URIs that break in dev/preview deploys | Per-environment OAuth apps; use dynamic redirect based on `NEXT_PUBLIC_SITE_URL` |
| Apple Sign In | Forgetting Apple's email-relay (private relay address) | Treat all relayed emails as opaque; never use email as primary key |
| Supabase RLS | Forgetting to enable RLS, or writing policies that don't compose | RLS on by default at table creation; integration test every policy |
| Supabase Realtime | Subscribing in component, not unsubscribing on unmount | Always unsubscribe in cleanup; test with React StrictMode (double-mount) |
| Google Maps | Loading the full SDK on every page | Lazy-load on the map view only; use Static Maps API for previews |
| Image uploads | Trusting client-side validation | Validate MIME, size, dimensions server-side; re-encode on upload |
| PDF previews | Rendering with pdf.js on every view | Pre-generate thumbnail at upload; render full PDF on explicit user action |
| Cloudflare R2 | CORS misconfig causes upload failures only in production | Test direct-from-browser upload in preview deploys |
| Stripe (when added) | Webhook idempotency forgotten | Always check `event.id` against idempotency table |
| Sentry / error tracking | PII (emails, plan content) leaking into error breadcrumbs | Scrubber config from day 1 |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| Full plan re-fetch on every navigation | Slow plan view, especially on mobile | Cache plan in React Query with sensible TTL; invalidate on mutation | ~100ms perceived lag once a few items |
| N+1 queries on "plan with all items + votes + members" | Plan view slow as plans grow | Single query with joins or Supabase nested select | Plans with > 20 items |
| Map markers without clustering | Map lags with many places | Marker clustering library (e.g., `supercluster`) | Plans with > 30 places |
| Loading all attachments on plan view | Bandwidth + memory blowup | Lazy-load attachments below the fold; thumbnails only | Plans with > 10 attachments |
| WebSocket per component | Connection cap hit fast | Single connection per page, multiplex channels | At Supabase free tier ceiling |
| Synchronous geocoding on type | Autocomplete laggy | Debounce 300ms; cache results | Always; ship debounced from day 1 |
| No CDN on uploaded media | Slow image loads for far-away users | Cloudflare R2 + Cloudflare CDN | International groups |
| Optimistic UI without rollback | Users see "saved" then 2s later a silent revert | Show error toast on failed write; revert UI cleanly | First failed write |

---

## Security Mistakes (Domain-Specific)

| Mistake | Risk | Prevention |
|---|---|---|
| Short or guessable share tokens | Plan scraping, doxxing | 128+ bits entropy, `crypto.randomBytes` |
| Tokens in URL query string | Referer/log leakage | Tokens in path; strict referrer policy |
| No rate limiting on `/plan/:token` | Enumeration attacks | IP rate limit on 404s; honeypot tokens |
| Server logs containing share URLs | Token leak via log breach | Log scrubbing for `/plan/*` paths |
| No `noindex` on plan pages | Plans show up in Google | `noindex` meta + `robots.txt` Disallow |
| OAuth state parameter missing | CSRF on login flow | Use OAuth library defaults; never hand-roll |
| EXIF data on uploaded photos | Photo metadata reveals home address | Strip EXIF server-side on upload |
| No content security policy | XSS in user-supplied notes / place names | CSP from day 1; sanitize all user HTML |
| `eval()` or `dangerouslySetInnerHTML` on user content | XSS | Never; use a sanitizer (DOMPurify) for any rich text |
| Allowing user-supplied URLs without validation | Phishing via "click this link in the plan" | URL allowlist for protocols; preview before redirect |
| File upload without MIME validation | RCE via uploaded "image" that's actually a script | Server-side MIME sniff, never trust client `Content-Type` |
| Storing OAuth tokens in localStorage | XSS-exploitable | HttpOnly cookies for session; refresh tokens server-side |
| Cross-plan data leakage in RLS | User A sees User B's plan | Test every query path with RLS enabled; never use `service_role` from the client |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| Plain dashboard at `/` for logged-in users | Plan loss anxiety | Show most recent plans front-and-center, with a "create new" CTA |
| Modal-heavy editing flows on mobile | Thumbs hate modals | Inline edit + bottom sheets for complex actions |
| Hidden navigation (hamburger) on a 5-screen app | Discoverability | Bottom nav bar on mobile with 3–5 visible destinations |
| Toast-only feedback for destructive actions | "Wait, did I just delete that?" | Inline confirm + undo (Gmail-style) for delete |
| Calendar pickers default to today | Trips are usually weeks away | Default to a sensible "next weekend"/event-context date |
| "Vote" as a button (not a card) | Low participation | Make voting a swipe or single-tap interaction |
| Email digest at "9am" UTC | Wrong time zone for most users | Per-user TZ; default to viewer's profile TZ |
| Generic empty states | First-time users bounce | Context-aware empty states (see CP-4) |
| Read receipts on shared link views | Feels surveilly in friend group | Anonymous viewer count, not per-person presence |
| Friend's photo upload bumps yours off-screen | Loss of agency | Drag-to-reorder; stable list order |
| Demanding OAuth for trivial actions | Group abandons to WhatsApp | Hybrid auth — view, vote-once-anonymously, etc. without account |
| Forced full-name display | Privacy discomfort | Nickname-acceptable, default to first name only |

---

## "Looks Done But Isn't" Checklist

Pre-launch verification — features that *appear* complete but commonly miss the critical piece.

- [ ] **Share link**: works in WhatsApp preview, iMessage rich link, Telegram, plain SMS, email — *test all five*. Check OpenGraph image renders on each.
- [ ] **View-only mode**: tested by someone in a *different account* (not your own browser logged out — actually shared with a friend's phone).
- [ ] **PWA install**: tested on iOS Safari (Add to Home Screen), Android Chrome (install prompt), and Android Firefox. Test the in-app browser fallback (WhatsApp's WebKit).
- [ ] **Offline behavior**: tested in Airplane Mode for a 5-minute session, then reconnected. Does it sync or silently lose data?
- [ ] **Cold start**: tested by *logged-out user* on incognito on mobile, fresh visit. Does the link work? Is the org page intelligible?
- [ ] **GDPR-required pages**: privacy policy, terms, data deletion flow exist and actually work. Don't fake the deletion form.
- [ ] **OAuth on edge browsers**: Brave, Firefox Focus, DuckDuckGo, Samsung Internet. (Group members will use weird browsers.)
- [ ] **Time zones**: organizer in TZ X, viewer in TZ Y — does "Tuesday at 8pm" render correctly?
- [ ] **Map**: tested at zoom 18 (street level), zoom 8 (city level), zoom 3 (global). Markers cluster?
- [ ] **Realtime**: 3 browsers open on the same plan — does an edit in one appear in the others? Does it leak between *different* plans?
- [ ] **Notifications**: opt-out works. Frequency cap enforced. Unsubscribe link in email goes somewhere real.
- [ ] **File uploads**: 10MB PDF works. 50MB PDF rejected cleanly. Image with weird EXIF (geolocation) — is it stripped?
- [ ] **Token rotation**: organizer can revoke a share link and regenerate. Old link 404s, new link works.
- [ ] **Empty plan**: a plan with no items, shared with a guest — does it look intentional or broken?
- [ ] **Long names / Unicode**: "李明" "Carmen María de los Ángeles Fernández-Pérez" — render correctly, don't break layout.
- [ ] **Spanish first**: every screen, every error message, every email — Spanish polished before any English copy ships.
- [ ] **Error tracking**: Sentry/equivalent installed, PII scrubbed, alerts on error spikes.
- [ ] **Analytics**: at minimum — plan-create, plan-view, plan-edit, plan-share — events firing and visible in dashboard.
- [ ] **Backup/restore**: a destroyed plan (intentional or accidental) can be restored. Tested, not assumed.
- [ ] **Logout**: actually logs out (clears all tokens, redirects to landing, can't access protected data via back button).

---

## Recovery Strategies

When pitfalls happen anyway, how to dig out.

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Token leak (CP-6 / HP-6) | LOW | Force-rotate all tokens older than X days; notify affected organizers; investigate scope |
| Vercel bill shock (HP-2) | LOW | Set Spend Management cap; move static assets to Cloudflare; submit support ticket — Vercel sometimes credits accidents |
| Map cost explosion (HP-1) | MEDIUM | Cap GCP daily quota immediately; switch interactive map to MapLibre; restore service; refactor over 2 weeks |
| Realtime quota blow (HP-3) | LOW-MEDIUM | Disable Realtime fallback to polling; upgrade to Pro temporarily; ship throttling fix |
| Notification fatigue (HP-5) | MEDIUM | Pause all notifications; offer one-click "fix my settings" link in email; rebuild from digest-first; expect 30%+ to never re-opt-in |
| Doxxing incident (HP-7) | HIGH | Immediately take affected plan offline; coordinate with reporter; review redaction defaults; consider product change |
| GDPR violation (MP-3) | HIGH | Engage privacy counsel; complete erasure; document remediation; report to relevant DPA within 72h if breach |
| Critical bug destroys plan data | HIGH | Roll back deploy; restore from backup; communicate transparently to affected groups; offer manual recovery |
| Failed launch (CP-1, CP-2) | HIGH (existential) | Don't pivot in panic; do 10 qualitative user interviews; identify which pitfall (weakest-link? wedge? recall?) is biting; iterate on that specifically |
| Single-organizer ghosting (CP-5) | LOW (if architected) | Self-serve co-organizer promotion; if not architected, manual support intervention |

---

## Pitfall-to-Phase Mapping

This is the primary handoff to the roadmap. Each pitfall maps to the phase that should prevent it, with a concrete verification check.

| Pitfall | Severity | Prevention Phase | Verification |
|---|---|---|---|
| CP-1 Weakest-link adoption | Critical | Phase 0 (positioning) + Phase 1 (hybrid auth + link UX) | View-only mode works fully; share link tested in 5+ chat apps; metric defined as "% groups with ≥80% member coverage" |
| CP-2 WhatsApp gravity well | Critical | Phase 0 (wedge selection) | Wedge statement written, defended, in PROJECT.md as a Key Decision before Phase 1 starts |
| CP-3 Drawer trap (one-trip use) | Critical | Phase 1 (data model) + Phase 3 (lifecycle) | Plans are long-lived objects; post-trip recap shipped; persistent groups in v2 roadmap |
| CP-4 Empty-canvas first-run | Critical | Phase 2 (collaboration) | Templates at create; "preview as guest" before share; empty-state copy assumes the 2nd visitor |
| CP-5 Abandoned-plan recovery | Critical | Phase 2 (roles/permissions) | Co-organizer flow exists; ownership transfer tested; audit log visible |
| HP-1 Map cost explosion | High | Phase 1 (foundations) | MapLibre or Embed API chosen for view-only; daily GCP quota set; billing alerts active |
| HP-2 Vercel bandwidth shock | High | Phase 1 (foundations) | Uploads on R2/B2; Spend Management cap configured; Cloudflare front of Vercel for static |
| HP-3 Supabase Realtime blow-up | High | Phase 2 (collaboration) | Realtime lazy-subscribed; visibility-change disconnect; per-channel throttle |
| HP-4 PWA iOS install UX | High | Phase 1 (foundations) + Phase 3 (polish) | Browser tab UX is primary; iOS hint shown contextually; in-app-browser detection |
| HP-5 Notification overload/absence | High | Phase 3 (lifecycle) | Digest default; per-plan/per-type controls; max 1/day cap; unsubscribe metric tracked |
| HP-6 Anonymous-link token security | High | Phase 1 (foundations) | 128+ bit tokens; strict referrer policy; noindex; rate-limit; rotation endpoint |
| HP-7 Doxxing in shared itineraries | High | Phase 1 (EXIF strip + link expiry) + Phase 2 (field redaction) | EXIF stripped; default link expiry 7d post-event; sensitive-field categories defined |
| MP-1 Offline state divergence | Medium | Phase 2 (collaboration) | LWW with *visible* conflict UI; server-authoritative timestamps |
| MP-2 File upload cost spiral | Medium | Phase 2 (file sharing) | Per-plan/per-file caps; R2 storage; server-side compression; 90d cold archive |
| MP-3 GDPR right-to-erasure | Medium | Phase 1 (pseudonymization architecture) + Phase 4 (UI) | User IDs are stable internal IDs; pseudonymization tested; deletion form ships |
| MP-4 Pricing model mismatch | Medium | Phase 4+ (monetization) | Defer; validate retention first |
| MP-5 No virality mechanics | Medium | Phase 1 (link/preview UX) + Phase 4 (growth) | OpenGraph perfected; branded preview images; "Powered by" tasteful footer |

---

## Sources

**Verified (HIGH-confidence technical/cost facts):**
- [Supabase Realtime Limits — official docs](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Realtime concurrent connections troubleshooting](https://supabase.com/docs/guides/troubleshooting/realtime-concurrent-peak-connections-quota-jdDqcp)
- [Google Maps Platform pricing — official docs](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Google Maps API real cost 2026 — Radar analysis](https://radar.com/blog/google-maps-api-cost)
- [Vercel pricing — official](https://vercel.com/pricing)
- [Vercel free vs Pro 2026 — Fencode breakdown](https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing)
- [Vercel hidden costs — Schematic](https://schematichq.com/blog/vercel-pricing)
- [MDN: Referer header privacy and security concerns](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Referer_header:_privacy_and_security_concerns)
- [web.dev: Referrer best practices](https://web.dev/articles/referrer-best-practices)
- [PWA iOS limitations 2026 — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [PWA on iOS 2026 complete guide — Mobiloud](https://www.mobiloud.com/blog/progressive-web-apps-ios)
- [Safari PWA limitations 2026 — BSWEN](https://docs.bswen.com/blog/2026-03-12-safari-pwa-limitations-ios/)

**Verified (MEDIUM-HIGH confidence — product/market patterns):**
- [Why Group Travel Planning is Broken — NovaTrek](https://www.novatrek.app/en/blog/why-group-travel-planning-is-broken)
- [Best Group Travel Planning Apps 2026 — TripProf](https://tripprof.com/en/blog/best-group-travel-planning-apps/)
- [The Apps That Make Group Trip Planning Work — SmarterTravel](https://www.smartertravel.com/the-apps-that-make-group-trip-planning-work/)
- [Best Group Trip Planning Tools Compared 2026 — SquadTrip](https://squadtrip.com/guides/the-ultimate-group-travel-planning-app/)

**Verified (push notification fatigue):**
- [App push notification best practices 2026 — Appbot](https://appbot.co/blog/app-push-notifications-2026-best-practices/)
- [Push notification best practices — Boundev](https://www.boundev.com/blog/push-notification-best-practices-mobile-engagement)
- [Avoiding push fatigue — ContextSDK](https://contextsdk.com/blogposts/avoiding-push-fatigue-common-user-turn-offs)

**Verified (CRDT / sync):**
- [Beyond Offline-First: CRDTs nightmare — Engin Bolat](https://medium.com/@engin.bolat/beyond-offline-first-the-nightmare-of-data-synchronization-crdts-c69501a96c8d)
- [TypeScript CRDT Toolkits for Offline-First — Codastra](https://medium.com/@2nick2patel2/typescript-crdt-toolkits-for-offline-first-apps-conflict-free-sync-without-tears-df456c7a169b)

**Verified (GDPR):**
- [GDPR Right to Erasure — Custodia Privacy](https://app.custodia-privacy.com/blog/gdpr-right-to-erasure)
- [GDPR Deletion Requests & Backups — ProBackup](https://www.probackup.io/blog/gdpr-and-backups-how-to-handle-deletion-requests)

**Verified (virality):**
- [Viral Coefficient — CleverTap](https://clevertap.com/blog/viral-coefficient/)
- [Viral Coefficient SaaS Formula — Wall Street Prep](https://www.wallstreetprep.com/knowledge/viral-coefficient/)

---
*Pitfalls research for: group-coordination web app (PWA) for friend groups of 3–15, ephemeral-event planning*
*Researched: 2026-05-20*
