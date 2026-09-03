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
├── components/             BrandBar, Section, SectionHeader, Icon (react-native-svg port of the web icon set)
│   └── landing/            LandingHero (carousel), SampleScan, FeatureGrid, HowItWorks, AudienceSection, LandingFooter
├── screens/                LandingScreen (the only screen today)
├── services/               supabaseClient (AsyncStorage session persistence) — used once auth lands
└── data/                   paddySlides.js — landing slide content, mirrored from website/src/data
```

## Features

### Landing (current)

- Light-only surface rhythm (canvas/soft bands, hairline borders) per the
  DESIGN.md implementation deviations — no dark chrome, no corner squares.
- Hero headline + auto-advancing paddy-photo carousel (4:3 photos, chips,
  dot indicators, 44px chevron buttons, Wikimedia Commons content credited in
  fine print).
- Sample-scan readout card (four static result rows with confidence bars),
  feature grid, three how-it-works steps, audience benefit cards, and a
  brand footer.
- CTA buttons, nav auth links, and the early-access form are intentionally
  absent: they would link to flows that do not exist yet.

## Conventions

- Coding rules live in `AGENTS.md` (read it before editing). Design tokens
  and component treatments live in `DESIGN.md` — no ad-hoc colors/spacing;
  mobile renders them through `src/theme/designTokens.js`.
- Inter 400/700 stands in for the proprietary NVIDIA-EMEA face (the pairing
  DESIGN.md documents); fonts load once in `App.js`.
- No component may reach for `supabase` directly — every call goes through
  `src/services/` once features exist.
