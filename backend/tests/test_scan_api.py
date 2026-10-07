from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.main import create_app
from app.ml.scan.digits import ScanModelError
from app.ml.scan.spec import load_scan_sheet_spec
from tests.scan_fixtures import (
    FakeDigitClassifier,
    encode_png,
    render_synthetic_photo,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = REPO_ROOT / "ocr_templates"


@pytest.fixture
def client():
    app = create_app(scan_engine=FakeDigitClassifier())
    app.dependency_overrides[get_current_user] = lambda: "user-1"
    with TestClient(app) as test_client:
        yield test_client


def _sheet_png() -> bytes:
    return encode_png(render_synthetic_photo(load_scan_sheet_spec(TEMPLATES_DIR)))


def test_scan_endpoint_returns_the_envelope_with_fields(client):
    response = client.post(
        "/api/scan/ocr",
        files={"file": ("sheet.png", _sheet_png(), "image/png")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    values = {field["key"]: field["value"] for field in body["data"]["fields"]}
    assert values["grain_length"] == 7.12
    assert body["data"]["overall_needs_review"] is False


def test_scan_endpoint_rejects_non_image_uploads(client):
    response = client.post(
        "/api/scan/ocr",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "BAD_REQUEST"


def test_scan_endpoint_reports_a_missing_sheet(client):
    flat = np.full((900, 700, 3), 180, dtype=np.uint8)

    response = client.post(
        "/api/scan/ocr",
        files={"file": ("flat.png", encode_png(flat), "image/png")},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_scan_endpoint_requires_authentication():
    app = create_app(scan_engine=FakeDigitClassifier())
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/scan/ocr",
            files={"file": ("sheet.png", _sheet_png(), "image/png")},
        )

    assert response.status_code == 401


def test_boot_fails_without_the_digit_model(monkeypatch):
    monkeypatch.setenv("SCAN_DIGIT_MODEL_PATH", "")
    get_settings.cache_clear()
    try:
        with pytest.raises(ScanModelError), TestClient(create_app()):
            pass
    finally:
        get_settings.cache_clear()
