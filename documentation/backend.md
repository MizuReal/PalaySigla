# Backend

FastAPI application. Currently serves the geocoding proxy (Nominatim) — the
only sanctioned path for external API calls from the frontend — plus a health
check. ML inference will land here later.

## Requirements

- Python >= 3.11 (developed on 3.14)

## Setup

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env   # defaults are fine for local dev
.venv/bin/uvicorn app.main:app --port 8000
```

`.env` is gitignored; `.env.example` documents every key.

## Scripts

| Command | What |
|---|---|
| `.venv/bin/uvicorn app.main:app --port 8000` | Run the server |
| `.venv/bin/ruff check app tests` | Lint |
| `.venv/bin/black --check app tests` | Format check |
| `.venv/bin/pytest` | Tests (mocked Nominatim: UA header, throttle, cache, envelope) |

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `APP_NAME` | `PalaySigla` | Used in the Nominatim User-Agent |
| `APP_VERSION` | `0.1.0` | Used in the Nominatim User-Agent |
| `CONTACT_EMAIL` | `dev@palaysigla.ph` | Used in the Nominatim User-Agent |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowlist (no wildcards in production) |
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` | Geocoding provider |
| `GEOCODE_MIN_INTERVAL_SECONDS` | `1.0` | Hard throttle between upstream requests |
| `GEOCODE_CACHE_TTL_SECONDS` | `86400` | In-memory cache TTL (24 h) |
| `GEOCODE_REQUEST_TIMEOUT_SECONDS` | `5.0` | Upstream request timeout |
| `IP_RATE_LIMIT_MAX_REQUESTS` | `10` | Per-IP sliding window cap |
| `IP_RATE_LIMIT_WINDOW_SECONDS` | `10` | Per-IP sliding window length |

## Structure

```
app/
├── main.py              App factory, CORS, envelope error handlers, /health
├── core/config.py       pydantic-settings
├── services/
│   ├── geocoder.py      Nominatim client: 1 req/s throttle, TTL cache, UA header
│   └── rate_limit.py    Per-IP sliding-window limiter
├── api/geocode.py       /api/geocode/search, /api/geocode/reverse
└── models/geocode.py    Pydantic response models
tests/                   pytest suite (httpx.MockTransport)
```

## API

See [api.md](api.md) for the full contract: `{data, error}` envelope, error
codes, endpoint params, and rate-limit behavior.

## Nominatim policy

Every upstream request carries
`User-Agent: PalaySigla/<version> (<contact-email>)`, is throttled to 1
request/second globally, and is cached aggressively (identical queries and
coordinates rounded to ~11 m share cache entries). The API additionally rate
limits per client IP. Never bulk-geocode in an unthrottled loop.
