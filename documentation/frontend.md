# Website (Frontend)

React 19 + Vite + Tailwind CSS v4 + react-router v7. TypeScript (`strict`),
`src` is `.ts`/`.tsx` only.

## Requirements

- Node >= 22.12

## Setup

```bash
cd website
npm install
cp .env.example .env   # then fill in the values
npm run dev            # http://localhost:5173
```

### Environment variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon public** key — never the service-role key |
| `VITE_AUTH_REDIRECT_URL` | URL the password-reset link returns to (e.g. `http://localhost:5173`) |
| `VITE_API_URL` | Backend base URL (e.g. `http://localhost:8000`) — used by the geocoding proxy client and the Palay Assistant (`services/geocode.ts`, `services/chatbot.ts`) |

`.env` is gitignored; `.env.example` documents every key with empty values.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint (react-hooks rules included) |
| `npm test` | Vitest suite (single run) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |

`predev` / `prebuild` run `scripts/generateScanSheet.mjs` first, which renders
`public/palaysigla-scan-sheet.pdf` (gitignored) from
`ocr_templates/scan-sheet-v1.json` with pdf-lib. The backend loads the same
spec for its crop geometry, so the printable sheet and the recognizer can
never drift apart.

## Testing

Vitest + jsdom + React Testing Library, configured in `vitest.config.js`.

- Characterization tests live in `src/**/__tests__/` beside the code they cover and
  exercise the data layer: `services/` (Supabase and `fetch` mocked), `utils/`, and the
  listing hooks.
- `src/test/supabaseMock.ts` provides the chainable Supabase client, query-builder, and
  storage-bucket doubles used by the service tests.
- `scripts/__tests__/scanSheetPdf.test.mjs` renders the sheet PDF (valid prefix, A4
  page size, deterministic bytes, all spec rects in bounds); `vitest.config.js` includes
  `scripts/**/*.test.mjs` alongside `src/**/*.test.{ts,tsx}`.
- `.env.test` (committed, fake values only) supplies the `VITE_*` keys the suite needs —
  real secrets stay in the gitignored `.env`, and the suite passes without one.
- TypeScript checks run via `npm run typecheck` (`tsconfig.json`: `strict` + the modern
  strictness flags, `allowJs` off — `src` is `.ts`/`.tsx` only).
- CI runs `npm run lint`, `npm test`, and `npm run typecheck`.

## Source layout

```
src/
├── services/     All Supabase + backend calls (nothing calls supabase.auth/from/storage outside here):
│                 supabaseClient, signedUrlCache, auth, profile, listings, geocode, transactions,
│                 reviews, messaging, forum, farmerProfile, credentials, chatbot
├── context/      AuthProvider, ToastProvider, MessagingProvider (+ their context/hook modules)
├── hooks/        Listings (useListings, usePostListing, useListingDetail, useListingConversations,
│                 useListingTransaction, useMyListings, useMyPurchases), profile (useProfile,
│                 useAvatar, useReviewForm, useMyReviewedTransactionIds, useUserRating,
│                 useUserReviews), messaging (useConversations, useConversation,
│                 useStartConversation, useConversationListing, useUnreadMessageCount),
│                 forum (useForumPosts, useForumPost, useForumComments, useForumPostEditor,
│                 useForumCategoryCounts), verification (useFarmerProfile, useFarmerDetails,
│                 useVerificationRecords)
├── components/   Modal, AuthModal, AuthToasts, ProfileNudgeModal, Toast, Button, Icon,
│                 DataTable, chat/ChatWidget, marketplace/*, forum/*, messages/*,
│                 profile/* (account, history, reviews, verification sections), site/*
├── pages/        Home (marketing), MarketplacePage, ForumPage, MessagesPage, ProfilePage,
│                 FarmerProfilePage, NotFoundPage, RouteErrorPage
├── data/         media.ts (hero video URL), paddySlides.ts (landing slides)
├── types/        database.ts (generated Supabase types), api.ts (backend contracts), domain.ts
└── utils/        validation patterns, image compression, formatting, auth URL hints, PH phone
                  normalization, profile-tab ids, history table config, forum vocabulary/
                  validation/events, listing validation/events, verification vocabulary/
                  validation, rice varieties, message suggestions, review events, badwords
scripts/          scanSheetPdf.mjs (pdf-lib renderer), generateScanSheet.mjs (predev/prebuild),
                  __tests__/scanSheetPdf.test.mjs
```

