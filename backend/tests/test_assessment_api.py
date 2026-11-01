import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.main import create_app
from app.ml.detection.detector import DetectorError
from tests.assessment_fixtures import FakeDetector, encode_image, make_detection
from tests.scan_fixtures import FakeDigitClassifier

ENDPOINT = "/api/assessments/image"


@pytest.fixture
def client():
    app = create_app(
        scan_engine=FakeDigitClassifier(),
        detector=FakeDetector([make_detection(confidence=0.9)]),
    )
    app.dependency_overrides[get_current_user] = lambda: "user-1"
    with TestClient(app) as test_client:
        yield test_client


def test_assessment_returns_the_envelope_with_detections(client):
    response = client.post(
        ENDPOINT,
        files={"file": ("paddy.png", encode_image(), "image/png")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    data = body["data"]
    assert data["counts"]["mold_discoloration"] == 1
    assert data["severity"] in {"none", "low", "moderate", "high"}
    assert data["quality_status"] in {"premium", "good", "fair", "poor"}
    assert data["available_outputs"] == ["mold", "quality_status"]
    assert data["unavailable_outputs"] == ["market_grade", "variety"]
    assert len(data["detections"]) == 1


def test_assessment_requires_auth():
    app = create_app(
        scan_engine=FakeDigitClassifier(),
        detector=FakeDetector(),
    )
    with TestClient(app) as anonymous_client:
        response = anonymous_client.post(
            ENDPOINT,
            files={"file": ("paddy.png", encode_image(), "image/png")},
        )

    assert response.status_code == 401


def test_assessment_rejects_unsupported_content_type(client):
    response = client.post(
        ENDPOINT,
        files={"file": ("paddy.pdf", b"%PDF-1.4", "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "BAD_REQUEST"


def test_boot_fails_fast_without_a_detector_artifact():
    with pytest.raises(DetectorError), TestClient(create_app(scan_engine=FakeDigitClassifier())):
        pass
