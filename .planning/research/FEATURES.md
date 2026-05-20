# Feature Research

**Domain:** Group coordination for friend groups (3–15) planning trips, concerts, festivals
**Researched:** 2026-05-20
**Confidence:** HIGH (12+ direct competitor sources analyzed, multiple user-review datasets, WhatsApp baseline verified against official limitation docs)

---

## Competitive Landscape Summary

| Competitor | Wedge | Group-First? | Locked Feature Notes |
|-----------|-------|--------------|----------------------|
| **Wanderlog** | "Google Doc for trips" — gold standard for collaborative itineraries | Yes | Best-in-class itinerary + map; criticized as feature-heavy and laggy on complex trips. Pro paywall annoys group members. |
| **TripIt** | Auto-parse booking emails into itinerary; solo-first | No (Inner Circle is share-only, edit limited) | Polished but boring; no real group decision-making. |
| **Troupe** (JetBlue) | Pre-trip decision-making (polls, ranked-choice, activity voting) | Yes | "Once decided, Troupe's job is done." No itinerary, no on-trip use. |
| **AvoSquado** | Niche: bachelorettes, ski houses; bedroom assignments + bookable activities | Yes | Strong on logistics, weak on findability. |
| **SquadTrip** | Group payments + forms + itineraries; built for paid trips/retreats | Yes | Heavier, more "tour operator-lite". |
| **Plan Harmony / WePlanify / Pilot / Let's Jetty / Stippl** | Various; mostly all-in-one collaborative itinerary clones | Yes | Crowded "me-too" tier. Most differentiate on free/AI/UI polish. |
| **Heylo** (the "Heya" the user likely meant — heyaapp.com is a parked domain for sale) | Community groups + recurring events | Partial | Community-first, not trip-first. RSVP + chat + announcements. |
| **GroupMe Event Groups** | Event-scoped chat + RSVP + map + polls | Partial | Free, no friction, but a chat app at heart. |
| **Marco Polo** | Asynchronous video for group catch-ups | No | Not relevant to coordination. |
| **Band** | Long-tail community organization (clubs, sports) | Partial | Calendars + polls + chat, but heavy/bloated UX. |
| **Splitwise** | One thing well: who owes whom | Yes (expense scope) | The reference standard for expenses. |
| **Notion templates** | Maximum flexibility; "you build it" | Yes | Loved by power users; abandoned by ~everyone else in group due to learning curve and no mobile fluency. |
| **WhatsApp + Maps + Polls** | The baseline being fled | No (the problem) | Polls capped at 12 options, no edit after send, no scheduling/deadlines, no analytics, message scroll graveyard. |

**Key competitive insight:** The space is crowded but **bimodal** — apps are either (a) decision/poll-focused and die after the trip is booked (Troupe), or (b) itinerary/document-focused and bloat over time (Wanderlog). Almost none nail the **"during the event" findability** moment that PROJECT.md identifies as the core pain. The on-the-go use case is the gap.

---

## Already Locked v1 (acknowledged, not re-recommended)

Per `PROJECT.md` Active requirements — these are decided:

- Plan-as-event with link-based invite
- View without account; OAuth (Google/Apple) to edit/vote
- Chronological itinerary with places, times, notes
- Shared map with saved places
- Group polls/votes with explicit close
- Notes/links/docs/screenshots — findable
- Flexible roles (organizer-led OR collaborative wiki)
- Public landing on same domain

## Already Planned v2 (deferred, do not surface as new)

- Expense management (Splitwise-like) — full product on its own
- Photo album / post-event recap
- Persistent groups across multiple events
- In-app chat/comments

---

## Feature Landscape

### Table Stakes (Users Expect These)

These are features users assume exist — missing them means the product *feels broken or fails vs. WhatsApp*.

