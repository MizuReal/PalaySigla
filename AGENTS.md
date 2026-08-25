# AGENTS.md

## Project Overview

PalaySigla is a real-time, image-based machine learning system for post-harvest paddy
rice quality monitoring. It performs quality status assessment, mold detection, market
grade classification, and variety classification from photos of harvested paddy taken
on mobile devices or uploaded on the web.

Full-stack application: React (web) + React Native (mobile) frontends, FastAPI backend,
Supabase (auth + PostgreSQL + Storage), Nominatim + OpenStreetMap (geocoding),
Leaflet (web maps; mobile via WebView). ML inference runs in-process inside FastAPI
(PyTorch/ONNX). All JS is plain JavaScript — no TypeScript.

---

## Repository Structure

```
project-root/
├── website/                # React web (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── services/       # Centralized API + Supabase wrappers
│   │   ├── components/
│   │   ├── context/        # React Context providers
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/
│   │   └── utils/
├── mobile/                 # React Native (Expo, managed workflow)
│   ├── src/
│   │   ├── services/       # Centralized API + Supabase wrappers
│   │   ├── components/
│   │   ├── context/
│   │   ├── screens/
│   │   ├── hooks/
│   │   └── utils/
├── backend/                # FastAPI (sole gateway to external APIs)
│   ├── app/
│   │   ├── main.py         # App factory + lifespan (model loading)
│   │   ├── api/            # Route modules grouped by feature
│   │   ├── models/         # Pydantic models
│   │   ├── db/             # Supabase client
│   │   ├── services/       # Business logic layer
│   │   ├── ml/             # Model loading, preprocessing, inference
│   │   └── core/           # Config, settings, auth dependencies
│   └── tests/
├── schemas/                # Supabase SQL migration files
├── DESIGN.md               # Design system — single source of truth for all UI work
└── AGENTS.md
```

---

## General Rules

- Write production-quality code on every generation — no stubs, no TODOs, no placeholder logic.
- Never leave a function body empty or returning `None`/`null` without an explicit reason.
- All error paths must be handled. Silent failures are forbidden.
- No commented-out code in commits. If code is removed, it is gone.
- Comments explain *why*, never *what*. Self-documenting names eliminate the need for what-comments.
- No magic numbers or magic strings. Extract to named constants at the top of the file.
- One responsibility per module. If a file is doing two unrelated things, split it.
- Never hardcode credentials, URLs, or environment-specific values inline. All config comes from
  environment variables or named module constants.
- Never commit `.env`. Maintain `.env.example` with all keys and empty values for every sub-project.
- Model artifacts (weights, label maps) are never committed. Referenced by environment variable,
  downloaded/placed outside the repo at deploy time.

---

## JavaScript (Web + Mobile)

- Plain JavaScript only. No TypeScript, no JSDoc type annotations, no `.ts`/`.tsx` files.
- `const` by default. `let` only when reassignment is required. `var` is forbidden.
- Functional components and hooks only. No class components.
- Named exports preferred over default exports, except for page/screen components.
- Arrow functions for callbacks and hooks. Named function declarations for top-level functions.
- Async/await only. No `.then().catch()` chains.
- All async functions must have a try/catch. Never let unhandled promise rejections surface.
- Destructure props and objects at the top of the function body, not inline.
- Styling: Tailwind CSS (web). `StyleSheet.create()` (mobile).
  Dynamic layout values (percentage widths, bar heights, chart dimensions) via `style={{}}` are
  acceptable when Tailwind or StyleSheet cannot express them. All other inline styles are forbidden.
- `camelCase` for variables, functions, hooks. `PascalCase` for components.
  `SCREAMING_SNAKE_CASE` for module-level constants.
- File names: `PascalCase` for components (`AssessmentCard.jsx`), `camelCase` for everything else
  (`useAssessment.js`).
- Custom hooks must be prefixed with `use` and encapsulate all logic for a single concern.
- All Supabase calls go through `src/services/`. No raw `supabase.from()`, `supabase.rpc()`, or
  `supabase.auth.*` calls inside components, hooks, or pages.
- **All external API calls (Nominatim) must route through the backend.** Frontend code must never
  call third-party APIs directly. The backend is the sole gateway.
- Prop drilling beyond two levels is a signal to use Context or a shared hook.
- `useEffect` must list all dependencies. No empty dependency arrays unless the intent is truly
  mount-only, with a comment explaining why.

---

## React Web

