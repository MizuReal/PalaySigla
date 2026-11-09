# HTTP API

The backend serves the geocoding proxy, the Palay Assistant chat endpoint, the
scan-sheet OCR endpoint, the grain assessment endpoint, plus the health check.
All responses use the project-wide envelope format.

## Envelope

Successful list/action responses:

```json
{ "data": ..., "error": null }
```

Errors:

```json
{ "data": null, "error": { "code": "NOT_FOUND", "message": "..." } }
```

Error codes map to HTTP status:

| HTTP | Code | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request, unsupported/oversized/corrupt uploaded image |
| 401 | `ERROR` | Missing or invalid session (`/api/chat`, `/api/scan/ocr`, `/api/assessments/image`). No 401-specific code exists; unmapped statuses fall back to `ERROR`. |
| 404 | `NOT_FOUND` | Resource missing (e.g. reverse geocode with no result) |
| 422 | `VALIDATION_ERROR` | Invalid query parameters or body; scan sheet or corner marks not found in the photo |
| 429 | `RATE_LIMITED` | Per-IP rate limit exceeded, or Groq is busy |
| 500 | `ERROR` | Unhandled server error (e.g. digit or detector inference failure) |
| 502 | `UPSTREAM_ERROR` | Nominatim or Groq unreachable / errored |
| 503 | `ERROR` | Backend auth service not configured, or Supabase unreachable (`/api/chat`, `/api/scan/ocr`, `/api/assessments/image`) |

Any status code without a row in the table above also yields the generic
`ERROR` code.

Timestamps in responses are UTC ISO 8601 (the current endpoints return none).

## Endpoints

### `GET /health`

```json
{ "status": "ok" }
```

### `GET /api/geocode/search`

Place-name search, restricted to the Philippines.

| Param | Type | Rules |
|---|---|---|
| `q` | string | required, 2–120 chars |
| `limit` | int | optional, 1–10, default 5 |

Response `data`: array of `{ place_id, label, lat, lng, place_type }`.

```json
{
  "data": [
    {
      "place_id": 260121843,
      "label": "Cabanatuan, Nueva Ecija, Central Luzon, 3100, Philippines",
      "lat": 15.4905045,
      "lng": 120.9684264,
      "place_type": "administrative"
    }
  ],
  "error": null
}
```

### `GET /api/geocode/reverse`

Reverse geocoding by coordinates.

| Param | Type | Rules |
|---|---|---|
| `lat` | float | required, -90…90 |
| `lng` | float | required, -180…180 |

Response `data`: single `{ place_id, label, lat, lng, place_type }`, or `404
NOT_FOUND` when Nominatim has no result for the coordinates.

### `POST /api/chat`

Sends a message to the Palay Assistant. **Requires authentication**: the
request must carry `Authorization: Bearer <access-token>` with the caller's
Supabase session JWT. The token is validated server-side against
`GET {SUPABASE_URL}/auth/v1/user` (service-role key); no anonymous chat is
possible.

Body: `{ "messages": [...] }` — the conversation history, oldest first,
ending with the user's latest message.

| Field | Type | Rules |
|---|---|---|
| `messages` | array of turns | required, 1–20 turns |
| `messages[].role` | string | `user` or `assistant` only — the server owns the system prompt, and the last turn must be from the user |
| `messages[].content` | string | 1–2000 chars |

```json
{
  "messages": [
    { "role": "user", "content": "Paano mag-imbak ng palay para hindi mabulok?" },
    { "role": "assistant", "content": "Iimbak lamang ang tuyo at malamig na palay sa malinis na sako." },
    { "role": "user", "content": "Ano ang dapat na moisture?" }
  ]
}
```

Response `data`: `{ "reply": "<plain-text answer>" }`. Replies are always
plain text — the service strips markdown markers before returning.

```json
{
  "data": { "reply": "Target ang 14% moisture bago iimbak." },
  "error": null
}
```

