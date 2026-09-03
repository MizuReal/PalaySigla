# Mobile (React Native)

Expo SDK 57 (managed workflow) + React Navigation v7 + plain JavaScript —
no TypeScript. Ships the **light-only landing screen**, the tab shell, and
the **marketplace browse feed**; auth, posting, scanning, and community
flows arrive in later phases.

## Requirements

- Node >= 22
- Expo Go on a device, or an Android emulator / iOS Simulator (macOS only)

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # then fill in the values
npx expo start         # press a / i, or scan the QR code with Expo Go
```

### Environment variables

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (Project Settings → API) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon public** key — never the service-role key |
| `EXPO_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:8000`) — for future API calls |

`.env` is gitignored; `.env.example` documents every key with empty values.
Only `EXPO_PUBLIC_*` variables reach client code.

## Scripts

| Command | What |
|---|---|
| `npm run start` | Start the Expo dev server |
| `npm run android` | Start and open on Android emulator |
| `npm run ios` | Start and open on iOS Simulator (macOS) |
| `npm run web` | Start in a web browser |
| `npm run lint` | ESLint (expo flat config, react-hooks included) |

## Source layout

```
src/
├── theme/designTokens.js   All DESIGN.md tokens (colors, type scale, spacing, radius) — the only place raw values appear
├── components/             BrandBar, Section, SectionHeader, Icon (react-native-svg port of the web icon set),
│   │                       Button, FeatureNotice, TabScreen, AppTabBar (custom bottom tab bar), Photo
│   ├── marketplace/        ListingCard, ListingCardSkeleton, ListingFilters, ListingFeed (marketplace browse UI)
│   └── landing/            LandingHero (carousel), SampleScan, FeatureGrid, HowItWorks, AudienceSection, LandingFooter
├── screens/                LandingScreen (intro), MainTabs, Marketplace (feed), ListingDetail (root-stack push),
│   │                       Community/Scan/Settings tab screens
├── services/               supabaseClient (AsyncStorage session persistence) + listings (Supabase marketplace queries)
├── hooks/                  useListings (paginated feed), useListingDetail, useListingImageUrl, usePulseOpacity
├── utils/                  format.js — listing label maps, PHP price + relative-time formatters
└── data/                   paddySlides.js — landing slide content, mirrored from website/src/data
```

## Features

### Marketplace browse (current)

The **Marketplace** tab is the live, anonymous browse surface (data reads
ride the anon key + RLS, which allows selecting non-deleted listings):

- Fixed `surface-soft` filter toolbar: debounced (350 ms) search across
  title/location, horizontally scrollable category pill-tabs, and a
  three-way sort (newest / price ascending / price descending).
- Paged feed of `listing-card`s (photo, category chip, price + unit,
  pin + location + posted time) with pull-to-refresh, on-end infinite
  scroll, pulsing skeleton loading, and error/empty states with retry.
- Feed remounts on any filter change (keyed), resetting to page 1 — the
  same pattern the web page uses.
- Tapping a listing pushes **ListingDetail** on the root stack above the
  tab bar: eager 4:3 photo, category badge + "Sold" chip, title, price +
  unit, optional quantity and description, and the seller block with the
  map-pinned location label and posted time.
- **Posting and owner management are deliberately absent** — they require
  sign-in (RLS insert/update), which ships with the mobile auth phase. The
  "Post a listing" CTA states this honestly instead of opening a dead form.

### Intro + tab shell

- App opens on the **Landing intro** (the full landing content from the
  previous phase); its "Get started" button enters the tab shell (`Main`).
- **Bottom tab bar** (custom, token-driven): Marketplace · Community · Scan ·
  Settings as routes, plus a Logout action cell. Canvas bar, hairline top
  rule, no elevation; active tab = `{colors.primary}` icon + small green
  square indicator + micro label; inactive = `{colors.stone}` icon.
- **Scan** renders as the signature raised `{colors.primary}` square with a
  black camera glyph, overlapping the bar's top edge.
- **Logout never navigates** — it confirms via a native alert, then resets
  the root stack to the Landing intro (the signed-out state until auth
  exists; a session `signOut` call slots into the same handler later).
- Tab content is honest, designed placeholder panels (`FeatureNotice`):
  each states what the phase will bring — no fake data, no dead controls.
  Marketplace is now live; community, scanning, and account flows replace
  the remaining panels phase by phase.
- Landing CTA buttons, nav auth links, and the early-access form stay absent:
  they belong to flows that are still not built.

## Conventions

- Coding rules live in `AGENTS.md` (read it before editing). Design tokens
  and component treatments live in `DESIGN.md` — no ad-hoc colors/spacing;
  mobile renders them through `src/theme/designTokens.js`.
- Inter 400/700 stands in for the proprietary NVIDIA-EMEA face (the pairing
  DESIGN.md documents); fonts load once in `App.js`.
- No component may reach for `supabase` directly — every call goes through
  `src/services/` once features exist.