- Routing: React Router v6. `createBrowserRouter` preferred; component-based
  `BrowserRouter` + `Routes`/`Route` acceptable.
- Global state: React Context. Redux Toolkit for complex cross-cutting state when Context
  becomes unwieldy.
- Supabase auth: single `AuthProvider` at root, subscribing via
  `supabase.auth.onAuthStateChange()`. All child components read auth state from context —
  never call `supabase.auth.getSession()` ad hoc.
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Never hardcode these
  values in source files.
- Styling: Tailwind CSS exclusively. No CSS modules, no CSS-in-JS libraries.
- Image capture: file input with client-side preview and format/size validation
  (JPEG/PNG, max 10 MB) before upload. Compress oversized images client-side before upload.
- Map (Leaflet via `react-leaflet`):
  - TileLayer URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
  - Attribution: `© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`
    — mandatory, non-negotiable.
  - Map container must have an explicit pixel or vh/vw height via Tailwind classes.
    `height: 100%` without a sized parent will produce a zero-height map.
  - Imperative map control (flyTo, setZoom) must use `useMap()` inside a child component,
    never via ref on `MapContainer`.
- ESLint + Prettier must be configured. Minimum: `eslint:recommended` +
  `plugin:react/recommended`.

---

## React Native

- Expo (managed workflow preferred unless a bare module is strictly required).
- Navigation: React Navigation v7. Native Stack, Bottom Tabs, and Drawer navigators.
  Conditional auth gating in `App.js`. No custom navigation logic.
- Supabase client must use `AsyncStorage` as the storage adapter. No in-memory only sessions.
- Camera capture: `expo-image-picker` with explicit permission requests before launch.
  Handle `denied` and `undetermined` states with user-facing messaging — never silently fail.
  Capture at the maximum resolution the sensor supports; compress client-side before upload.
- Uploads: show progress and failure states. Never fire-and-forget an image upload.
- Maps: `react-native-webview` rendering Leaflet with OpenStreetMap tiles.
  Leaflet assets loaded via CDN unpkg links (leaflet.css + leaflet.js 1.9.4).
- State management: Redux Toolkit (`@reduxjs/toolkit` + `react-redux`).
- All styles via `StyleSheet.create()`. No inline style objects except for dynamic dimensions.
- Location: always request permissions explicitly with `expo-location` before any GPS access.
  Handle `denied` and `undetermined` states with user-facing messaging — never silently fail.
- Platform-specific code via `Platform.OS === 'ios'` checks or `.ios.js`/`.android.js` file splits.
- Environment variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never
  hardcode these values in source files.

---

## Design System

- Every UI design — components, pages, screens, and flows on web and mobile — must follow
  the design system in `DESIGN.md`. It is the single source of truth for visual style.
- Colors, typography, spacing, radii, and component treatments come only from tokens defined
  in `DESIGN.md`. No ad-hoc values in implementation code.
- Express new components with the existing token vocabulary before introducing new tokens.
  Adding a token requires updating `DESIGN.md` first.
- Keep `DESIGN.md` in sync with the code. Any visual change ships with its `DESIGN.md` update.

---

## FastAPI (Backend)

- **The backend is the sole gateway to all external APIs.** All Nominatim geocoding requests
  must be proxied through backend endpoints. The frontend must never call these services directly.
- All route handlers must be `async def`. Synchronous handlers are forbidden.
- Routes grouped by feature domain in `app/api/`. No single monolithic router file.
- Every route must declare an explicit `response_model`. No bare `dict` returns.
- All request bodies and responses use Pydantic v2 models. No raw `dict` in function signatures.
- Dependency injection via `Depends()` for: auth validation, DB clients, rate limiters,
  shared services.
- Auth: validate Supabase JWTs server-side with the service role key inside a reusable
  `Depends(get_current_user)`. Never trust a user ID or role supplied by the client payload.
- Raise `HTTPException` with precise status codes and `detail` strings.
  Never return error info in a 200 response.
- Business logic lives in `app/services/`. Route handlers are thin:
  validate → call service → return model.
- All Python functions must have type annotations on parameters and return values.
- PEP 8 enforced via `ruff`. Formatted with `black`. Max line length: 100.
- `snake_case` for variables/functions. `PascalCase` for classes and Pydantic models.
  `SCREAMING_SNAKE_CASE` for module constants.

### ML Inference (in-process)

- Models load exactly once at application startup via FastAPI lifespan. Never load or initialize
  a model inside a route handler or per request.
