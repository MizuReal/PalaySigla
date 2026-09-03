# Mobile (React Native)

Expo SDK 57 (managed workflow) + React Navigation v7 + plain JavaScript —
no TypeScript. Currently ships the **light-only landing screen**; auth,
scanning, and marketplace flows arrive in later phases.

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
│   │                       Button, FeatureNotice, TabScreen, AppTabBar (custom bottom tab bar)
│   └── landing/            LandingHero (carousel), SampleScan, FeatureGrid, HowItWorks, AudienceSection, LandingFooter
├── screens/                LandingScreen (intro), MainTabs, Marketplace/Community/Scan/Settings tab screens
├── services/               supabaseClient (AsyncStorage session persistence) — used once auth lands
└── data/                   paddySlides.js — landing slide content, mirrored from website/src/data
```

## Features

### Intro + tab shell (current)

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
  Real marketplace data, community, scanning, and account flows replace the
  panels phase by phase.
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
