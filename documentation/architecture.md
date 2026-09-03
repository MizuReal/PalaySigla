# Architecture

## Stack

| Layer | Technology |
|---|---|
| Website | React 19, react-router v7, Tailwind CSS v4, Leaflet (react-leaflet v5), plain JavaScript |
| Backend | FastAPI (async), httpx, pydantic-settings |
| Database + Auth + Storage | Supabase (PostgreSQL, email/password auth, private buckets) |
| Geocoding | Nominatim / OpenStreetMap, proxied through the backend |
| Mobile | Expo SDK 57 (React Native), React Navigation v7, Inter typeface — landing screen shipped |

**Key rule:** the backend is the sole gateway to external APIs. The frontend
never calls Nominatim (or any third-party service) directly — everything
routes through FastAPI.

## Authentication flow

```mermaid
sequenceDiagram
    participant U as User
    participant N as PrimaryNav / CTA
    participant M as AuthModal
    participant S as services/auth.js
    participant SB as Supabase Auth
    participant P as AuthProvider
    participant T as AuthToasts

    U->>N: clicks "Login" / "Get started"
    N->>P: openAuthModal(mode)
    P->>M: mount AuthModal (fresh state)
    U->>M: submits form
    M->>S: signIn / signUp
    S->>SB: supabase.auth.signInWithPassword / signUp
    SB-->>S: session or error (mapped to friendly message)
    S-->>M: ok / error
    alt error
        M-->>U: inline banner (per-field errors stay client-side)
    else success
        M->>P: closeAuthModal()
    end
    SB->>P: onAuthStateChange(SIGNED_IN / SIGNED_OUT)
    P->>T: user transition observed
    T-->>U: toast ("Logged in…" / "You're signed out.")
```

Notes:

- `AuthProvider` is the only subscriber to `supabase.auth.onAuthStateChange`.
  Components read `user` / `isInitializing` from context — no ad-hoc
  `getSession()` calls.
- `AuthModal` mounts only while open (conditional render in `App.jsx`), so form
  state is always fresh; `Modal` restores focus to the trigger on close.
- Email confirmation is enforced: `signUp` with a null session returns
  `requiresEmailConfirmation` and the UI shows a "check your inbox" state.
- Returning from an email confirmation link is detected by snapshotting
  `location.hash` at module load (`utils/authUrlHint.js`) — supabase-js strips
  the hash shortly after.

## Marketplace — browse

```mermaid
sequenceDiagram
    participant U as User
    participant PG as MarketplacePage
    participant F as ListingFeed
    participant H as useListings
    participant S as services/listings.js
    participant SB as Supabase (RLS)

    U->>PG: filters / search / sort
    PG->>F: keyed remount (fresh fetch per filter set)
    F->>H: useListings({category, search, sort})
    H->>S: fetchListings(page 1)
    S->>SB: select active, not-deleted listings + images
    SB-->>S: rows + exact count
    S-->>H: {data, total}
    H-->>F: cards (skeletons while loading)
    F->>S: getListingImageUrl(path) per card
    S->>SB: createSignedUrl (cached 45s in memory)
    SB-->>F: signed URL
    F-->>U: card grid
    U->>PG: opens a listing
    PG->>H: useListingDetail(id)
    H->>S: getListing(id) + signed URL
    S-->>PG: detail modal
```

Notes:

- RLS filters rows server-side: only `status = 'active'` and
  `deleted_at IS NULL` listings are visible to readers.
- The feed is remounted with a `key` when filters change (`feedKey`), which
  gives it fresh loading state and resets to page 1.
- Search is debounced 350 ms in `MarketplacePage`; load-more appends the next
  page (12 rows).
- Signed URLs are cached per storage path with a 45 s TTL so the grid does not
  re-sign on every render.

## Marketplace — post a listing

```mermaid
sequenceDiagram
    participant U as User
    participant PM as PostListingModal
    participant MP as MapPicker
    participant G as services/geocode.js
    participant H as usePostListing
    participant S as services/listings.js
    participant SB as Supabase
    participant B as Backend (FastAPI)
    participant N as Nominatim

    U->>PM: 3-step wizard (details → photo → location)
    U->>MP: searches a place / drops the pin
    MP->>G: searchPlace(q) / reverseGeocode(lat, lng)
    G->>B: GET /api/geocode/search|reverse
    B->>N: Nominatim (1 req/s, User-Agent, cache)
    N-->>B: results
    B-->>G: envelope {data, error}
    G-->>MP: candidates / label
    U->>PM: submits
    PM->>H: postListing(payload)
    H->>S: createListing(user_id, …)
    S->>SB: insert listings row
    SB-->>S: listing id
    H->>S: uploadListingImage(file, id, userId)
    S->>SB: storage upload (private bucket, uid-prefixed path) + listing_images row
    alt upload fails
        H->>S: softDeleteListing(id) — rollback, no photo-less posts
    end
    H-->>PM: success
    PM-->>U: toast "Listing posted!" + feed refresh
```

Notes:

- The photo is validated (JPEG/PNG, ≤ 10 MB) and re-encoded client-side via
  canvas (max 1600 px, quality 0.82), which strips EXIF/GPS.
- Storage path is `{user_id}/{listing_id}/0.jpg`; the storage RLS insert
  policy enforces the `auth.uid()` prefix.
- Owner actions (mark sold / remove) run through the same service layer; removals
  are soft deletes (`deleted_at`), never hard deletes.

## Geocoding proxy

```mermaid
flowchart LR
    A[MapPicker / search UI] -->|fetch VITE_API_URL| B[services/geocode.js]
    B -->|GET /api/geocode/search| C[FastAPI api/geocode.py]
    B -->|GET /api/geocode/reverse| C
    C --> D[services/geocoder.py]
    D -->|per-IP rate limit| C
    D --> E{Cache hit?}
    E -->|yes| C
    E -->|no| F[asyncio throttle 1 req/s]
    F --> G[Nominatim<br/>User-Agent: PalaySigla/x.y.z]
    G --> D
```

- Cache keys: normalized query + limit for search; coordinates rounded to 4
  decimals (~11 m) for reverse. TTL 24 h (configurable).
- The service raises `HTTPException(502)` when Nominatim is unreachable or
  errors; 429 when rate limited.

## Repository layout

```
├── website/          React web app (services, context, hooks, components, pages)
├── backend/          FastAPI app (app/, tests/, pyproject.toml)
├── schemas/          Supabase SQL migrations + seed scripts
├── mobile/           React Native app (Expo) — landing screen shipped; flows pending
├── documentation/    These docs
├── AGENTS.md         Engineering rules
└── DESIGN.md         Design system
```
