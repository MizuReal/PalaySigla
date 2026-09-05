# PalaySigla

Real-time, image-based quality monitoring for post-harvest paddy rice —
quality status, mold detection, market grade, and variety classification from
a photo. The platform also includes a **Marketplace** where farmers list
palay, rice, seeds, and machinery with photos and map-pinned locations, and a
**Palay Assistant** that answers rice-and-palay questions in English and
Tagalog.

## What's implemented today

- **Website** (React 19 + Vite): marketing landing page, Supabase auth in a
  modal (login / register / forgot password, email confirmation enforced),
  toast notifications, the Marketplace — browse, filter, sort, post listings
  (photo + price + unit + category + Leaflet map location), mark sold,
  remove — a Profile page (photo, display name, PH contact number), the
  Palay Assistant chat widget, and full-page 404 / error states.
- **Backend** (FastAPI): Nominatim geocoding proxy with throttling, caching,
  and per-IP rate limits — the only sanctioned path for geocoding — plus the
  Palay Assistant chat endpoint (Groq-hosted `openai/gpt-oss-20b` behind a
  two-stage topic guard) secured by server-side Supabase JWT validation.
- **Schema**: `schemas/*.sql` migrations (marketplace + profiles tables, RLS,
  private storage buckets) plus a demo seed script.
- **Mobile** (Expo SDK 57 + React Native, plain JS): intro landing screen
  with a "Get started" handoff into a bottom-tab shell — Marketplace (live
  anonymous browse feed), Community, Scan (raised center action), Settings
  (account), and a fifth session action (Login while signed out / Logout
  while signed in) that keeps the bar at five even cells — full email/password
  auth with in-app email-link returns, and the Palay Assistant bottom-sheet
  chat over the tabs — styled from the DESIGN.md token set. Community and
  Scan panels are honest placeholders.

ML inference (quality, mold, grade, variety from photos) is planned but not
yet implemented — no model artifacts or inference endpoints exist.

## Repository layout

```
website/          React web app
backend/          FastAPI app
schemas/          Supabase SQL migrations + seed scripts
mobile/           React Native app (Expo) — browse, auth, and assistant shipped
documentation/    Architecture, API, Supabase, and per-app docs
AGENTS.md         Engineering rules
DESIGN.md         Design system
```

## Quickstart

1. **Supabase** — create a project, then apply `schemas/*.sql` in the SQL
   Editor and set the dashboard options from
   `documentation/setup-supabase.md` (Confirm email ON, password min 8,
   Site URL + redirects).
2. **Backend** — `cd backend`, create the venv, install, run:
   ```bash
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt -r requirements-dev.txt
   .venv/bin/uvicorn app.main:app --port 8000
   ```
   Geocoding works out of the box; for the assistant, fill
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GROQ_CHATBOT_API_KEY`
   in `backend/.env` (see `documentation/backend.md`).
3. **Website** — `cd website`, `npm install`, copy `.env.example` to `.env`
   and fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_AUTH_REDIRECT_URL`, `VITE_API_URL`, then `npm run dev`.
4. **Mobile** — `cd mobile`, `npm install`, copy `.env.example` to `.env`,
   then `npx expo start` and open it in Expo Go / an emulator.

## Documentation

See `documentation/index.md` — architecture diagrams, API contract, Supabase
setup, and per-app guides. Coding rules: `AGENTS.md`. Design: `DESIGN.md`.
