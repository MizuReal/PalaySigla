# Mobile (React Native)

Expo SDK 57 (managed workflow) + React Navigation v7 + TypeScript (`strict`),
migrating from JavaScript phase by phase. Ships the **light-only landing screen**, the tab shell, the
**marketplace** — browse feed, 3-step posting wizard (photo + map pin),
listing detail with owner actions (mark sold / remove), and the
**location picker** — **full email/password auth** (login / register /
forgot password with in-app email-link returns), the **Selling history**
profile tab, and the **Palay Assistant chat** (root-level bottom sheet over
the tabs); scanning and community flows arrive in later phases.

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
| `EXPO_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:8000`) — used by the Palay Assistant (`services/chatbot.ts`) and the location picker's geocoding (`services/geocode.ts`); future API calls too |

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
| `npm test` | Jest suite (single run) |
| `npm run test:watch` | Jest in watch mode |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |

## Testing

Jest via the `jest-expo` preset + React Native Testing Library.

- `jest.setup.js` mocks AsyncStorage, sets the React `act` environment, and injects fake
  `EXPO_PUBLIC_*` values — the suite never reads the real `.env`.
- Characterization tests live in `src/**/__tests__/` and cover `services/` (Supabase and
  `fetch` mocked), `utils/`, and the listing hooks. `src/test/supabaseMock.ts` provides the
  Supabase doubles.
- RNTL v14's `render`, `renderHook`, and `act` are **async** — always `await` them.
- TypeScript checks run via `npm run typecheck` (`tsconfig.json` extends
  `expo/tsconfig.base` with `strict` + the modern strictness flags and an explicit
  `allowJs: false` override, so `src` is `.ts`/`.tsx` only; `types/expo-env.d.ts`
  supplies Expo's global typings because the generated `expo-env.d.ts` is gitignored).
- CI runs `npm run lint`, `npm test`, and `npm run typecheck`.

## Source layout

```
src/
├── theme/designTokens.ts   All DESIGN.md tokens (colors, type scale, spacing, radius) — the only place raw values appear
├── components/             BrandBar, Section, SectionHeader, Icon (react-native-svg port of the web icon set),
│   │                       Button, FeatureNotice, TabScreen, AppTabBar (custom bottom tab bar), Photo,
│   │                       AuthModal (multi-view auth dialog)
│   ├── chat/               ChatLauncher (floating button over the tabs), ChatModal (root bottom-sheet overlay)
│   ├── marketplace/        ListingCard, ListingCardSkeleton, ListingFilters, ListingFeed (marketplace browse UI),
│   │                       MapPicker + mapConfig/mapHtml (WebView Leaflet location picker),
│   │                       PostListingImageUploader (camera/library photo step)
│   ├── profile/            SellingHistoryPanel + SellingHistoryRow (profile "Selling history" tab)
│   └── landing/            LandingHero (carousel), SampleScan, FeatureGrid, HowItWorks, AudienceSection, LandingFooter
├── screens/                LandingScreen (intro), MainTabs, Marketplace (feed), ListingDetail (root-stack push),
│   │                       PostListing (3-step wizard), Community/Scan/Settings tab screens
├── services/               supabaseClient (AsyncStorage session persistence), auth
│   │                       (sign-in/up/out, reset, deep-link hand-off), chatbot (sendChatMessage), listings
│   │                       (browse + create/upload/soft-delete/status/my-listings), geocode (place search +
│   │                       reverse geocoding through the backend)
├── hooks/                  useListings (paginated feed), useListingDetail, useListingImageUrl,
│   │                       useImagePicker (camera/library + permissions + compression), usePostListing,
│   │                       useListingActions (mark sold / remove), useMyListings,
│   │                       usePalayAssistant (chat state + history), usePulseOpacity
├── types/                  database.ts (generated Supabase types; copy of the website file) + api.ts (backend contracts)
├── utils/                  format.ts — listing label maps, PHP price, date + relative-time formatters;
│   │                       validation.ts — NAME/EMAIL_PATTERN ports; userProfile.ts — display-name
│   │                       resolution; authUrlHint.ts — auth return-URL builder/parser;
│   │                       image.ts — validate/compress/read photo bytes; listingValidation.ts — wizard
│   │                       step gate; listingEvents.ts — listings-changed broadcast
└── data/                   paddySlides.ts — landing slide content, mirrored from website/src/data
```

### Types

`src/types/database.ts` is a committed copy of the website's generated file (CI has
no credentials). After a `schemas/*.sql` migration, regenerate it in the website
app and copy it here:

```bash
cd website
npx supabase@2.117.0 gen types typescript --project-id <project-ref> --schema public > src/types/database.ts
cp src/types/database.ts ../mobile/src/types/database.ts
```

`src/types/api.ts` is hand-written from the backend Pydantic models.

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
- **Posting and owner management are live.** The "Post a listing" CTA opens
  the auth dialog when signed out (web parity: sign in, then tap again) and
  pushes the posting wizard when signed in; signed-in owners get Mark as
  sold / Remove on the detail screen. Both are described below.

### Location picker (current)

The posting wizard's third step is a self-contained, controlled `MapPicker`
(`components/marketplace/MapPicker.tsx`) — the mobile port of the website's
`MapPicker` and `services/geocode.ts`:

- **Search** runs through the backend's Nominatim proxy
  (`GET /api/geocode/search`) with the web's 2-character minimum and 5-result
  limit; results render as hairline rows and picking one moves the pin and
  flies the map to the pick zoom (15). Empty and failure states are inline
  captions, never silent.
- **Map** is a `react-native-webview` rendering Leaflet 1.9.4 from unpkg over
  OpenStreetMap tiles with the mandatory attribution (AGENTS.md mandates
  WebView Leaflet, not a native map SDK). Tap-to-place and a draggable pin
  post `{type: 'pick', lat, lng}` across the bridge; the native side injects
  `setMarker` back, so a parent position update never reloads the WebView and
  the map document itself is built once.
- **Reverse geocoding** (`GET /api/geocode/reverse`) runs on every position
  change behind a request-id guard; the label reaches the parent through
  `onLocationLabel` and a failure clears it, exactly like the web. No GPS
  action is offered — parity with the web picker, which places the pin by
  search and map only.
- **Presentation** follows the DESIGN.md mobile notes: 44px search field,
  hairline result rows, the 320px `surface-soft`/hairline/2px map frame, the
  web marker geometry in primary/primary-dark, status captions, and a
  "Reload map" affordance when the WebView itself fails.
- The component is fully tested (`MapPicker.test.tsx`, `mapHtml.test.ts`,
  `geocode.test.ts`); the posting wizard mounts it as the third step, where
  the position + label pair feeds the listing form.

### Post a listing (current)

The **Post a listing** CTA in the marketplace hero pushes a full-screen
three-step wizard (`screens/PostListingScreen.tsx`) — the web
`PostListingModal` ported to the root stack:

- **Gate.** Signed out, the CTA opens the auth dialog (Login mode); signing
  in returns the user to the marketplace, where a second tap opens the
  wizard (web parity). The wizard is only reachable signed in.
- **Steps.** Details (title, optional description, ₱ price, unit, category,
  optional quantity) → photo → location. The shared
  `utils/listingValidation.ts` (verbatim web port) gates Continue and
  submit; errors focus the first invalid field and clear as fields change.
- **Photo.** `hooks/useImagePicker.ts` offers "Take photo" (explicit
  `requestCameraPermissionsAsync` with denied / permanently-blocked copy and
  an "Open settings" link) and "Choose from library" (no runtime permission
  needed on SDK 57 pickers). Captures stay at full resolution; `utils/image.ts`
  re-encodes to ≤1600px JPEG 0.82, which strips EXIF/GPS, and the 10 MB cap
  applies to the compressed upload payload. Android's
  `getPendingResultAsync` recovers a capture if the OS killed the app.
- **Submit.** `hooks/usePostListing.ts` creates the listing row, uploads the
  JPEG to the private `listings` bucket at `{user_id}/{listing_id}/0.jpg`,
  and inserts the `listing_images` row; a failed upload rolls the listing
  back with a soft delete. Buttons show a "Posting…" busy state, the header
  back button is held during the upload, and service failures render inline
  (mobile has no toast layer). Success shows a "Listing posted!" panel whose
  one action returns to the marketplace.
- **Refresh.** `utils/listingEvents.ts` broadcasts every mutation; the keyed
  marketplace feed and Selling history subscribe, so a post or owner action
  anywhere refreshes those lists.

### Owner actions (current)

Owners (signed-in `user.id === listing.user_id`) get an action block on
**ListingDetail**: "Mark as sold" while `active`, and "Remove listing" with
the web's inline two-tap confirm (error-bordered panel, "Yes, remove it" /
Cancel). Actions show busy labels, surface failures inline, and leave the
screen on success; the mutation event refreshes the marketplace feed and
Selling history. Deleted rows stay owner-visible under the schema-003 RLS
policy and remain in Selling history.

