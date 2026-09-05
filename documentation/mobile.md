# Mobile (React Native)

Expo SDK 57 (managed workflow) + React Navigation v7 + plain JavaScript —
no TypeScript. Ships the **light-only landing screen**, the tab shell, the
**marketplace browse feed**, and **full email/password auth** (login /
register / forgot password with in-app email-link returns); posting,
scanning, and community flows arrive in later phases.

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
| `EXPO_PUBLIC_AUTH_REDIRECT_URL` | Optional fixed target for verification / password-reset email links. **Leave empty** so links return to the app's own deep link (`palaysigla://auth/callback`, `Linking.createURL` at runtime). See the ACTION REQUIRED marker in `setup-supabase.md` |
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
├── services/               supabaseClient (AsyncStorage session persistence), auth
│   │                       (sign-in/up/out, reset, deep-link hand-off), chatbot, listings
├── hooks/                  useListings (paginated feed), useListingDetail, useListingImageUrl, usePulseOpacity
├── utils/                  format.js — listing label maps, PHP price + relative-time formatters;
│   │                       validation.js — NAME/EMAIL_PATTERN ports; userProfile.js — display-name
│   │                       resolution; authUrlHint.js — auth return-URL builder/parser
└── data/                   paddySlides.js — landing slide content, mirrored from website/src/data
```

## Features

### Marketplace browse (current)

The **Marketplace** tab is the live, anonymous browse surface (data reads
ride the anon key + RLS, which allows selecting non-deleted listings):

- Fixed `surface-soft` filter toolbar: the debounced (350 ms) search across
  title/location stays always visible with an inline Filters chip that
  expands/collapses the rest of the toolbar — horizontally scrollable
  category pill-tabs and the three-way sort (newest / price ascending /
  price descending). Collapsed by default; a primary dot on the chip signals
  an active filter while the region is closed.
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

### Sign-in & accounts (auth phase)

Accounts are created **in the app** (full parity with the website auth
dialog) — email confirmation is enforced, and both confirmation and
password-reset links return into the app via its URL scheme:

- **Entry points.** The chat launcher opens the auth dialog in Login mode
  with a *chat intent* (successful sign-in lands in the chat sheet); the
  Settings tab offers Sign in / Create an account when signed out and shows
  the account summary (name + email) when signed in. The tab bar's fifth
  cell mirrors the session state — **Login** while signed out (opens the
  auth dialog in Login mode, no intent) and **Logout** while signed in —
  and Logout performs a real `signOut()` and resets to the Landing intro.
- **Dialog views.** Login (email + password + Forgot password?), Register
  (full name + email + password → `user_metadata.full_name`), and Forgot
  password, plus the two email-link return panels: "Email verified" and the
  in-app "set a new password" form. Sent states use anti-enumeration copy
  ("If … belongs to an account…") exactly like the website.
- **Validation / sanitation.** Regexes and constants are shared ports of the
  website's (`utils/validation.js`, `PASSWORD_MIN_LENGTH = 8` /
  `PASSWORD_MAX_LENGTH = 72`). Blur errors surface only after a field has
  content; change clears them; submit validates everything and focuses the
  first invalid field. Emails are trimmed + lowercased in the service layer;
  passwords are never trimmed. Supabase errors map through the same
  friendly-code table as the web (`services/auth.js`).
- **Email-link returns.** `utils/authUrlHint.js` builds the return URL
  (`Linking.createURL('auth/callback')` unless
  `EXPO_PUBLIC_AUTH_REDIRECT_URL` is set) and parses incoming links;
  `services/auth.js#completeAuthRedirect` hands the session over (PKCE
  `?code=` exchange **or** fragment `#access_token=` restore) and the
  provider opens the dialog in the matching mode. **The Supabase dashboard
  must allow-list the app return URL first** — see the ACTION REQUIRED
  marker in `documentation/setup-supabase.md`. Until then, email links
  resolve in a browser and everything else still works.

### Intro + tab shell

- App opens on the **Landing intro** (the full landing content from the
  previous phase); its "Get started" button enters the tab shell (`Main`).
- **Bottom tab bar** (custom, token-driven): Marketplace · Community · Scan ·
  Settings as routes, plus a fifth session action cell — Login while signed
  out (opens the auth dialog in Login mode) / Logout while signed in — so
  the bar always holds five even cells with Scan centered. Canvas bar,
  hairline top rule, no elevation; active tab = `{colors.primary}` icon +
  small green square indicator + micro label; inactive = `{colors.stone}`
  icon.
- **Scan** renders as the signature raised `{colors.primary}` square with a
  black camera glyph, overlapping the bar's top edge.
- **Login / Logout never navigates** — Login opens the auth dialog; Logout
  confirms via a native alert, performs a real session `signOut()` (closing
  any open overlay first), then resets the root stack to the Landing intro.
- Tab content is honest, designed placeholder panels (`FeatureNotice`):
  each states what the phase will bring — no fake data, no dead controls.
  Marketplace and Settings (account) are now live; community and scanning
  flows replace the remaining panels phase by phase.
- Landing CTA buttons, nav auth links, and the early-access form stay absent:
  sign-in lives behind the assistant launcher and the Settings tab.

## Conventions

- Coding rules live in `AGENTS.md` (read it before editing). Design tokens
  and component treatments live in `DESIGN.md` — no ad-hoc colors/spacing;
  mobile renders them through `src/theme/designTokens.js`.
- Inter 400/700 stands in for the proprietary NVIDIA-EMEA face (the pairing
  DESIGN.md documents); fonts load once in `App.js`.
- No component may reach for `supabase` directly — every call goes through
  `src/services/` once features exist.
