import cv2
import numpy as np
import pytest

from app.ml.scan.spec import load_scan_sheet_spec
from app.ml.scan.warp import ScanFormNotFoundError, crop_cells, warp_to_canonical
from tests.scan_fixtures import (
    BACKGROUND_GRAY,
    render_shadowed_photo,
    render_synthetic_photo,
    render_tiled_photo,
)

EXPECTED_DIGIT_CELLS = 19
BORDER_BAND_RATIO = 0.10
DARK_PIXEL_THRESHOLD = 128
MAX_BORDER_DARK_FRACTION = 0.01


@pytest.fixture
def spec():
    from pathlib import Path

    templates_dir = Path(__file__).resolve().parents[2] / "ocr_templates"
    return load_scan_sheet_spec(templates_dir)


def _outer_band_dark_fraction(image: np.ndarray) -> float:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape[:2]
    band = max(2, round(min(height, width) * BORDER_BAND_RATIO))
    mask = np.ones_like(gray, dtype=bool)
    mask[band : height - band, band : width - band] = False
    return float((gray[mask] < DARK_PIXEL_THRESHOLD).mean())


def test_warps_a_single_card(spec):
    result = warp_to_canonical(render_synthetic_photo(spec), spec)

    assert result.image.shape[0] == spec.canonical_height_px
    assert result.image.shape[1] == spec.canonical_width_px
    assert len(crop_cells(result.image, spec)) == EXPECTED_DIGIT_CELLS


def test_finds_a_card_inside_an_uncut_tiled_sheet(spec):
    result = warp_to_canonical(render_tiled_photo(spec), spec)

    assert len(crop_cells(result.image, spec)) == EXPECTED_DIGIT_CELLS


def test_accepts_a_rotated_card(spec):
    photo = render_synthetic_photo(spec)
    pad = 420
    padded = cv2.copyMakeBorder(
        photo,
        pad,
        pad,
        pad,
        pad,
        cv2.BORDER_CONSTANT,
        value=(BACKGROUND_GRAY, BACKGROUND_GRAY, BACKGROUND_GRAY),
    )
    height, width = padded.shape[:2]
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), -7.0, 1.0)
    rotated = cv2.warpAffine(padded, matrix, (width, height), borderValue=(BACKGROUND_GRAY,) * 3)

    result = warp_to_canonical(rotated, spec)

    assert len(crop_cells(result.image, spec)) == EXPECTED_DIGIT_CELLS


def test_warps_a_photo_with_shadow_bridges_at_the_bottom_markers(spec):
    result = warp_to_canonical(render_shadowed_photo(spec), spec)

    assert len(crop_cells(result.image, spec)) == EXPECTED_DIGIT_CELLS


def test_cell_crops_exclude_the_printed_cell_border(spec):
    result = warp_to_canonical(render_synthetic_photo(spec), spec)

    fractions = [_outer_band_dark_fraction(crop.image) for crop in crop_cells(result.image, spec)]

    assert fractions
    assert max(fractions) < MAX_BORDER_DARK_FRACTION


def test_rejects_an_image_without_a_card(spec):
    flat = np.full((900, 700, 3), 180, dtype=np.uint8)

    with pytest.raises(ScanFormNotFoundError):
        warp_to_canonical(flat, spec)