Error responses (all in the envelope):

- `401 ERROR` — no bearer token, or the token is invalid/expired
  (`"Your session is invalid or has expired. Please sign in again."`).
- `429 RATE_LIMITED` — either the per-IP chat rate limit (6 requests / 60 s
  by default) or Groq's own throttle (`"The assistant is busy. …"`).
- `502 UPSTREAM_ERROR` — Groq unreachable, errored, or returned an empty
  reply (`"The assistant is unavailable right now. …"`).
- `503 ERROR` — Supabase auth backend unconfigured or unreachable
  (`"Sign-in is not available on this server right now. …"`).

Out-of-scope questions never reach the model: a canned refusal
("Paumanhin — I only help with paddy/rice topics …") is returned instead.

### `POST /api/scan/ocr`

Reads the six handwritten measurements off a photographed PalaySigla scan
sheet. **Requires authentication** (same `Authorization: Bearer
<access-token>` rule as `/api/chat`) and is the only path to the digit model.

Body: `multipart/form-data` with a single `file` field — a JPEG or PNG photo
of the filled card, at most 10 MB. The photo is warped to a canonical card
frame using the four printed corner marks, each digit cell is classified, and
the values are range-checked.

```json
{
  "data": {
    "computed_ratio": 3.0427,
    "overall_needs_review": false,
    "fields": [
      {
        "key": "grain_length",
        "label": "Grain length",
        "unit": "mm",
        "value": 7.12,
        "needs_review": false,
        "confidence": 0.97,
        "digits": [
          {
            "index": 0,
            "digit": 7,
            "confidence": 0.99,
            "is_blank": false,
            "rect": [0.21, 0.33, 0.04, 0.02]
          }
        ]
      }
    ]
  },
  "error": null
}
```

| Field | Meaning |
|---|---|
| `fields[].key` | `grain_length`, `grain_width`, `length_width_ratio`, `moisture_content`, `temperature`, `humidity` |
| `fields[].value` | Parsed number, or `null` when a required digit cell was blank |
| `fields[].needs_review` | Blank cell, below-threshold confidence, out-of-range value, or a ratio that disagrees with length ÷ width |
| `fields[].confidence` | Lowest per-digit confidence (0.0 when any required cell is blank) |
| `fields[].digits[].rect` | Cell bounds in the original photo, normalized `[x, y, w, h]` |
| `computed_ratio` | `grain_length ÷ grain_width` when both were read |

Error responses:

- `400 BAD_REQUEST` — not a JPEG/PNG, empty, corrupt, or larger than 10 MB.
- `422 VALIDATION_ERROR` — the page or its four corner marks were not found
  (the message includes retake guidance).
- `429 RATE_LIMITED` — per-IP scan limit (10 requests / 60 s by default).
- `503 ERROR` — auth backend unconfigured/unreachable.

The printable sheet itself is not an API asset: the website renders
`website/public/palaysigla-scan-sheet.pdf` at build time from
`ocr_templates/scan-sheet-v1.json` (four A6 cards per A4 page), the same spec
the backend loads for cropping.

### `POST /api/assessments/image`

Detects mold and discolored grain in a top-down photo of a paddy sample.
**Requires authentication** (the same bearer rule as `/api/chat`) and is the
only path to the defect detector.

Body: `multipart/form-data` with a single `file` field — a JPEG or PNG photo,
at most 10 MB. The photo is stretched to the model's trained input size
(1280×1280), decoded into boxes, and aggregated into a coverage estimate.

