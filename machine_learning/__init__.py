"""Training tooling for the PalaySigla defect and mold detector.

Training dependencies (torch, ultralytics) live here on purpose: the FastAPI
backend only ever loads the exported ONNX artifact, so its deployment image
stays small enough for the Render free tier.
"""