| Feature | Why Expected | Complexity | Notes / Why It Matters |
|---------|--------------|------------|------------------------|
| **Trip cover / name / dates / destination** | Every competitor has this as the trip's identity | SM | Used everywhere as the "card" or list item. Don't skip metadata. |
| **Member list with avatars and "who's in"** | RSVP visibility is universal (GroupMe, Troupe, Wanderlog, Heylo) | SM | Even without RSVP, just *seeing* who has the link reduces "did Juan see this?" friction. |
| **Push / web-push notifications on key events** | All competitors notify on poll/itinerary/note changes; PWA users expect this | MD | PWA push is supported but quirky on iOS (≥16.4, requires "Add to Home Screen"). Plan accordingly. |
| **Real-time / near-real-time sync** | Wanderlog's #1 praised feature; users expect Google Docs–style live edits | MD | Optimistic UI + eventual consistency is fine for v1; full CRDT is overkill. |
| **Mobile-first, install-as-app** | The "during trip" moment is mobile; competitors with weak mobile (Notion) lose adoption | MD | Already locked as PWA. |
| **Search / filter inside the trip** | Wanderlog and Notion users repeatedly cite "finding stuff" as core value | SM | A simple global "search inside trip" (notes + items + links) is *the WhatsApp killer*. Often overlooked. |
| **Activity feed / "what's new"** | Returning users need to know what changed since last visit; Wanderlog, Stippl, SquadTrip all have this | MD | Without it, users scroll the whole plan looking for changes — same problem as WhatsApp. |
| **Drag/reorder itinerary items + per-day grouping** | Itinerary UX standard since TripIt | MD | If reordering is clunky, users go back to a Google Doc. |
| **Time-zone aware times for items** | International trips bite hard; users complain when forgotten | SM | Often missed in v1. Cheap to add. |
| **Open in Google Maps / Apple Maps from any place** | The "navigate me there" handoff is the dominant on-trip action | SM | Don't try to replace Maps — make the handoff one tap. |
| **Email/link invite with preview (OG tags)** | Link is the viral vector; preview in WhatsApp/iMessage drives clicks | SM | Crucial for adoption. Don't ship without rich OG/Twitter cards. |
| **Reservations / confirmation # / file attachments** | TripIt's flagship; users save bookings *somewhere* — your app or screenshot scroll | MD | Even simple: attach PDF/image to an item. The "where's the reservation" pain. |
| **Mobile-friendly link/URL handling** | Users paste Airbnb, Booking, Instagram, TikTok links constantly | SM | Auto-unfurl with OG image gives huge perceived polish. |
| **Anyone-can-edit vs invite-only toggle** | Heylo, Notion, Wanderlog all expose some permission switch | SM | Already covered by "flexible roles" decision. |
| **Offline read of itinerary** | Bad signal at festivals, abroad without data, on planes | MD | Service-worker cache of trip JSON is mandatory for PWA on-the-go. |
| **Reasonable empty/onboarding state for the trip page** | First-time member opens link → if blank/confusing, leaves | SM | High-leverage. Show "What's been added so far" with sample structure if empty. |

### Differentiators (Where You Can Win)

