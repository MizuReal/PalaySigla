# Backend

FastAPI backend for PalaySigla — Nominatim geocoding proxy, the Palay
Assistant chat endpoint (Groq-hosted LLM, server-side Supabase JWT auth), and
a health check. ML inference is planned but not yet implemented.

Setup, env vars, tests, and API details: see
[`documentation/backend.md`](../documentation/backend.md) and
[`documentation/api.md`](../documentation/api.md).

Quick start:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env   # fill SUPABASE_* + GROQ_CHATBOT_API_KEY for the assistant
.venv/bin/uvicorn app.main:app --port 8000
```
