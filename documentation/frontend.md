# Website (Frontend)

React 19 + Vite + Tailwind CSS v4 + react-router v7. TypeScript (`strict`),
migrating from JavaScript phase by phase.

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

## Testing

Vitest + jsdom + React Testing Library, configured in `vitest.config.js`.

- Characterization tests live in `src/**/__tests__/` beside the code they cover and
  exercise the data layer: `services/` (Supabase and `fetch` mocked), `utils/`, and the
  listing hooks.
- `src/test/supabaseMock.ts` provides the chainable Supabase client, query-builder, and
  storage-bucket doubles used by the service tests.
- `.env.test` (committed, fake values only) supplies the `VITE_*` keys the suite needs —
  real secrets stay in the gitignored `.env`, and the suite passes without one.
- TypeScript checks run via `npm run typecheck` (`tsconfig.json`: `strict` + the modern
  strictness flags, `allowJs` off — `src` is `.ts`/`.tsx` only).
- CI runs `npm run lint`, `npm test`, and `npm run typecheck`.

## Source layout

```
src/
├── services/     All Supabase + backend calls (nothing calls supabase.auth/from/storage outside here)
├── context/      AuthProvider, ToastProvider (+ their context/hook modules)
├── hooks/        useListings, usePostListing, useListingDetail, useProfile, useAvatar
├── components/   Modal, AuthModal, AuthToasts, Toast, Button, Icon, chat/ChatWidget,
│                 marketplace/*, profile/*, site/* (nav, footer, landing sections, error pages)
├── pages/        Home (marketing), MarketplacePage, ProfilePage, NotFoundPage, RouteErrorPage
├── data/         media.ts (hero video URL), paddySlides.ts (landing slides)
├── types/        database.ts (generated Supabase types) + api.ts (backend contracts)
└── utils/        validation patterns, image compression, formatting, auth URL hints
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
| `/profile` | `ProfilePage` | Auth-gated; sign-in pitch when signed out |
| `*` | `NotFoundPage` | Full-page 404 with navigation actions |
| root `errorElement` | `RouteErrorPage` | Full-page route-error fallback with reload |

There is no shared layout route: each page renders its own `PrimaryNav` +
`<main>` + `Footer`. `NotFoundPage` / `RouteErrorPage` render bare
`FullPageMessage`s. Mounted globally in `App.tsx` outside the router (so they
survive route errors and appear on every page): `AuthModal`, `AuthToasts`,
and `ChatWidget`.

> **Known stub.** The navbar's "Rice Husk Analysis" link points to
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
`AudienceSection`, and `CtaStrip` inside `PrimaryNav`/`Footer`. Note:
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
- **Owner actions:** mark as sold, remove (soft delete, inline confirm).
- Everything goes through `services/listings.ts` and `services/geocode.ts`.

### Profile

- **`/profile`** — signed-out visitors get a sign-in pitch panel; signed-in
  users manage their photo, display name, and PH contact number.
- **Tabs:** `/profile` (Account) and `/profile?tab=listings` (Selling
  history); signed-out visitors see no tabs.
- **Selling history:** the signed-in seller's listings filtered All / Active /
  Sold / Deleted — thumbnail, title, price + unit, status chip (Active /
  Sold / Deleted), and a category + listed / sold (`sold_at`) / deleted
  (`deleted_at`) date line. Active and sold rows reopen the marketplace
  detail modal (owner actions refresh the list); deleted rows are read-only.
  Backed by `services/listings.ts#fetchMyListings`,
  `hooks/useMyListings.ts`, and `components/profile/SellingHistoryPanel.tsx`.
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
- Ratings & reviews is a schema-backed placeholder: `rating_avg` /
  `rating_count` on `profiles` render an empty state until a future reviews
  table populates them.
- Everything goes through `services/profile.ts`.

## Conventions

Coding rules live in `AGENTS.md` (read it before editing). Design tokens and
component treatments live in `DESIGN.md` — no ad-hoc colors/spacing. Any
visual change ships with its `DESIGN.md` update.

Explicit `.js`/`.jsx` import specifiers may stay in place as files convert:
Vite and `tsc` map them to the corresponding `.ts`/`.tsx` modules.
