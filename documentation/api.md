# HTTP API

The backend serves the geocoding proxy and the Palay Assistant chat endpoint,
plus the health check. All responses use the project-wide envelope format.

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
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `ERROR` | Missing or invalid session (`/api/chat`). No 401-specific code exists; unmapped statuses fall back to `ERROR`. |
| 404 | `NOT_FOUND` | Resource missing (e.g. reverse geocode with no result) |
| 422 | `VALIDATION_ERROR` | Invalid query parameters or request body |
| 429 | `RATE_LIMITED` | Per-IP rate limit exceeded, or Groq is busy |
| 500 | `ERROR` | Unhandled server error |
| 502 | `UPSTREAM_ERROR` | Nominatim or Groq unreachable / errored |
| 503 | `ERROR` | Backend auth service not configured, or Supabase unreachable (`/api/chat`) |

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

## Rate limits and caching

- **Per-IP (geocode):** 10 requests per 10 seconds per client IP
  (configurable via `IP_RATE_LIMIT_MAX_REQUESTS` /
  `IP_RATE_LIMIT_WINDOW_SECONDS`). Exceeding it returns `429 RATE_LIMITED`.
- **Per-IP (chat):** 6 requests per 60 seconds per client IP
  (`CHAT_RATE_LIMIT_MAX_REQUESTS` / `CHAT_RATE_LIMIT_WINDOW_SECONDS`) —
  stricter because every call is a metered LLM request. Exceeding it returns
  `429 RATE_LIMITED`.
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
