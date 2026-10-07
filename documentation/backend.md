# Backend

FastAPI application. Serves two proxy/API features plus the health check:

- **Geocoding proxy** (Nominatim) — the only sanctioned path for external
  geocoding calls from the frontend.
- **Palay Assistant chat** (`POST /api/chat`) — a rice/palay Q&A assistant
  backed by a Groq-hosted LLM (`openai/gpt-oss-20b`), gated by server-side
  Supabase JWT validation.
- **Scan-sheet OCR** (`POST /api/scan/ocr`) — warps a photographed sheet to a
  canonical A4 frame using its printed corner marks, classifies each
  handwritten digit cell with a small ONNX CNN, and returns the six
  measurements with per-field confidence. The four assessment models (quality,
  mold, grade, variety) remain planned.
- **`GET /health`**.

## Requirements

- Python >= 3.11 (developed on 3.14)

## Setup

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env   # defaults are fine for local dev
.venv/bin/python scripts/train_digit_model.py --output models/scan_digit.onnx
.venv/bin/uvicorn app.main:app --port 8000
```

`.env` is gitignored; `.env.example` documents every key.

The app boots with empty Supabase/Groq keys in `.env.example` (geocoding
works without them). To exercise authenticated chat locally, set
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GROQ_CHATBOT_API_KEY`;
the `Chatbot` constructor refuses to start without the Groq key. To exercise
scanning, train the digit model once (the steps above; requires the dev-only
`torch` extra) and set `SCAN_DIGIT_MODEL_PATH=models/scan_digit.onnx` — the
app fails fast at boot without a valid model.

## Deployment (Render)

`render.yaml` at the repository root is a Render Blueprint for the backend
service:

| Setting | Value |
|---|---|
| Service | `palaysigla-backend` (web service, Python) |
| Root directory | `backend` |
| Region / plan | `singapore` / `free` |
| Branch | `main` — auto-deploy on commit |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check | `/health` |
| Python version | `PYTHON_VERSION=3.14.3` |

Create the service through **New → Blueprint** pointed at this repository;
Render reads `render.yaml` and provisions it. The configuration values are
declared with `sync: false`, so they are supplied in the Render dashboard
(or prompted on first deploy) and never committed:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (`SUPABASE_SECRET_KEY` is accepted as an alias)
- `GROQ_CHATBOT_API_KEY`
- `SCAN_DIGIT_MODEL_PATH` — path to the trained ONNX artifact (e.g. a Render
  Secret File at `/etc/secrets/scan_digit.onnx`)
- `SCAN_DIGIT_MODEL_SHA256` — optional integrity hash, checked at startup
- `CORS_ORIGINS` — comma-separated allowlist; must include the deployed
  website origin. Wildcard `*` is forbidden in production.
- `CONTACT_EMAIL` — used in the Nominatim `User-Agent`.

## Scripts

| Command | What |
|---|---|
| `.venv/bin/uvicorn app.main:app --port 8000` | Run the server |
| `.venv/bin/ruff check app tests scripts` | Lint |
| `.venv/bin/black --check app tests scripts` | Format check |
| `.venv/bin/pytest` | Tests (mocked Nominatim, Groq, and Supabase auth; no real model) |
| `.venv/bin/python scripts/build_scan_spec.py` | Regenerate `ocr_templates/scan-sheet-v1.json` after a layout change |
| `.venv/bin/python scripts/train_digit_model.py` | Dev-only: train + export `models/scan_digit.onnx` (needs `torch`/`onnx`) |

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
| `OCR_TEMPLATES_DIR` | *(empty)* | Folder holding `scan-sheet-v1.json`; empty resolves to the repo-root `ocr_templates/` |
| `SCAN_DIGIT_MODEL_PATH` | *(empty)* | Path to the trained `scan_digit.onnx`; **required** — boot fails without it |
| `SCAN_DIGIT_MODEL_SHA256` | *(empty)* | Optional artifact hash check at startup |
| `SCAN_DIGIT_CONFIDENCE_THRESHOLD` | `0.80` | Per-field confidence below which `needs_review` is set |
| `SCAN_RATIO_MISMATCH_TOLERANCE` | `0.05` | Max allowed gap between the OCR'd ratio and length ÷ width |
| `SCAN_MAX_IMAGE_BYTES` | `10485760` | Upload cap for scan photos |
| `SCAN_INFERENCE_MAX_WORKERS` | `2` | Bounded thread pool for off-loop inference |
| `SCAN_RATE_LIMIT_MAX_REQUESTS` | `10` | Per-IP sliding window cap (scan) |
| `SCAN_RATE_LIMIT_WINDOW_SECONDS` | `60` | Per-IP sliding window length (scan) |

