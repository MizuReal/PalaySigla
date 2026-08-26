# Backend

FastAPI backend for PalaySigla — Nominatim geocoding proxy + health check.

Setup, env vars, tests, and API details: see
[`documentation/backend.md`](../documentation/backend.md) and
[`documentation/api.md`](../documentation/api.md).

Quick start:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --port 8000
```
