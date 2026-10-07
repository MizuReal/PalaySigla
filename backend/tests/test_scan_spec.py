import json
from pathlib import Path

import pytest

from app.ml.scan.spec import (
    GRAIN_LENGTH_KEY,
    GRAIN_WIDTH_KEY,
    RATIO_KEY,
    ScanSpecError,
    load_scan_sheet_spec,
    parse_scan_sheet_spec,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = REPO_ROOT / "ocr_templates"
EXPECTED_FIELD_KEYS = {
    GRAIN_LENGTH_KEY,
    GRAIN_WIDTH_KEY,
    RATIO_KEY,
    "moisture_content",
    "temperature",
    "humidity",
}


def test_committed_spec_loads_and_covers_six_fields():
    spec = load_scan_sheet_spec(TEMPLATES_DIR)

    assert spec.version == 1
    assert {field.key for field in spec.fields} == EXPECTED_FIELD_KEYS
    assert spec.canonical_width_px == 2100
    assert spec.canonical_height_px == 2970
    for field in spec.fields:
        assert field.digit_cells
        assert field.integer_digits > 0
        assert field.min_value < field.max_value


def test_spec_rejects_cell_outside_the_page():
    payload = json.loads((TEMPLATES_DIR / "scan-sheet-v1.json").read_text(encoding="utf-8"))
    payload["fields"][0]["cells"][0]["rect"] = [0.9, 0.9, 0.5, 0.1]

    with pytest.raises(ScanSpecError):
        parse_scan_sheet_spec(payload)


def test_spec_rejects_missing_fiducial():
    payload = json.loads((TEMPLATES_DIR / "scan-sheet-v1.json").read_text(encoding="utf-8"))
    payload["fiducials"] = payload["fiducials"][:3]

    with pytest.raises(ScanSpecError):
        parse_scan_sheet_spec(payload)


def test_missing_spec_file_raises(tmp_path: Path):
    with pytest.raises(ScanSpecError):
        load_scan_sheet_spec(tmp_path)