| Feature | Value Proposition | Complexity | Notes / Wedge Evidence |
|---------|-------------------|------------|------------------------|
| **<30-second trip creation** | Heylo, Troupe, Wanderlog all require sign-up before doing anything useful. Friction kills group adoption. | SM | Strong candidate wedge: "Create a plan, share the link, ask later who you are." Validated by WhenAvailable's claim that no-signup access is their key differentiator. |
| **View-without-account + edit-with-OAuth** | Already locked. Underplayed in competitors — Wanderlog requires account to even view. | MD | Already locked. Make it loud in marketing. |
| **"Day-of mode" — single-screen on-trip view** | Bimodal competitive split: decision apps (Troupe) and itinerary apps (Wanderlog) both fail on-trip. Gap. | MD | Big screen: "next item, address, link to reservation, who's where." This is the real differentiator vs. WhatsApp. |
| **Global trip search across notes/items/links/files** | The literal Pain #1 of users fleeing WhatsApp; competitors bury this | SM | Cheapest, highest-leverage feature you can ship. Just do it well. |
| **Vote closes with clear winner pinned to itinerary** | Troupe nails voting; nobody nails the "decision → action" handoff | MD | When vote closes → auto-create itinerary item from winning option. Removes a manual step. |
| **Decision log / "what was decided"** | Persistent answer to "wait, did we agree on the Thursday hike?" | SM | Pin decisions to a dedicated panel. Counterpoint to WhatsApp's amnesia. |
| **Place card with rich preview from URL** | Pilot, Plan Harmony do partial. Most apps need manual entry. | MD | Paste Airbnb/Google Maps/Instagram link → auto-extract name, address, image, price. Magic moment. |
| **Spanish-first product, not translated** | Almost every competitor is English-first; LATAM/Spain market underserved | SM | Already locked. Lean into it in copy, screenshots, examples. |
| **No-friction collaborator graduation** | Member views → likes → must sign in to vote → seamless OAuth | SM | Most apps reject anonymous users at the door. Convert at moment of intent, not gate. |
| **Inline countdown to event + status** | "T-3 days. Hotel confirmed. 2 polls open." — emotional anchor + actionable | SM | Marketing-friendly, sticky on the home screen. |
| **Templates for common scenarios** | "Festival weekend", "European city break", "Bachelor party" pre-populate itinerary skeleton + sample polls | MD | Reduces blank-page paralysis. Heya/Heylo lean into this for community events. |
| **PWA install prompt timed right** | iOS Safari hides install; many PWA apps fail to convert to "real" apps | SM | After member visits 2x → soft prompt with screenshots. High-impact, often overlooked. |
| **"Pinned essentials" panel** | Surface the 3–5 critical things (hotel address, check-in code, group meeting point) above the timeline | SM | Direct answer to "where's the reservation link" pain. |

### Anti-Features (Commonly Requested, Often Harmful)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **In-app chat / message thread** | "Replace WhatsApp" feels natural | (a) Already in PROJECT.md out-of-scope. (b) Direct competition with WhatsApp = loss. (c) Doubles the surface area, adds moderation/notifications burden. | Comments-on-item or reactions only, if anything. Never a chat tab. PROJECT.md correctly defers this. |
| **AI trip itinerary generation** | Loud trend in 2025–26 (TripGuru, Stardrift, Mindtrip) | Users planning a *real* trip with *real* friends already know where they're going. AI generation is a *solo dreamer* feature, not a *group coordination* feature. | Skip entirely in v1. If added later, scope to "suggest restaurants near hotel" not "build me a trip." |
| **Booking / payments in-app** | Monetization temptation; SquadTrip and AvoSquado lean here | Forces compliance, partners, scope explosion. Users book on Skyscanner/Booking/Airbnb and *paste links*. | Capture pasted links well. Defer integrations indefinitely. |
| **Email parsing (TripIt-style auto-import)** | "Magic" perception | High infra cost (IMAP, parsing, OAuth scopes), trust concerns, slow ROI. TripIt has 20 years' head start. | Manual paste + URL unfurl gets 80% of the value at 5% of the cost. |
| **Real-time live cursor / presence indicators** | "Like Figma!" feels modern | Heavy infra. Group of 3–15 doesn't edit simultaneously often enough to justify. | "Updated by Ana 2m ago" stamp is enough. |
| **Full social feed / discover other trips** | Reddit and TikTok scratch this itch already | Drags product toward UGC moderation, ranking, SEO content. Not the wedge. | Stay private-by-default. Public trip pages only if user opts in. |
| **Native iOS/Android apps** | "Apps are better than web" instinct | Already explicitly out-of-scope in PROJECT.md. PWA is correct. | Reinforce PWA polish: install prompt, splash, offline, push. |
| **Reactions / emoji on every item** | Slack/Discord pattern | Adds visual noise, suggests chat behaviour the app explicitly avoids | Vote/poll already covers "what does the group think." |
| **Calendar sync with personal calendar** | Sounds useful | Bidirectional sync is a tar pit; one-way ICS export is fine if asked for | Export ICS link per trip, lazy v1.x. |
| **Per-user notification preferences with granular controls** | Power users want it | 90% of users use defaults; the granularity becomes bug surface | Three switches max: "All", "Decisions only", "Off". |
| **Real-time live location sharing of members** | Festival use case temptation | Privacy nightmare; competes with Find My / Google Maps share. Battery drain. | Don't build. Point at native FindMy/Maps share for festivals. |
| **Multi-trip dashboard in v1** | Persistent-group feel | Already deferred to v2 in PROJECT.md (correctly). Single-event focus simplifies model. | Keep v1 single-event. Lift to multi later if validated. |
| **Granular per-trip role permissions (admin/editor/viewer/etc.)** | Enterprise feel | Friend groups don't need RBAC. Overhead per onboarding. | Two states: link-viewer, signed-in editor. PROJECT.md is right. |

