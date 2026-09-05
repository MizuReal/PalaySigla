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
  notifications, the **Marketplace** — browse, filter, sort, view, and post
  listings (photo + price + unit + category + map-pinned location), owner
  actions (mark sold / remove), the **Profile** page (photo, display name, PH
  contact number), a **Palay Assistant** floating chat widget (signed-in,
  per-user history), and full-page 404 / route-error states.
- **Backend** (FastAPI): Nominatim geocoding proxy — the only sanctioned path
  for geocoding requests, with throttling, caching, and rate limits — plus the
  **Palay Assistant** chat endpoint (Groq-hosted `openai/gpt-oss-20b` behind
  a two-stage topic guard) with server-side Supabase JWT validation.
- **Schema**: `listings`, `listing_images`, `profiles`, private `listings`
  and `avatars` storage buckets, RLS policies, demo seed script.
- **Mobile** (Expo SDK 57 + React Native): intro landing screen handing off
  into a bottom-tab shell — Marketplace (live anonymous browse feed),
  Community, Scan (raised center action), Settings (account), and a fifth
  session action cell (Login signed-out / Logout signed-in) keeping the bar
  at five even cells — full email/password auth with in-app email-link
  returns, and the **Palay Assistant** bottom-sheet chat (root-level overlay
  over the tabs) — all rendered from the DESIGN.md token set via
  `mobile/src/theme/designTokens.js`. Community and Scan panels are designed
  placeholders; posting arrives in a later phase.

ML inference (quality, mold, grade, variety from photos) is planned and not
yet implemented — no model artifacts or inference endpoints exist.