- Model artifacts (weights, label maps) are configured by environment variable
  (`MODEL_*_PATH`) and read once at startup. Missing or invalid artifacts fail fast at boot.
- Inference is CPU/GPU-bound: run it off the event loop via `run_in_executor` with a bounded
  thread pool (or an ONNX Runtime session for GPU). Never block the async event loop.
- Preprocessing (resize, channel order, normalization) must match the training pipeline exactly.
  Define every preprocessing constant once in `app/ml/` — no per-call values.
- Image validation before any inference: format whitelist (JPEG/PNG), size limits,
  EXIF/GPS metadata stripped. Reject invalid images with a 4xx error, never feed them to the model.
- Every prediction returns per-class confidence scores. Below-threshold predictions are flagged
  `needs_review` — never silently returned as a definite result.
- Prediction results are immutable: once persisted, a prediction record is never updated in place.
- All four outputs (quality status, mold detection, market grade, variety) come from the same
  inference request so results stay consistent for one image.

---

## Supabase

- Auth, user sessions, Storage, and all relational/structured data.
- RLS must be enabled on every table **and every bucket**. Disabling RLS for any reason is forbidden.
- Policies must be explicit: no implicit public access.
- All schema changes via SQL migration files in `schemas/`. Never alter the schema via the
  dashboard without a corresponding migration file.
- Every table must have `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, and `updated_at TIMESTAMPTZ`
  where mutation occurs.
- Backend access uses the service role key. Frontend access uses the anon key.
- Never expose the service role key to any client-side code.
- Never hardcode the Supabase URL or anon key in source files. Use environment variables.
- Storage:
  - Client uploads images to user-scoped paths (`user_id/assessment_id/image.jpg`) under RLS.
  - The backend reads images via the service role key for inference; it never downloads an image
    outside the client's upload policy scope.
  - Images are served to clients via short-lived signed URLs. No public-read buckets.
  - The original captured image is retained for auditability; processed/derived images are
    stored alongside it under the same path prefix.

---

## External APIs

### Nominatim (Geocoding)
- Geocoding: `https://nominatim.openstreetmap.org/search?format=jsonv2`
- Reverse geocoding: `https://nominatim.openstreetmap.org/reverse?format=jsonv2`
- **All calls must originate from the backend only.** No direct frontend calls.
- `User-Agent` header is mandatory on every request:
  `<app-name>/<version> (<contact-email>)`. Nominatim blocks requests without it.
- Rate limit: strictly 1 request/second maximum. Use a server-side queue or throttle utility.
- Cache geocoding results aggressively. Identical coordinates or place names must not trigger
  repeat requests within a session.
- Never bulk-geocode in an unthrottled loop.

---

## API Design

- All endpoints: `kebab-case` paths (`/api/assessments`, `/api/predictions`).
- Response envelope for list and action endpoints:
  ```json
  { "data": ..., "error": null }
  ```
- Errors:
  ```json
  { "data": null, "error": { "code": "NOT_FOUND", "message": "..." } }
  ```
- Paginated list responses must include `total`, `page`, `limit` alongside `data`.
- All timestamps in responses: UTC ISO 8601 (`2026-08-25T12:00:00Z`).
- HTTP status codes must be semantically correct. 200 is not a valid error response.
- Prediction responses include `confidence` per class and a `needs_review` flag when
  any confidence falls below threshold.

---

## Data Integrity

- All timestamps stored and transmitted in UTC ISO 8601. No local time, no Unix epoch,
  no custom formats.
- Supabase tables: `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, and `updated_at` where mutation occurs.
- Prediction records are append-only logs. New inferences insert new rows; existing rows are
  never updated or deleted.
- Deletions of other critical records (users, assessments) must be soft-deletes
  (`deleted_at` column/field), not hard deletes.

---

## Security

- No secrets in source code, logs, or API responses.
- Supabase service role key: backend only, never in any frontend bundle or `.env` that ships
  to clients.
- Server-side auth validation on every protected route — no client-enforced auth gates.
- Sanitize all user-supplied input before using it in queries. Parameterized queries only.
- CORS on FastAPI must whitelist specific origins. Wildcard `*` is forbidden in production.
- Never hardcode URLs (Supabase, API endpoints, CDN) in source files. Use environment variables
  or named constants.
- Enforce HTTPS for all outbound requests. No plaintext HTTP to external services.
- Strip EXIF/GPS metadata from uploaded images before storage or inference — capture location is
  private user data.
- Model files are validated at startup (hash/size checks against recorded values) before being
  loaded into memory.