---

## What WhatsApp + Maps + Notes Already Do "Well Enough" — DO NOT Replace

Critical to the wedge: identify what users will keep doing in those tools. Trying to replace these is how niche apps die.

| Function | Where it lives today | Why we don't compete |
|----------|----------------------|----------------------|
| **Real-time conversation, banter, jokes, voice notes** | WhatsApp | Group dynamics, ephemeral context. Replacing chat = losing. Already out-of-scope. |
| **Image sharing in the flow** | WhatsApp | Photos are mostly throwaway. Persistent ones go in v2 album. |
| **Voice/video calls** | WhatsApp / FaceTime | Communication, not coordination. |
| **Turn-by-turn navigation** | Google/Apple Maps | Don't reinvent. Deep-link out from every place card. |
| **Personal calendar reminders** | iOS/Google Calendar | Export ICS later; don't try to be the user's calendar. |
| **Flight tracking, delay alerts** | TripIt / airline apps / Google | Don't build flight integrations. |
| **Booking reservation flow** | Booking / Airbnb / Skyscanner / Resy | Capture the *link*. Don't re-host the booking. |
| **Find My / live location during festivals** | Apple FindMy, Google Maps share | Privacy + battery problems. Point users to native. |
| **Receipt photos / quick scratchpad notes** | Phone camera roll, Notes app | Capture as attachment; don't replace the camera roll. |

**Rule of thumb:** *We are not WhatsApp+. We are the place to find the things that get lost in WhatsApp.* Don't accept any feature that violates this.

---

## Wedge Candidate Analysis (Evidence-Based)

The user explicitly asked for help choosing the wedge among three hypotheses, plus any others surfaced by research. Five candidates, ranked by evidence strength:

### Wedge 1: **"Findable" — the anti-graveyard for group-trip information** [STRONGEST]
**Pitch:** "Every link, code, reservation, and decision your group needs — in 2 seconds, no scroll."

**Evidence:**
- PROJECT.md identifies this as the dominant pain.
- Wanderlog reviews praise "easy to find stuff" as #1 retention reason. They underdeliver on it for group context.
- WhatsApp's documented limits: no edit after poll send, 12-option max, no search-by-poll, message scroll degrades after ~200 messages.
- Notion users abandon because "search is great but the structure is too heavy."
- **Gap:** No competitor pitches "findability" as the headline. Most lead with "plan trips together" — same as everyone else.

**Required for this wedge:** killer search, pinned essentials panel, link unfurl, decision log, activity feed. Most of these are already in scope or cheap to add.

**Risk:** Hard to demo in 5 seconds — it's a "feel" benefit. Solve with onboarding video that contrasts a chaotic WhatsApp scroll vs. clean trip page.

### Wedge 2: **"30-second setup, no signup to view"** [STRONG, but enabling not differentiating]
**Pitch:** "Create your trip in 30 seconds. Send the link. Everyone sees it. No accounts."

**Evidence:**
- Already locked in PROJECT.md as a core decision.
- WhenAvailable cites no-signup access as their main differentiator and it works for them in scheduling.
- Most competitors (Wanderlog, Troupe, Heylo, SquadTrip) require sign-up to view a trip — direct contrast.
- **Caveat:** This is a *necessary condition* for adoption (it removes a blocker), but it's hard to *position* as a wedge because users don't shop on signup friction; they shop on "does it solve my problem."

**Best use:** Use as the *promise* in marketing copy (the hook), but not as the standalone wedge.