### Types

`src/types/database.ts` is generated from the live Supabase schema and committed —
CI has no credentials, and both apps keep an identical copy
(`mobile/src/types/database.ts`). Regenerate after applying a `schemas/*.sql`
migration:

```bash
npx supabase@2.117.0 login   # once
npx supabase@2.117.0 gen types typescript --project-id <project-ref> --schema public > src/types/database.ts
```

The project ref is the `<ref>` in `VITE_SUPABASE_URL` (`https://<ref>.supabase.co`).
Copy the regenerated file to the mobile app to keep them in sync. `src/types/api.ts`
is hand-written from the backend Pydantic models (`backend/app/models/`) and is not
generated.

## Routing

`createBrowserRouter` (react-router v7, object API) maps:

| Path | Component | Notes |
|---|---|---|
| `/` | `Home` | Marketing page |
| `/marketplace` | `MarketplacePage` | Browse + post |
| `/forum` | `ForumPage` | Community feed + thread |
| `/messages` · `/messages/:conversationId` | `MessagesPage` | Auth-gated marketplace inbox + thread |
| `/profile` | `ProfilePage` | Auth-gated; sign-in pitch when signed out. Tabs via `?tab=account\|farmer\|listings\|purchases` |
| `/farmers/:userId` | `FarmerProfilePage` | Signed-in farmer profile wall (certificates, endorsements); sign-in pitch when signed out |
| `*` | `NotFoundPage` | Full-page 404 with navigation actions |
| root `errorElement` | `RouteErrorPage` | Full-page route-error fallback with reload |

There is no shared layout route: each page renders its own `PrimaryNav` +
`<main>` + `Footer`. `NotFoundPage` / `RouteErrorPage` render bare
`FullPageMessage`s. Mounted globally in `App.tsx` outside the router (so they
survive route errors and appear on every page): `AuthModal`, `AuthToasts`,
`ProfileNudgeModal`, and `ChatWidget`. `AuthProvider` and `MessagingProvider`
wrap the router; `MessagingProvider` owns the inbox Realtime subscription and
the unread badge total. `ProfileNudgeModal` fires once per account after
signup / email verification and deep-links to `/profile?tab=farmer`.

> **Known stub.** The navbar's "Analysis" link points to
> `/rice-husk-analysis`, which has no registered route yet — navigating there
> lands on `NotFoundPage`. The entry exists for a planned future phase.

## Features

### Palay Assistant (floating chat)

A signed-in-only assistant widget (`components/chat/ChatWidget.tsx` +
`services/chatbot.ts`) mounted once in `App.tsx`, so it floats above every
route:

