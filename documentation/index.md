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
| Run or deploy the backend | [backend.md](backend.md) |
| Set up or inspect Supabase (auth, schema, RLS) | [setup-supabase.md](setup-supabase.md) |
| Call or extend the HTTP API | [api.md](api.md) |

## Reference documents (not duplicated here)

- **`AGENTS.md`** — engineering rules: structure, conventions, security, API design.
- **`DESIGN.md`** — design system tokens and component treatments (single source of truth for UI).
- **`schemas/`** — SQL migrations and seed scripts; the only sanctioned way to change the database.

## Implemented today

- **Website** (React 19 + Vite + Tailwind 4 + TypeScript): marketing landing
  page, Supabase email/password auth in a modal (login / register / forgot
  password), toast notifications, the **Marketplace** — browse, filter, sort,
  view, and post listings (photo + price + unit + category + map-pinned
  location), owner actions (reserve / mark sold / release / remove), and
  message-the-seller — the **Community forum** (feed, category counts,
  threads, comments, hearts, photos), the **Messages** inbox and threads with
  Supabase Realtime delivery and unread badges, the **Profile** page (photo,
  display name, PH contact number, received reviews, and Account / Farmer
  profile / Selling history / Purchases tabs with TanStack data tables), the
  signed-in **farmer profile wall** (`/farmers/:userId`) with credentials,
  certifications, and endorsements, a **Palay Assistant** floating chat
  widget (signed-in, per-user history), the credentials nudge modal, a
  build-time-generated printable **scan sheet** download on the homepage, and
  full-page 404 / route-error states.
- **Backend** (FastAPI): Nominatim geocoding proxy — the only sanctioned path
  for geocoding requests, with throttling, caching, and rate limits — the
  **Palay Assistant** chat endpoint (Groq-hosted `openai/gpt-oss-20b` behind
  a two-stage topic guard) with server-side Supabase JWT validation, and the
  **scan-sheet OCR** endpoint (OpenCV registration + a small ONNX digit CNN,
  per-field confidence and `needs_review`). Ships a Render blueprint
  (`render.yaml`).
- **Schema**: `listings`, `listing_images`, `profiles`, `forum_posts` /
  `forum_comments` / `forum_reactions` / `forum_images`, `conversations` /
  `messages`, `transactions`, `reviews`, and the verification tables
  (`profile_credentials`, `profile_affiliations`, `profile_endorsements`,
  `profile_documents`), plus private `listings`, `avatars`, `forum`, and
  `credentials` storage buckets, RLS policies, definer RPCs for the farmer
  wall, and a demo seed script.
- **Mobile** (Expo SDK 57 + React Native + TypeScript): intro landing screen
  handing off into a bottom-tab shell — Marketplace (live browse feed, 3-step
  posting wizard with photo + map pin, listing detail with owner actions),
  Community (live forum: feed, categories, threads, comments, hearts,
  photos), Scan (live sheet OCR: print the generated sheet, photograph it,
  review the six extracted values with confidence and review flags),
  Settings (Account / Farmer profile / Selling history / Purchases), and a
  fifth session action cell (Login signed-out / Logout signed-in) keeping the
  bar at five even cells — full email/password auth with in-app email-link
  returns, toast notifications, the signed-in **farmer profile wall** push,
  the **Palay Assistant** bottom-sheet chat (root-level overlay over the
  tabs), and the credentials nudge modal — all rendered from the DESIGN.md
  token set via `mobile/src/theme/designTokens.ts`. A full-page message shell
  covers render errors (root error boundary) and unknown addresses.

The four assessment outputs (quality, mold, grade, variety) remain planned —
no assessment model artifacts or endpoints exist. The scan-sheet OCR path
that feeds them its six paper measurements is implemented (see
[architecture.md](architecture.md#scan-sheet-ocr-handwritten-values)).
