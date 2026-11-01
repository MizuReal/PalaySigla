# Backend

FastAPI backend for PalaySigla — Nominatim geocoding proxy, the Palay
Assistant chat endpoint (Groq-hosted LLM, server-side Supabase JWT auth),
scan-sheet OCR, grain defect detection (YOLO11-S via ONNX Runtime), and a
health check. Deploys on Render from `render.yaml`; both models load once at
boot and a missing or hash-mismatched artifact fails startup.

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