- Fixed primary launcher button bottom-right; signed-out taps open the auth
  modal in Login mode instead of the panel (the aria label says "Sign in
  required"). The panel is `isOpen && user !== null`, owned by the
  conversation user id captured at open time.
- Header ("PalaySigla Assistant" / "Palay & bigas lang ang sinasagot") with a
  clear-history button that needs a second confirm tap (auto-resets after
  4 s). Empty state shows a Tagalog welcome bubble and three suggested
  question chips.
- Sends the bounded history (last 20 turns, ≤ 2000 chars each, mirroring the
  server caps) as `POST {VITE_API_URL}/api/chat` with the caller's Supabase
  access token; replies are plain text rendered in `whitespace-pre-wrap`
  bubbles.
- Failures keep the user's message visible with an inline error banner and a
  "Try again" button that resubmits from the failed turn. Typing indicator
  while awaiting a reply; Escape closes; focus returns to the launcher.
- History persists per user in `localStorage` under `palaysigla:chat:<id>`;
  reads/writes are best-effort and validated on read. Storage keys are
  per-user, so an account switch never exposes the previous user's chat.

### Auth (modal)

- Login / register / forgot-password in one `AuthModal`; register collects
  name + email + password and requires email confirmation.
- `AuthProvider` subscribes to `supabase.auth.onAuthStateChange`; the signed-in
  nav area shows an avatar chip (photo or initials monogram) + name linking to
  `/profile`, beside an outline "Sign out" button (with an inline error slot).
  Signed out, it shows "Login" and "Get started" buttons that open the modal.
- Toast notifications on logged in / logged out / email verified / reset sent.

### Home (marketing)

`/` composes `HeroCarousel` (background `rice_field.mp4` video from
`data/media.ts`), `OutputMockup`, `FeatureGrid`, `HowItWorks`,
`AudienceSection`, and `CtaStrip` inside `PrimaryNav`/`Footer`. The sample-scan
mockup carries a "Scanning a paper record?" card with a `{component.button-outline}`
**Download the scan sheet** action (`/palaysigla-scan-sheet.pdf`, rendered at
build time from the shared spec) so farmers can print the form before
capturing it in the mobile app. Note:
`data/media.ts` hardcodes a public Supabase storage URL for the hero video —
a known deviation from the project's no-hardcoded-URLs / private-buckets
rules, flagged here because docs describe what exists. The navbar's "More"
dropdown anchors to the on-page `#features` / `#how-it-works` / `#audience` /
`#cta` sections.

### Marketplace

- **Browse:** `/marketplace` — category pills, debounced search, sort
  (newest / price asc / price desc), 12-per-page load-more, detail modal.
- **Post:** 3-step wizard (details → photo → location). Photo is validated
  (JPEG/PNG ≤ 10 MB) and re-encoded client-side (strips EXIF/GPS); location
  uses a Leaflet map with Nominatim search routed through the backend.
- **Detail:** max-w-4xl dialog — photo + listing info on top, then a
  full-width read-only Leaflet map of the seller's pinned location
  (scroll-zoom disabled) with an "Open in OpenStreetMap" link, an address +
  decimal-coordinates strip, and the seller / posted line; tall dialogs
  scroll internally.
- **Owner actions:** reserve for a buyer, mark sold to a buyer (chosen from the
  listing's conversations), release a reservation, and remove (soft delete,
  inline confirm). Reserved listings stay in the feed with a badge; a sold
  listing is terminal.
- **Messaging:** the signed-in-owner check hides a "Message seller" action on
  someone else's listing; it opens (or reuses) the listing-scoped thread and
  routes to `/messages/:conversationId`. The Inbox nav link carries a live
  unread badge.
- Everything goes through `services/listings.ts` and `services/geocode.ts`.

### Community forum

- **Feed:** `/forum` — a content-first single-column feed of hairline
  discussion cards (author line, category tag, title, excerpt, 4:3 first
  photo, heart + comment actions). A sticky toolbar carries the debounced
  search, a category dropdown (All + the seven categories with counts from
  `forum_category_counts()`), and an auth-gated "Start a discussion" CTA.
  10 posts per page with load-more; filter/search changes remount the keyed
  feed and reset pagination.
- **Thread:** `ForumThreadModal` — the post (title, body, 4:3 photos, heart,
  owner Edit/Delete via the inline two-tap confirm) over an oldest-first
  comment list with load-more and a composer. Signed-out actions open the
  auth modal.
- **Editor:** `PostEditorModal` — title, category pills, body, and up to four
  photos through `ForumImageUploader`; create-then-upload rolls back on
  failure, edits update in place.
- **Hearts:** `HeartButton` is optimistic (±1, clamped) with rollback and an
  inline error, on posts and comments.
- **Moderation:** title, body, and comment text pass a client-side whole-word
  badword filter (English + Filipino/Tagalog). Mutations broadcast on
  `utils/forumEvents.ts`, so the feed and counts refresh behind the thread.
- Everything goes through `services/forum.ts`; photos live in the private
  `forum` bucket and are served via signed URLs only while the parent post is
  visible.

### Messaging

- **`/messages`** — inbox of the signed-in user's listing conversations
  (unread badges, last-message preview, load-more); `/messages/:conversationId`
  opens a thread. Desktop is a two-pane inbox + thread, each pane a hairline
  `canvas` panel with the scoped `shadow-panel` lift; the inbox is a divided
  list (borderless rows, active row = `surface-soft` + 2px `primary` left bar)
  rather than stacked cards. Mobile is single-pane with a back affordance.
  Signed-out visitors get a sign-in pitch.
- **`services/messaging.ts`** — `fetchConversations`, `getOrCreateConversation`,
  `fetchMessages`, `sendMessage`, `markConversationRead`, `fetchUnreadCounts`,
  plus `subscribeToInbox` / `subscribeToConversation` Realtime helpers.
- **Hooks** — `useConversations`, `useConversation` (pagination, optimistic
  send with server-echo dedupe, read watermark), `useStartConversation`,
  `useConversationListing` (per-thread listing snapshot + live enrich), and
  `useUnreadMessageCount`.
- **Product context** — each thread pins the slim
  `components/messages/ListingContextBar.tsx` under the header (40px thumbnail,
  title, price/unit, category pill, chevron), derived from the conversation
  and degrading to the snapshotted title plus a "no longer available" line when
  the listing is gone.
- **Starter questions** — an empty buyer-side thread shows
  `components/messages/MessageSuggestions.tsx` ("Is this still available?",
  "Is this negotiable?", "What's your best price?", "Can I pick it up?"); tapping
  one sends it as the first message, and the chips disappear once the thread
  has any message. Sellers keep the generic empty prompt.
- **Provider** — `MessagingProvider` owns the single inbox subscription and
  exposes the unread total + an inbox refresh nonce; it reconciles on window
  focus and tears down on sign-out.

### Profile

- **`/profile`** — signed-out visitors get a sign-in pitch panel; signed-in
  users manage their photo, display name, PH contact number, marketplace
  history, reviews, and farmer credentials.
- **Header:** a compact hairline band (eyebrow + title, no lead copy) with the
  tab pills right-aligned on desktop; `/profile` (Account),
  `/profile?tab=farmer` (Farmer profile), `/profile?tab=listings` (Selling
  history), and `/profile?tab=purchases` (Purchases); signed-out visitors see
  no tabs.
- **Account tab:** a horizontal identity band (avatar, name/email/member-since,
  rating stat, photo actions) above a `minmax(0,1fr) + 360px` desktop grid —
  `ProfileDetailsForm` (name + phone side by side, dirty-state cue) and
  `ReviewsCard` (aggregate stars, five-row star distribution, received
  reviews).
- **Farmer profile tab:** the verification-status card (with a "View my public
  profile" action) above `FarmerDetailsForm` (barangay / municipality /
  province, farm size, years, `VarietyMultiSelect` with a free-text "Other")
  and the credential taxonomies — `RsbsaSection`, `CredentialsSection`,
  `AffiliationSection`, `EndorsementSection` — each a hairline panel with its
  own add toggle, `DocumentUploadField`, per-row 64 px thumbnail, inline
  errors, and a verified-lock notice. See
  [Farmer profile wall and verification](#farmer-profile-wall-and-verification).
- **Selling history:** a server-paged/sorted history table (TanStack Table v9
  with manual sorting + pagination) filtered All / Active / Reserved / Sold /
  Deleted — Listing (thumbnail + title + category), status chip, price, listed
  date, transaction line ("Reserved for …" / "Sold to …"), and action. Sold
  rows expose the stateful **Leave a review** → **Reviewed** control;
  active/reserved rows open the marketplace detail modal (row click or a
  `Manage` button), and deleted rows are read-only. Backed by
  `services/listings.ts#fetchMyListings` (which embeds the listing's live
  `transactions` row), `hooks/useMyListings.ts`, and
  `components/profile/SellingHistoryPanel.tsx`.
- **Purchases:** the signed-in buyer's durable `transactions`
  (`services/transactions.ts#fetchMyPurchases`, `hooks/useMyPurchases.ts`,
  `components/profile/PurchasesPanel.tsx`) rendered in the same history table —
  listing, seller, status chip, price, and resolved date, with the same review
  action. Participant RLS keeps them reachable after the listing leaves the
  feed or is removed.
- **Reviews:** mutual, public ratings anchored to a sold transaction
  (`services/reviews.ts`, `010_reviews.sql`). Web opens
  `components/profile/ReviewFormModal.tsx` from a Purchases row, a sold
  Selling-history row, or the conversation thread; the profile `ReviewsCard`
  shows the star distribution plus received reviews, and a listing detail
  shows the seller's aggregate + recent reviews. `user_rating(user_id)`
  supplies the public aggregate.
- Avatar: JPEG/PNG ≤ 10 MB, compressed client-side to ≤ 512 px (EXIF
  stripped), staged until one Save commits photo + fields together; stored in
  the private `avatars` bucket at `{user_id}/avatar.jpg` and served via
  cached signed URLs. Name edits sync to `user_metadata` so the nav chip and
  mobile stay consistent.
- Contact number accepts `09…`, `+63…`, and `63…` forms with any separator
  style and is normalized to E.164 (`+63`) — validated client-side and
  constrained by a DB `CHECK` (`^\+63[0-9]{10}$`).
- The signed-in navbar chip shows the avatar (32 px desktop / 40 px drawer,
  initials monogram fallback) beside the name and links to `/profile`; the
  URL is fetched via `services/profile.ts#getOwnAvatarUrl` (~60 s per-user
  cache) through `hooks/useAvatar.ts`.
- Everything goes through `services/profile.ts`.

### Farmer profile wall and verification

- **`/farmers/:userId`** — the signed-in wall
  (`pages/FarmerProfilePage.tsx`): identity card (80 px avatar, name,
  location, member-since, verification badge), the Farming information card
  (farm size, years, variety chips), and the three public certificate cards
  — **Official government registrations** (RSBSA Control Number Stub, RMN
  Seal), **Certifications and accreditations** (BPI Seed Grower, PhilGAP,
  SRP, Other), and **Local government and cooperative endorsements**
  (Barangay Agricultural Certification / Cooperative Recognition plus
  memberships). Rows are led by a 64 px `CertificateThumbnail` that opens the
  shared `DocumentPreviewModal`; empty sections show "Nothing published
  yet". Content is **not** gated on verification; sensitive identifiers
  (typed RSBSA number, membership IDs, phone) never render. Signed-out
  visitors get a sign-in pitch; an unknown user gets the neutral not-found
  copy. The marketplace `ListingDetailModal` seller card links here.
- **Read path:** `services/farmerProfile.ts` calls the four
  `SECURITY DEFINER` RPCs (`farmer_profile`, `farmer_credentials`,
  `farmer_affiliations`, `farmer_endorsements`) with the caller's session;
  `hooks/useFarmerProfile.ts` orchestrates the wall load, and certificate
  thumbnails sign through `services/credentials.ts` +
  `services/signedUrlCache.ts`.
- **Owner writes:** `services/credentials.ts` (create/delete credential,
  affiliation, and endorsement; RSBSA save; uploads to the private
  `credentials` bucket) driven by `hooks/useVerificationRecords.ts` and
  `hooks/useFarmerDetails.ts`. The shared `Ratings & reviews` card is bound
  to the wall user id.
- **Nudge:** `ProfileNudgeModal` fires once per account after signup or email
  verification (event from `AuthModal` / `AuthToasts`), dismisses per user in
  `localStorage` (`utils/profileNudge.ts`), and deep-links to
  `/profile?tab=farmer`.

## Conventions

Coding rules live in `AGENTS.md` (read it before editing). Design tokens and
component treatments live in `DESIGN.md` — no ad-hoc colors/spacing. Any
visual change ships with its `DESIGN.md` update.

Relative imports of TypeScript modules are extensionless — no `.js`/`.jsx`
specifiers: Vite, `tsc`, and Vitest resolve them directly.