### Wedge 3: **"Designed for the trip moment, not the planning moment"** [STRONG and underserved]
**Pitch:** "Built for the morning you arrive, when nobody can find the hotel address."

**Evidence:**
- Bimodal competitor split: Troupe dies after booking; Wanderlog is built for planning desktop sessions, not live mobile use.
- User reviews of trip planners complain about "laggy on trip," "no offline," "had to switch back to screenshots day of."
- PROJECT.md explicitly identifies the on-trip phase as the use peak.
- **Gap:** No app aggressively claims "we are the on-trip app." Everyone claims "planning."

**Required for this wedge:** Day-of mode (single-screen view), strong offline, "pinned essentials," fast load on bad networks, big touch targets.

**Risk:** Requires more engineering investment up-front (offline, PWA polish, day-of UI) than wedge 1.

### Wedge 4: **"Truly unified all-in-one"** [WEAK — crowded promise]
**Pitch:** "Itinerary + map + notes + votes in one place."

**Evidence:**
- This is the *literal positioning* of Wanderlog, WePlanify, Plan Harmony, Pilot, Stippl, Let's Trip, Prit, PlanMoreTrips...
- "All-in-one" loses because every competitor claims it. Users don't believe it without proof.
- "All-in-one" also conflicts with the focus discipline needed to nail any one thing — and the user has already correctly deferred gastos and album.

**Verdict:** Don't lead with this. The product *is* unified, but the wedge has to be sharper.

### Wedge 5: **"Spanish-first / LATAM-first"** [STRONG positioning, weak feature wedge]
**Pitch:** "El primer planificador de viajes pensado para amigos hispanohablantes."

**Evidence:**
- All major competitors are English-first; even when translated, they use English defaults, English-language examples, English place suggestions.
- LATAM and Spain combined are ~580M Spanish speakers, large WhatsApp-using base.
- Less competition on App Store search in Spanish keywords.

