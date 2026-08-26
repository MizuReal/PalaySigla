# HTTP API

The backend serves the geocoding proxy and the health check. All responses use
the project-wide envelope format.

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
| 404 | `NOT_FOUND` | Resource missing (e.g. reverse geocode with no result) |
| 422 | `VALIDATION_ERROR` | Invalid query parameters |
| 429 | `RATE_LIMITED` | Per-IP rate limit exceeded |
| 500 | `ERROR` | Unhandled server error |
| 502 | `UPSTREAM_ERROR` | Nominatim unreachable or errored |

Timestamps in responses are UTC ISO 8601 (the geocoding endpoints currently
return none).

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

## Rate limits and caching

- **Per-IP:** 10 requests per 10 seconds per client IP (configurable via
  `IP_RATE_LIMIT_MAX_REQUESTS` / `IP_RATE_LIMIT_WINDOW_SECONDS`). Exceeding it
  returns `429 RATE_LIMITED`.
- **Nominatim:** the service enforces a hard 1 request/second throttle
  (`GEOCODE_MIN_INTERVAL_SECONDS`) and always sends
  `User-Agent: PalaySigla/<version> (<contact-email>)`.
- **Cache:** identical searches and near-identical coordinates (rounded to 4
  decimals) hit an in-memory cache instead of Nominatim for
  `GEOCODE_CACHE_TTL_SECONDS` (default 24 h).

## Local development

```bash
cd backend
.venv/bin/uvicorn app.main:app --port 8000
```

Interactive docs: `http://localhost:8000/docs`.