```json
{
  "data": {
    "available_outputs": ["mold", "quality_status"],
    "unavailable_outputs": ["market_grade", "variety"],
    "detections": [
      {
        "class_key": "mold_discoloration",
        "label": "Mold / discoloration",
        "confidence": 0.5871,
        "box": [0.3001, 0.1433, 0.0233, 0.0269],
        "area_ratio": 0.00063,
        "needs_review": false
      }
    ],
    "counts": { "mold_discoloration": 12 },
    "defect_rate": 0.0141,
    "severity": "moderate",
    "severity_bands": { "none_max": 0.0025, "low_max": 0.0100, "moderate_max": 0.0300 },
    "quality_status": "fair",
    "needs_review": false,
    "review_confidence_threshold": 0.55,
    "inference_ms": 512,
    "imgsz": 1280
  },
  "error": null
}
```

| Field | Meaning |
|---|---|
| `detections[].box` | Bounding box in the original photo, normalized `[x, y, w, h]` |
| `detections[].area_ratio` | Box area as a fraction of the frame |
| `detections[].needs_review` | True when this box falls below `review_confidence_threshold` |
| `counts` | Detections per class key (always includes every configured class) |
| `defect_rate` | Summed detection coverage, capped at 1.0 |
| `severity` | `none` / `low` / `moderate` / `high`, banded on `defect_rate` |
| `severity_bands` | Coverage cutoffs behind `severity` (`none_max`, `low_max`, `moderate_max`) |
| `quality_status` | Derived from severity: `premium` / `good` / `fair` / `poor` |
| `needs_review` | True when any detection falls below the review confidence (0.55 default) |
| `review_confidence_threshold` | The cutoff that set `needs_review` |
| `unavailable_outputs` | Outputs this model cannot produce yet |

Error responses:

- `400 BAD_REQUEST` — not a JPEG/PNG, empty, corrupt, or larger than 10 MB.
- `429 RATE_LIMITED` — per-IP assessment limit (10 requests / 60 s by default).
- `503 ERROR` — auth backend unconfigured/unreachable, or the detector is not
  loaded on this server.

The detector's ONNX artifact is not committed: `ASSESS_MODEL_PATH` points at a
deployed copy and `ASSESS_MODEL_SHA256` pins it. A missing or modified artifact
fails the boot rather than degrading a request.

## Rate limits and caching

- **Per-IP (geocode):** 10 requests per 10 seconds per client IP
  (configurable via `IP_RATE_LIMIT_MAX_REQUESTS` /
  `IP_RATE_LIMIT_WINDOW_SECONDS`). Exceeding it returns `429 RATE_LIMITED`.
- **Per-IP (chat):** 6 requests per 60 seconds per client IP
  (`CHAT_RATE_LIMIT_MAX_REQUESTS` / `CHAT_RATE_LIMIT_WINDOW_SECONDS`) —
  stricter because every call is a metered LLM request. Exceeding it returns
  `429 RATE_LIMITED`.
- **Per-IP (scan):** 10 requests per 60 seconds per client IP
  (`SCAN_RATE_LIMIT_MAX_REQUESTS` / `SCAN_RATE_LIMIT_WINDOW_SECONDS`) — OCR is
  CPU-bound, so it is rate-limited tighter than geocode. Exceeding it returns
  `429 RATE_LIMITED`.
- **Per-IP (assessment):** 10 requests per 60 seconds per client IP
  (`ASSESS_RATE_LIMIT_MAX_REQUESTS` / `ASSESS_RATE_LIMIT_WINDOW_SECONDS`) —
  detector inference is the heaviest request the API serves. Exceeding it
  returns `429 RATE_LIMITED`.
- **Nominatim:** the service enforces a hard 1 request/second throttle
  (`GEOCODE_MIN_INTERVAL_SECONDS`) and always sends
  `User-Agent: PalaySigla/<version> (<contact-email>)`.
- **Cache:** identical searches and near-identical coordinates (rounded to 4
  decimals) hit an in-memory cache instead of Nominatim for
  `GEOCODE_CACHE_TTL_SECONDS` (default 24 h). Chat responses are never
  cached.

## Local development

```bash
cd backend
.venv/bin/uvicorn app.main:app --port 8000
```

Interactive docs: `http://localhost:8000/docs`.