## Structure

```
app/
├── main.py              App factory, CORS, envelope error handlers, lifespan (OCR artifacts), /health
├── core/
│   ├── config.py        pydantic-settings
│   └── auth.py          Server-side Supabase JWT validation (Depends(get_current_user))
├── services/
│   ├── geocoder.py      Nominatim client: 1 req/s throttle, TTL cache, UA header
│   ├── rate_limit.py    Per-IP sliding-window limiter
│   ├── chatbot.py       Groq chat-completions client + two-stage topic guard
│   └── scan.py          Scan OCR orchestration: decode, warp, classify, assemble, review flags
├── ml/
│   └── scan/
│       ├── spec.py      Loads/validates ocr_templates/scan-sheet-v1.json + preprocessing constants
│       ├── warp.py      Page + fiducial detection, homography, cell crops, inverse mapping
│       └── digits.py    Cell preprocessing, DigitClassifier protocol, ONNX Runtime classifier
├── api/
│   ├── geocode.py       /api/geocode/search, /api/geocode/reverse
│   ├── chat.py          POST /api/chat (auth + per-IP rate limited)
│   └── scan.py          POST /api/scan/ocr (auth + per-IP rate limited)
└── models/
    ├── geocode.py       Pydantic response models
    ├── chat.py          ChatTurn / ChatRequest / ChatReply / ChatResponse
    └── scan.py          ScanDigit / ScanFieldResult / ScanData / ScanOcrResponse
scripts/
├── build_scan_spec.py   Generates the shared sheet spec JSON
└── train_digit_model.py Dev-only MNIST training + ONNX export
tests/                   pytest suite (httpx.MockTransport; fake digit classifier)
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

## Scan OCR (`/api/scan/ocr`)

The endpoint requires a Supabase session token (same dependency as chat). The
pipeline runs entirely off the event loop in a bounded thread pool and never
blocks the ASGI worker:

1. **Validate + decode.** JPEG/PNG only, ≤ 10 MB, EXIF orientation normalized;
   readable bytes are re-encoded in memory, so no metadata reaches the model.
2. **Register the sheet.** Detect the page quad, try the four corner
   rotations, score the printed fiducials (the top-left anchor is larger,
   which proves orientation), then refine the homography so the photo lands on
   a canonical 2100×2970 A4 frame. Misses raise `422` with retake guidance.
3. **Crop + classify.** Every digit cell is cropped from
   `ocr_templates/scan-sheet-v1.json`, thresholded, deskewed, centered into a
   28×28 MNIST-style tensor, and classified in one ONNX batch.
4. **Assemble + review.** Digits become a value per field; range checks run
   against the spec; blank cells, low confidence, out-of-range values, and a
   `length_width_ratio` that disagrees with `grain_length ÷ grain_width` all
   set `needs_review`.

The sheet spec and the model both load once in the FastAPI lifespan and a
missing/invalid artifact fails the boot. `OnnxDigitClassifier` refuses to load
without `SCAN_DIGIT_MODEL_PATH` and optionally verifies
`SCAN_DIGIT_MODEL_SHA256`. The artifact is never committed: train it with
`scripts/train_digit_model.py`, then place it on the host (a Render Secret
File mounted at `/etc/secrets/scan_digit.onnx` with the path set in the
dashboard is the supported deploy path). Per-IP rate limiting and the
`{data, error}` envelope match the rest of the API (see [api.md](api.md)).

## Nominatim policy

Every upstream request carries
`User-Agent: PalaySigla/<version> (<contact-email>)`, is throttled to 1
request/second globally, and is cached aggressively (identical queries and
coordinates rounded to ~11 m share cache entries). The API additionally rate
limits per client IP. Never bulk-geocode in an unthrottled loop.
