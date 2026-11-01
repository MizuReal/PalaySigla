from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.ml.detection.constants import (
    SEVERITY_HIGH,
    SEVERITY_LOW,
    SEVERITY_MODERATE,
    SEVERITY_NONE,
)
from app.ml.detection.postprocess import RawDetection
from app.services.assessment import AssessmentService, classify_severity
from tests.assessment_fixtures import FakeDetector, encode_image, make_detection


def _service(detections: list[RawDetection], **overrides) -> AssessmentService:
    settings = Settings(_env_file=None, **overrides)
    return AssessmentService(
        detector=FakeDetector(detections),
        executor=ThreadPoolExecutor(max_workers=1),
        settings=settings,
    )


async def test_process_aggregates_detections_into_a_reviewable_result() -> None:
    detections = [
        make_detection(confidence=0.9, box=(0.0, 0.0, 128.0, 128.0)),
        make_detection(confidence=0.8, box=(640.0, 640.0, 768.0, 768.0)),
    ]
    service = _service(detections)

    data = await service.process(encode_image(), "image/png")

    assert data.counts == {"mold_discoloration": 2}
    assert data.defect_rate == pytest.approx(0.02)
    assert data.severity == SEVERITY_MODERATE
    assert data.quality_status == "fair"
    assert data.needs_review is False
    assert data.detections[0].box == [0.0, 0.0, 0.1, 0.1]
    assert data.available_outputs == ["mold", "quality_status"]
    assert data.unavailable_outputs == ["market_grade", "variety"]
    assert data.imgsz == 1280
    assert data.inference_ms >= 0


async def test_empty_result_reports_no_defects() -> None:
    service = _service([])

    data = await service.process(encode_image(), "image/png")

    assert data.counts == {"mold_discoloration": 0}
    assert data.defect_rate == 0.0
    assert data.severity == SEVERITY_NONE
    assert data.quality_status == "premium"
    assert data.needs_review is False


async def test_low_confidence_detection_sets_needs_review() -> None:
    service = _service(
        [make_detection(confidence=0.40)],
        assess_review_confidence_threshold=0.55,
    )

    data = await service.process(encode_image(), "image/png")

    assert data.needs_review is True
    assert data.detections[0].confidence == pytest.approx(0.4)


async def test_detector_receives_the_decoded_photo_untouched() -> None:
    detector = FakeDetector([])
    service = AssessmentService(
        detector=detector,
        executor=ThreadPoolExecutor(max_workers=1),
        settings=Settings(_env_file=None),
    )

    await service.process(encode_image(width=1600, height=900), "image/png")

    assert detector.image_shape == (900, 1600, 3)


async def test_rejects_non_image_content_type() -> None:
    service = _service([])

    with pytest.raises(HTTPException) as error:
        await service.process(b"not an image", "application/pdf")

    assert error.value.status_code == 400


async def test_rejects_oversized_payload() -> None:
    service = _service([], assess_max_image_bytes=1024)

    with pytest.raises(HTTPException) as error:
        await service.process(b"x" * 2048, "image/jpeg")

    assert error.value.status_code == 400


async def test_rejects_corrupt_image_bytes() -> None:
    service = _service([])

    with pytest.raises(HTTPException) as error:
        await service.process(b"\xff\xd8not-a-real-jpeg", "image/jpeg")

    assert error.value.status_code == 400


def test_classify_severity_bands() -> None:
    assert classify_severity(0.0) == SEVERITY_NONE
    assert classify_severity(0.001) == SEVERITY_NONE
    assert classify_severity(0.0026) == SEVERITY_LOW
    assert classify_severity(0.0099) == SEVERITY_LOW
    assert classify_severity(0.011) == SEVERITY_MODERATE
    assert classify_severity(0.031) == SEVERITY_HIGH
