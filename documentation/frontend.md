# Website (Frontend)

React 19 + Vite + Tailwind CSS v4 + react-router v7. Plain JavaScript — no
TypeScript.

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
| `VITE_API_URL` | Backend base URL (e.g. `http://localhost:8000`) — used by the geocoding proxy client |

`.env` is gitignored; `.env.example` documents every key with empty values.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint (react-hooks rules included) |

## Source layout

```
src/
├── services/     All Supabase + backend calls (nothing calls supabase.auth/from/storage outside here)
├── context/      AuthProvider, ToastProvider (+ their context/hook modules)
├── hooks/        useListings, usePostListing, useListingDetail
├── components/   Modal, AuthModal, AuthToasts, Toast, Button, Icon, marketplace/*
├── pages/        Home (marketing), MarketplacePage
└── utils/        validation patterns, image compression, formatting, auth URL hints
```

## Features

### Auth (modal)

- Login / register / forgot-password in one `AuthModal`; register collects
  name + email + password and requires email confirmation.
- `AuthProvider` subscribes to `supabase.auth.onAuthStateChange`; the signed-in
  state shows a name chip + sign-out in the nav.
- Toast notifications on logged in / logged out / email verified / reset sent.

### Marketplace

- **Browse:** `/marketplace` — category pills, debounced search, sort
  (newest / price asc / price desc), 12-per-page load-more, detail modal.
- **Post:** 3-step wizard (details → photo → location). Photo is validated
  (JPEG/PNG ≤ 10 MB) and re-encoded client-side (strips EXIF/GPS); location
  uses a Leaflet map with Nominatim search routed through the backend.
- **Owner actions:** mark as sold, remove (soft delete, inline confirm).
- Everything goes through `services/listings.js` and `services/geocode.js`.

## Conventions

Coding rules live in `AGENTS.md` (read it before editing). Design tokens and
component treatments live in `DESIGN.md` — no ad-hoc colors/spacing. Any
visual change ships with its `DESIGN.md` update.