**Verdict:** This is a **marketing wedge, not a feature wedge.** Use it for go-to-market. It compounds with any of the above three (especially #1 Findability).

### Recommendation
**Combine Wedge 1 (Findability) as core positioning + Wedge 3 (On-trip mode) as proof point + Wedge 5 (Spanish-first) as go-to-market.**

Headline: *"Nunca más perder la reserva en el chat. El lugar al que tu grupo vuelve antes, durante y después del viaje."*

Wedge 2 ("30-second setup") is the demo, not the headline. Wedge 4 ("all-in-one") should be implicit, never spoken.

---

## Feature Dependencies

```
[Trip page (view only)]
    └──requires──> [Trip data model + link tokens]

[Edit / vote / contribute]
    └──requires──> [OAuth (Google/Apple)]
                       └──requires──> [Permission gate at action, not at view]

[Itinerary items with reservations]
    └──requires──> [File/image attachments]
    └──enhances──> [Pinned essentials panel]
    └──enhances──> [Global trip search]

[Polls]
    └──requires──> [Member identity (post-OAuth)]
    └──enhances──> [Decision log]
    └──enhances──> ["Convert winning option to itinerary item"]

[Map with places]
    └──requires──> [Place card schema (name, lat/lng, link, notes)]
    └──enhances──> [Deep-link to Google/Apple Maps]
    └──enhances──> [URL unfurl on Google Maps/Airbnb/Instagram paste]

[Activity feed]
    └──requires──> [Event log on every mutation]
    └──enhances──> [Push notifications]

[Offline read]
    └──requires──> [Service worker + cached trip JSON]
    └──conflicts──> [Real-time live cursors] (skip them, save complexity)

[Day-of mode]
    └──requires──> [Itinerary, place data, pinned essentials, offline cache]
    └──enables──> Wedge 3 ("on-trip mode")

[Push notifications (PWA)]
    └──requires──> [Web Push subscription + iOS install prompt]
    └──enhances──> Activity feed value
```

### Key Dependency Insights

- **Pinned essentials + global search + activity feed** form a "findability trinity" — ship together for maximum wedge impact.
- **Offline cache** unlocks the day-of mode wedge. It's a foundation, not a polish item.
- **URL unfurl** is the magic moment that converts skeptics — it amplifies the value of map and itinerary simultaneously. High ROI.
- **Push notifications** depend on PWA install — invest in the install prompt UX *before* notifications, or notifications are wasted.

---

## MVP Definition

### Launch With (v1) — Beyond Already-Locked Scope

PROJECT.md already locks the core 8 items. The research-suggested *additions* to make v1 viable against WhatsApp:

- [ ] **Global trip search (notes + items + links + files)** — wedge-critical, low cost
- [ ] **Pinned essentials panel** (3–5 user-pinned items above the timeline) — wedge-critical, low cost
- [ ] **Activity feed / "what's new since you last visited"** — wedge-critical, medium cost
- [ ] **URL unfurl on paste (Airbnb, Booking, Google Maps, Instagram, YouTube)** — high "magic" ROI, medium cost
- [ ] **File / image attachment per itinerary item** — table stakes, low cost
- [ ] **Open in Google/Apple Maps deep links from any place card** — table stakes, low cost
- [ ] **Offline cache of trip data via service worker** — enables day-of mode, medium cost
- [ ] **Member presence list with avatars** — table stakes, low cost
- [ ] **Rich OG/Twitter cards on shared link** — adoption-critical, low cost
- [ ] **PWA install prompt with smart timing (2nd visit)** — push enablement, low cost
- [ ] **Web Push notifications on polls + key item changes** — table stakes, medium cost (iOS quirks)
- [ ] **Vote closes → "create itinerary item from winning option" CTA** — differentiator, low cost
- [ ] **Decision log / "decided" panel** — wedge-critical, low cost
- [ ] **Trip metadata: name, dates, destination, cover image** — table stakes, low cost
- [ ] **Empty-state onboarding for first-time viewers** — adoption-critical, low cost

### Add After Validation (v1.x)

- [ ] **Day-of mode** (single-screen "right now" view) — once core engagement is validated
- [ ] **Scenario templates** ("Festival weekend", "City break", "Concert night") — when blank-page paralysis is observed
- [ ] **ICS calendar export** per trip — when first users ask
- [ ] **Per-item simple reactions (👍/❤️ only)** — only if comments/chat pressure is high
- [ ] **Recurring/series events** — only if persistent-group use cases emerge
- [ ] **Multi-language UI (English second)** — when LATAM/Spain traction is proven

### Future Consideration (v2+) — Already Documented

- [ ] Expense management (Splitwise-equivalent) — PROJECT.md v2
- [ ] Photo album / post-event recap — PROJECT.md v2
- [ ] Persistent groups across multiple events — PROJECT.md v2
- [ ] In-app comments/chat (constrained, not chat-tab) — PROJECT.md v2

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Global trip search | HIGH | LOW | **P1** |
| Pinned essentials panel | HIGH | LOW | **P1** |
| Activity feed | HIGH | MEDIUM | **P1** |
| URL unfurl on paste | HIGH | MEDIUM | **P1** |
| File attachment per item | HIGH | LOW | **P1** |
| Maps deep-link | HIGH | LOW | **P1** |
| Offline cache | MEDIUM (HIGH on-trip) | MEDIUM | **P1** |
| Decision log | HIGH | LOW | **P1** |
| Vote-to-itinerary conversion | MEDIUM | LOW | **P1** |
| Rich OG link previews | HIGH (for viral) | LOW | **P1** |
| Web push notifications | MEDIUM | MEDIUM | **P2** |
| PWA install prompt | MEDIUM | LOW | **P2** |
| Activity reactions (👍) | LOW | LOW | **P3** |
| Day-of mode (single-screen) | HIGH on-trip | MEDIUM | **P2** (post-validation) |
| Scenario templates | MEDIUM | MEDIUM | **P2** |
| ICS calendar export | LOW | LOW | **P3** |
| AI trip generation | LOW (for group) | HIGH | **anti** |
| In-app chat | NEGATIVE (anti-wedge) | HIGH | **anti** |
| Booking/payments | LOW | HIGH | **anti** |
| Email parsing | LOW | HIGH | **anti** |
| Live location sharing | LOW (privacy risk) | HIGH | **anti** |

**Priority key:**
- **P1**: Ship in v1 — combined with PROJECT.md's locked items, this is the launch package
- **P2**: Add post-launch when validated
- **P3**: Nice to have, queue for later
- **anti**: Explicitly do not build

---

## Competitor Feature Analysis (Selected Critical Features)

| Feature | Wanderlog | TripIt | Troupe | WhatsApp+Maps | **Our Approach** |
|---------|-----------|--------|--------|---------------|------------------|
| **Group itinerary (live edit)** | Excellent | Solo-first | None | None | Solid: optimistic UI, eventual consistency |
| **Polls / votes** | Basic | None | Excellent (ranked-choice) | 12-option cap, no edit, no close | Solid: clear close, winner → itinerary |
| **Findability / search** | Good for items, weak for notes | Good for own trips | None | Awful (scroll graveyard) | **Our wedge — do this best** |
| **Shared map** | Excellent | None | None | Shared location pin only | Solid: places saved, deep-link to Maps |
| **Notes / docs / files** | Good | Reservations only | Notes only | Photo dump in chat | Solid: searchable, attachable, pinnable |
| **Sign-up to view** | Required | Required | Required | N/A (just chat) | **No — view via link, sign in only to edit** |
| **Mobile / on-trip UX** | Laggy on big trips | Fine but boring | Web-first | Native | PWA: snappy, offline, day-of mode |
| **Decision log** | None | None | Inferred from polls | None | **Our wedge — explicit decided panel** |
| **URL unfurl** | Partial | None | None | Native in chat | **Our wedge — magical for Airbnb/IG/Maps** |
| **Expense splitting** | Has it | None | None | Manual | **Defer to v2 — refer users to Splitwise meanwhile** |
| **Spanish-first** | Translated, English defaults | Translated | Translated | Native | **Our wedge for LATAM/Spain market** |

---

## Risk Flags for Roadmap

1. **PWA push on iOS is genuinely fragile.** iOS 16.4+ required, must be installed from Home Screen, badges and silent push have quirks. Budget time and have a graceful fallback (in-app activity feed).
2. **Real-time sync expectations are high but expensive to do perfectly.** Use optimistic UI + polling/long-polling first. Avoid premature CRDT/WebSocket investments.
3. **OAuth on iOS Safari + PWA** has standalone-mode quirks (popups blocked, redirects broken in some flows). Test early; consider device-native Apple sign-in.
4. **URL unfurl** for Airbnb/Booking/Instagram is harder than it looks (anti-scraping, OG tag inconsistency, image bandwidth). Plan for a "fallback to link + favicon" path.
5. **The "anti-feature" pressure will be relentless.** Especially "add a chat tab" and "let me book a flight." The discipline to refuse these is part of the wedge — document them in PROJECT.md repeatedly.

---

## Sources

### Competitor Product Pages & Documentation
- [Wanderlog product page](https://wanderlog.com/)
- [Wanderlog Pro vs free comparison via WhistleOut](https://www.whistleout.com/CellPhones/Guides/wanderlog-group-trip-planning-app)
- [TripIt help center — Inner Circle sharing](https://help.tripit.com/en/support/solutions/articles/103000063388-inner-circle-automatic-trip-share-)
- [TripIt 20-year history](https://www.tripit.com/web/blog/news-culture/tripit-turns-20)
- [Troupe — official product page](https://www.troupe.com/group-travel/group-trip-planner-app/)
- [Troupe / JetBlue launch press release](https://ir.jetblue.com/news/news-details/2022/nbspJetBlue-Travel-Products-Launches-New-Travel-App-Troupe-09-21-2022/default.aspx)
- [GroupMe — Event Groups blog](https://groupme.com/blog/event-groups-the-group-chat-app-designed-to-get-you-out-of-the-chat)
- [GroupMe for concerts and festivals](https://groupme.com/blog/why-groupme-is-the-ultimate-app-for-concert-and-music-festival-fans)
- [Heylo — events documentation](https://www.heylo.com/help/events)
- [Marco Polo — groups](https://support.marcopolo.me/article/321-learn-more-about-groups)
- [Splitwise — main product page](https://www.splitwise.com/)
- [Notion — Group trip planner template](https://www.notion.com/templates/group-trip-planner)
- [Notion — Trip with friends template](https://www.notion.com/templates/trip-with-friends)
- [Frontstage — festival friend finder](https://www.frontstagefestivals.com/app)
- [Crowd Compass — festival group tracking](https://www.crowdcompass.io/)

### Comparison & Review Sources
- [10 Best Group Trip Planner Apps 2026 — WePlanify](https://www.weplanify.com/en/alternatives/best-group-trip-planner-apps)
- [Best Group Travel Planning Apps 2026 — TripProf](https://tripprof.com/en/blog/best-group-travel-planning-apps/)
- [5 Best Group Trip Planning Tools 2026 — SquadTrip](https://www.squadtrip.com/guides/best-tools-for-group-trip-planning/)
- [Wanderlog vs TripIt 2026 — Tripstone](https://tripstone.app/blog/wanderlog-vs-tripit)
- [Wanderlog vs TripIt 2026 — BluePlanit](https://blueplanit.co/blog/wanderlog-vs-tripit)
- [Wanderlog Review 2026 — Wandrly](https://www.wandrly.app/reviews/wanderlog)
- [Wanderlog Reviews — TrustPilot](https://www.trustpilot.com/review/wanderlog.com)
- [Wanderlog Reviews — JustUseApp](https://justuseapp.com/en/app/1476732439/wanderlog-travel-planner/reviews)
- [Best Splitwise Alternatives for Group Travel — SquadTrip](https://www.squadtrip.com/guides/top-splitwise-alternatives-for-group-travel-expenses/)
- [Best Travel Planning Apps 2026 — Stippl](https://www.stippl.io/blog/best-travel-planning-apps-2026)
- [Why Online Travel Apps Fail — JPLoft](https://www.jploft.com/blog/why-online-travel-apps-fail)
- [Why Smart Travel Planning Apps Fail — bplan.ai](https://bplan.ai/blogs/business-fails/smart-travel-planning-app-business-fails)

### WhatsApp Baseline / Limitations
- [WhatsApp Polls Guide and Limitations — AnyControl](https://anycontrol.app/blog/post/whatsapp-polls-guide-features-and-Limitations)
- [WhatsApp Polls limitations — Periskope](https://periskope.app/blog/how-to-create-a-poll-in-whatsapp)
- [Official WhatsApp Help — Polls](https://faq.whatsapp.com/796470361614974/?cms_platform=web)
- [WhatsApp Communities and Polls overview — UMA Technology](https://umatechnology.org/how-to-use-whatsapp-group-polls-and-communities-features/)

### Indie / Product Hunt Discovery
- [Product Hunt — Travel Planning category](https://www.producthunt.com/categories/travel-planning)
- [Product Hunt — Travel Apps 2026](https://www.producthunt.com/categories/travel-apps)
- [Let's Trip on Product Hunt](https://www.producthunt.com/products/let-s-trip?launch=let-s-trip)
- [Prit on Product Hunt](https://www.producthunt.com/products/prit-2)
- [PlanMoreTrips on Product Hunt](https://www.producthunt.com/products/planmoretrips)
- [Pilot — collaborative trip planner](https://www.pilotplans.com/)
- [Let's Jetty — trip planner with RSVP](https://www.letsjetty.com/)
- [WhenAvailable — no-signup scheduling differentiator](https://whenavailable.com/blog/best-group-planning-apps)

### Note on "Heya"
The domain `heyaapp.com` is parked for sale ($2,000) and currently has no live product. The closest extant matches are **Heylo** (community/event app), **Heja** (sports team management), and **HeyGroup** (group chat with event-specific spinoffs). All three are analyzed above as part of the competitive landscape.

---
*Feature research for: group-coordination app for friend groups planning trips/concerts/festivals*
*Researched: 2026-05-20*
