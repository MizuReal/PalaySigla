from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.ml.scan.spec import load_scan_sheet_spec
from app.services.scan import ScanService
from tests.scan_fixtures import (
    FakeDigitClassifier,
    digits_with_ratio,
    encode_png,
    render_synthetic_photo,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = REPO_ROOT / "ocr_templates"

EXPECTED_VALUES = {
    "grain_length": 7.12,
    "grain_width": 2.34,
    "length_width_ratio": 3.05,
    "moisture_content": 14.2,
    "temperature": 31.5,
    "humidity": 65.3,
}


def _service(classifier: FakeDigitClassifier) -> ScanService:
    spec = load_scan_sheet_spec(TEMPLATES_DIR)
    settings = Settings(_env_file=None)
    return ScanService(
        spec=spec,
        classifier=classifier,
        executor=ThreadPoolExecutor(max_workers=1),
        settings=settings,
    )


def _spec():
    return load_scan_sheet_spec(TEMPLATES_DIR)


async def test_pipeline_extracts_scripted_values_from_a_sheet_photo():
    classifier = FakeDigitClassifier()
    service = _service(classifier)

    data = await service.process(encode_png(render_synthetic_photo(_spec())), "image/png")

    values = {field.key: field.value for field in data.fields}
    assert values == EXPECTED_VALUES
    assert data.computed_ratio == pytest.approx(3.0427, abs=1e-3)
    assert data.overall_needs_review is False
    assert classifier.cell_count == 19


async def test_blank_cell_leaves_the_field_unreadable_and_flagged():
    classifier = FakeDigitClassifier()
    service = _service(classifier)
    photo = render_synthetic_photo(_spec(), skipped_cells=frozenset({("grain_length", 1)}))

    data = await service.process(encode_png(photo), "image/png")

    length = next(field for field in data.fields if field.key == "grain_length")
    assert length.value is None
    assert length.needs_review is True
    assert length.confidence == 0.0
    assert data.overall_needs_review is True


async def test_ratio_mismatch_flags_the_ratio_field():
    classifier = FakeDigitClassifier(digits=digits_with_ratio(9, 9, 9))
    service = _service(classifier)

    data = await service.process(encode_png(render_synthetic_photo(_spec())), "image/png")

    ratio = next(field for field in data.fields if field.key == "length_width_ratio")
    assert ratio.value == pytest.approx(9.99)
    assert ratio.needs_review is True


async def test_unreadable_photo_is_rejected_as_not_a_sheet():
    flat = np.full((900, 700, 3), 180, dtype=np.uint8)
    service = _service(FakeDigitClassifier())

    with pytest.raises(HTTPException) as error:
        await service.process(encode_png(flat), "image/png")

    assert error.value.status_code == 422


async def test_wrong_content_type_is_rejected():
    service = _service(FakeDigitClassifier())

    with pytest.raises(HTTPException) as error:
        await service.process(b"not-an-image", "text/plain")

    assert error.value.status_code == 400
