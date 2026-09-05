# Backend

FastAPI application. Serves two proxy/API features plus the health check:

- **Geocoding proxy** (Nominatim) — the only sanctioned path for external
  geocoding calls from the frontend.
- **Palay Assistant chat** (`POST /api/chat`) — a rice/palay Q&A assistant
  backed by a Groq-hosted LLM (`openai/gpt-oss-20b`), gated by server-side
  Supabase JWT validation.
- **`GET /health`**.

ML inference is planned but not yet implemented — no model artifacts, no
model module, no model environment variables exist yet.

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

The app boots with empty Supabase/Groq keys in `.env.example` (geocoding
works without them). To exercise authenticated chat locally, set
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GROQ_CHATBOT_API_KEY`;
the `Chatbot` constructor refuses to start without the Groq key.

## Scripts

| Command | What |
|---|---|
| `.venv/bin/uvicorn app.main:app --port 8000` | Run the server |
| `.venv/bin/ruff check app tests` | Lint |
| `.venv/bin/black --check app tests` | Format check |
| `.venv/bin/pytest` | Tests (mocked Nominatim, Groq, and Supabase auth) |

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
| `IP_RATE_LIMIT_MAX_REQUESTS` | `10` | Per-IP sliding window cap (geocode) |
| `IP_RATE_LIMIT_WINDOW_SECONDS` | `10` | Per-IP sliding window length (geocode) |
| `SUPABASE_URL` | *(empty)* | Supabase project URL — validates chat JWTs against `auth/v1/user` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(empty)* | Service-role key for the server-side auth check. `SUPABASE_SECRET_KEY` is accepted as an alias for the same value |
| `GROQ_CHATBOT_API_KEY` | *(empty)* | Groq API key for the assistant (required — the app fails fast at boot without it) |
| `GROQ_CHATBOT_BASE_URL` | `https://api.groq.com/openai/v1` | Groq chat-completions base URL |
| `GROQ_CHATBOT_MODEL` | `openai/gpt-oss-20b` | Assistant model |
| `CHAT_MAX_TOKENS` | `512` | Max completion tokens (64–4096) |
| `CHAT_REQUEST_TIMEOUT_SECONDS` | `20.0` | Upstream chat timeout |
| `CHAT_HISTORY_MAX_MESSAGES` | `20` | History turns sent to the model (1–40) |
| `CHAT_RATE_LIMIT_MAX_REQUESTS` | `6` | Per-IP sliding window cap (chat) |
| `CHAT_RATE_LIMIT_WINDOW_SECONDS` | `60` | Per-IP sliding window length (chat) |

## Structure

```
app/
├── main.py              App factory, CORS, envelope error handlers, /health
├── core/
│   ├── config.py        pydantic-settings
│   └── auth.py          Server-side Supabase JWT validation (Depends(get_current_user))
├── services/
│   ├── geocoder.py      Nominatim client: 1 req/s throttle, TTL cache, UA header
│   ├── rate_limit.py    Per-IP sliding-window limiter
│   └── chatbot.py       Groq chat-completions client + two-stage topic guard
├── api/
│   ├── geocode.py       /api/geocode/search, /api/geocode/reverse
│   └── chat.py          POST /api/chat (auth + per-IP rate limited)
└── models/
    ├── geocode.py       Pydantic response models
    └── chat.py          ChatTurn / ChatRequest / ChatReply / ChatResponse
tests/                   pytest suite (httpx.MockTransport)
```

## API

See [api.md](api.md) for the full contract: `{data, error}` envelope, error
codes, endpoint params, and rate-limit behavior.

## Palay Assistant (`/api/chat`)

The endpoint requires a Supabase session token
(`Authorization: Bearer <access-token>`). `core/auth.py#get_current_user`
validates it on every request by calling Supabase's `auth/v1/user` endpoint
with the service-role key — a client-supplied user ID is never trusted.
Missing/invalid tokens map to `401`; an unconfigured or unreachable Supabase
backend maps to `503`.

The reply path (`services/chatbot.py`) is a two-stage safeguard:

1. **Stage-1 keyword guard** (`classify_turn`) — a word-boundary vocabulary
   over Tagalog/English rice-and-palay terms plus a greeting list. Clearly
   off-topic messages are answered with a canned refusal and never reach the
   model. Short follow-ups ("Paano pa?", "Bakit?") stay in scope only when an
   earlier user turn already matched a topic term.
2. **Stage-2 system prompt** — everything else goes to Groq with a strict
   scope prompt (rice/palay only, mirror the user's language, plain text, no
   emojis/markdown, cite PhilRice or a technician when unsure).

Post-processing: model replies are run through a paired-marker scrubber that
strips markdown formatting (bold, italic, code, links, headings, rules) to
plain text. History is trimmed to `CHAT_HISTORY_MAX_MESSAGES` turns before
sending.

Upstream failure mapping: Groq unreachable or non-200 → `502
UPSTREAM_ERROR`; Groq HTTP 429 → `429 RATE_LIMITED` ("busy"). The API also
rate limits chat per client IP (default 6 req / 60 s) since LLM calls are
metered. The bot runs in-process with a module-level instance — there is no
per-request client creation; request volume stays bounded by the per-IP
limiter plus the history-turn and max-token caps.

## Nominatim policy

Every upstream request carries
`User-Agent: PalaySigla/<version> (<contact-email>)`, is throttled to 1
request/second globally, and is cached aggressively (identical queries and
coordinates rounded to ~11 m share cache entries). The API additionally rate
limits per client IP. Never bulk-geocode in an unthrottled loop.
