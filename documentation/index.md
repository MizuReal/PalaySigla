# PalaySigla Documentation

Developer documentation for the PalaySigla platform. Rule files (`AGENTS.md`,
`DESIGN.md`) and database migrations (`schemas/`) are the source of truth for
conventions and schema; these docs describe what exists, how it fits together,
and how to run it.

## Where to start

| If you want to… | Read |
|---|---|
| Understand the system end to end | [architecture.md](architecture.md) |
| Run the website locally | [frontend.md](frontend.md) |
| Run the mobile app locally | [mobile.md](mobile.md) |
| Run the backend locally | [backend.md](backend.md) |
| Set up or inspect Supabase (auth, schema, RLS) | [setup-supabase.md](setup-supabase.md) |
| Call or extend the HTTP API | [api.md](api.md) |

## Reference documents (not duplicated here)

- **`AGENTS.md`** — engineering rules: structure, conventions, security, API design.
- **`DESIGN.md`** — design system tokens and component treatments (single source of truth for UI).
- **`schemas/`** — SQL migrations and seed scripts; the only sanctioned way to change the database.

## Implemented today

- **Website** (React 19 + Vite + Tailwind 4): marketing landing page, Supabase
  email/password auth in a modal (login / register / forgot password), toast
  notifications, and the **Marketplace** — browse, filter, sort, view, and post
  listings (photo + price + unit + category + map-pinned location).
- **Backend** (FastAPI): Nominatim geocoding proxy — the only sanctioned path
  for geocoding requests, with throttling, caching, and rate limits.
- **Schema**: `listings`, `listing_images`, private `listings` storage bucket,
  RLS policies, demo seed script.
- **Mobile** (Expo SDK 57 + React Native): an intro landing screen handing
  off into a bottom-tab shell — Marketplace, Community, Scan (raised center
  action), Settings, and a Logout action cell — all rendered from the
  DESIGN.md token set via `mobile/src/theme/designTokens.js`. Tab panels are
  designed placeholders; flows arrive phase by phase.

ML inference is planned; the backend model directory exists as a stub.
