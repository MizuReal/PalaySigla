"""Shared fixtures for the scan tests: synthetic card photos and a fake
classifier so the suite never loads a real model.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.ml.scan.digits import DigitPrediction
from app.ml.scan.spec import ScanSheetSpec

# Reading order matches the spec's field/cell order (left to right, top to
# bottom): grain length 7.12, grain width 2.34, ratio 3.05, moisture 14.2,
# temperature 31.5, humidity 65.3.
SCRIPTED_DIGITS = (
    0,
    7,
    1,
    2,
    2,
    3,
    4,
    3,
    0,
    5,
    1,
    4,
    2,
    3,
    1,
    5,
    6,
    5,
    3,
)

CARD_WIDTH_PX = 1600
TILED_CARD_WIDTH_PX = 760
SCENE_MARGIN_PX = 60
BACKGROUND_GRAY = 40
PAPER_GRAY = 255
MARKER_GRAY = 0
FILLED_DIGIT_RADIUS_RATIO = 0.3
CLASSIFIER_CONFIDENCE = 0.95
SHEET_COLUMNS = 2
SHEET_ROWS = 2


class FakeDigitClassifier:
    """Returns scripted digits in call order; records how many cells it saw."""

    def __init__(self, digits: tuple[int, ...] = SCRIPTED_DIGITS) -> None:
        self._digits = digits
        self.calls = 0
        self.cell_count = 0

    def predict(self, cells: list[np.ndarray]) -> list[DigitPrediction]:
        self.calls += 1
        self.cell_count = len(cells)
        return [
            DigitPrediction(
                digit=self._digits[index],
                confidence=CLASSIFIER_CONFIDENCE,
                is_blank=False,
            )
            for index in range(len(cells))
        ]


def digits_with_ratio(
    first_ratio_digit: int, second_ratio_digit: int, third_ratio_digit: int
) -> tuple[int, ...]:
    digits = list(SCRIPTED_DIGITS)
    digits[7:10] = (first_ratio_digit, second_ratio_digit, third_ratio_digit)
    return tuple(digits)


def _card_height_px(spec: ScanSheetSpec, card_width_px: int) -> int:
    return round(card_width_px * spec.card_height_mm / spec.card_width_mm)


def _draw_card(
    canvas: np.ndarray,
    spec: ScanSheetSpec,
    origin_x: int,
    origin_y: int,
    card_width_px: int,
    skipped_cells: frozenset[tuple[str, int]],
) -> None:
    card_height_px = _card_height_px(spec, card_width_px)
    cv2.rectangle(
        canvas,
        (origin_x, origin_y),
        (origin_x + card_width_px, origin_y + card_height_px),
        (PAPER_GRAY, PAPER_GRAY, PAPER_GRAY),
        -1,
    )

    def to_px(rect: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
        x, y, width, height = rect
        return (
            origin_x + round(x * card_width_px),
            origin_y + round(y * card_height_px),
            round(width * card_width_px),
            round(height * card_height_px),
        )

    for fiducial in spec.fiducials:
        x, y, width, height = to_px(fiducial.rect)
        cv2.rectangle(
            canvas,
            (x, y),
            (x + width, y + height),
            (MARKER_GRAY, MARKER_GRAY, MARKER_GRAY),
            -1,
        )
    for field_spec in spec.fields:
        cell_index = 0
        for cell in field_spec.cells:
            if not cell.is_digit:
                continue
            if (field_spec.key, cell_index) not in skipped_cells:
                x, y, width, height = to_px(cell.rect)
                center = (x + width // 2, y + height // 2)
                radius = max(2, round(min(width, height) * FILLED_DIGIT_RADIUS_RATIO))
                cv2.circle(canvas, center, radius, (MARKER_GRAY, MARKER_GRAY, MARKER_GRAY), -1)
            cell_index += 1


def render_synthetic_photo(
    spec: ScanSheetSpec,
    skipped_cells: frozenset[tuple[str, int]] = frozenset(),
) -> np.ndarray:
    """One card on a dark background, filling the frame."""
    card_width_px = CARD_WIDTH_PX
    card_height_px = _card_height_px(spec, card_width_px)
    canvas = np.full(
        (card_height_px + 2 * SCENE_MARGIN_PX, card_width_px + 2 * SCENE_MARGIN_PX, 3),
        BACKGROUND_GRAY,
        dtype=np.uint8,
    )
    _draw_card(canvas, spec, SCENE_MARGIN_PX, SCENE_MARGIN_PX, card_width_px, skipped_cells)
    return canvas


def render_tiled_photo(
    spec: ScanSheetSpec,
    skipped_cells: frozenset[tuple[str, int]] = frozenset(),
) -> np.ndarray:
    """Four cards tiled 2x2 like the printed sheet, photographed whole."""
    card_width_px = TILED_CARD_WIDTH_PX
    card_height_px = _card_height_px(spec, card_width_px)
    width = SHEET_COLUMNS * card_width_px + 2 * SCENE_MARGIN_PX
    height = SHEET_ROWS * card_height_px + 2 * SCENE_MARGIN_PX
    canvas = np.full((height, width, 3), BACKGROUND_GRAY, dtype=np.uint8)
    for row in range(SHEET_ROWS):
        for column in range(SHEET_COLUMNS):
            _draw_card(
                canvas,
                spec,
                SCENE_MARGIN_PX + column * card_width_px,
                SCENE_MARGIN_PX + row * card_height_px,
                card_width_px,
                skipped_cells,
            )
    return canvas


def encode_png(image: np.ndarray) -> bytes:
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise RuntimeError("Failed to encode the test image.")
    return buffer.tobytes()