### Selling history (current)

Signed-in **Settings** is the profile surface: an Account / Selling history
pair of pill tabs. Selling history uses `hooks/useMyListings.ts` (12/page,
load more) against `fetchMyListings` with All / Active / Sold / Deleted
filters; rows show a 96px 4:3 signed-URL thumbnail, title + status chip,
price + unit, and a category / Listed · Sold · Deleted date line. Deleted
rows are read-only; active and sold rows push **ListingDetail** for owner
actions, and the list reloads through the listings-changed event.

### Palay Assistant (current)

The same backend assistant as the website (`POST /api/chat`, Groq model,
server-side JWT check), with mobile-specific presentation:

- **Launcher.** A floating 48 px primary square (`ChatLauncher.tsx`) sits
  above the custom tab bar on all four tabs — it is rendered by the
  `MainTabs` shell, not per-screen, and does not exist on the Landing intro.
  Taps while `isInitializing` (cold-start session restore) are ignored so a
  restore never misroutes to sign-in.
- **Sheet.** `ChatModal` is a root-level native `Modal` bottom sheet mounted
  once in `App.tsx` beside `AuthModal` — above the tab bar and the
  `ListingDetail` push, closed by the backdrop or the X. Sheet height clamps
  to 320–512 px and the composer rides the keyboard (manual offset on iOS;
  Android resizes via `adjustResize`). Tapping the message list never
  dismisses the keyboard (`keyboardShouldPersistTaps="handled"`).
- **Conversation.** Mirrors the web widget: Tagalog welcome bubble + three
  suggested-question chips on empty history, plain-text bubbles (user
  right / assistant left), pulsing typing indicator with an accessibility
  alert, error banner with "Try again" (resubmits from the failed turn),
  header clear-history button needing a second confirm tap within 4 s, input
  capped at 2000 chars, history trimmed to the newest 20 turns.
- **Auth gate & intent.** Signed out, the launcher opens the auth dialog in
  Login mode with a `chatIntent`; a successful sign-in closes the dialog and
  opens the chat sheet automatically (the intent is cleared if the dialog is
  dismissed). Signed in, history loads from AsyncStorage keyed
  `palaysigla:chat:<user_id>`; the sheet re-renders per user id, so an
  account switch never shows a previous owner's conversation. `signOut()`
  closes the sheet first.
- **Sending.** `services/chatbot.ts#sendChatMessage` reads the Supabase
  session token and POSTs `{ messages }` to
  `{EXPO_PUBLIC_API_URL}/api/chat`. Failure keeps the user's message visible
  with a friendly error; replies are plain text (no markdown rendering).
- History is device- and account-local (AsyncStorage) — it does not sync to
  the website, which keeps its own localStorage copy.

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
  website's (`utils/validation.ts`, `PASSWORD_MIN_LENGTH = 8` /
  `PASSWORD_MAX_LENGTH = 72`). Blur errors surface only after a field has
  content; change clears them; submit validates everything and focuses the
  first invalid field. Emails are trimmed + lowercased in the service layer;
  passwords are never trimmed. Supabase errors map through the same
  friendly-code table as the web (`services/auth.ts`).
- **Email-link returns.** `utils/authUrlHint.ts` builds the return URL
  (`Linking.createURL('auth/callback')` unless
  `EXPO_PUBLIC_AUTH_REDIRECT_URL` is set) and parses incoming links;
  `services/auth.ts#completeAuthRedirect` hands the session over (PKCE
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
  Marketplace (browse + posting + owner actions) and Settings (account +
  Selling history) are live; community and scanning flows replace the
  remaining panels phase by phase. The assistant launcher floats over all
  tabs and the auth dialog overlays everything when open.
- Landing CTA buttons, nav auth links, and the early-access form stay absent:
  sign-in lives behind the assistant launcher and the Settings tab.

## Conventions

- Coding rules live in `AGENTS.md` (read it before editing). Design tokens
  and component treatments live in `DESIGN.md` — no ad-hoc colors/spacing;
  mobile renders them through `src/theme/designTokens.ts`.
- Inter 400/700 stands in for the proprietary NVIDIA-EMEA face (the pairing
  DESIGN.md documents); fonts load once in `App.tsx`.
- No component may reach for `supabase` directly — every call goes through
  `src/services/` once features exist.
- Relative imports of TypeScript modules are extensionless — Jest and Metro do not
  map `.js` specifiers to `.ts`/`.tsx` files (same rule on the website).
