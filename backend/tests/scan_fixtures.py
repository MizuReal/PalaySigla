"""Shared fixtures for the scan tests: a synthetic sheet photo and a fake
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

PAGE_WIDTH_PX = 1600
PAGE_MARGIN_PX = 60
BACKGROUND_GRAY = 40
PAPER_GRAY = 255
MARKER_GRAY = 0
FILLED_DIGIT_RADIUS_RATIO = 0.3
CLASSIFIER_CONFIDENCE = 0.95


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


def render_synthetic_photo(
    spec: ScanSheetSpec,
    skipped_cells: frozenset[tuple[str, int]] = frozenset(),
) -> np.ndarray:
    page_height = round(PAGE_WIDTH_PX * spec.page_height_mm / spec.page_width_mm)
    canvas = np.full(
        (page_height + 2 * PAGE_MARGIN_PX, PAGE_WIDTH_PX + 2 * PAGE_MARGIN_PX, 3),
        BACKGROUND_GRAY,
        dtype=np.uint8,
    )
    cv2.rectangle(
        canvas,
        (PAGE_MARGIN_PX, PAGE_MARGIN_PX),
        (PAGE_MARGIN_PX + PAGE_WIDTH_PX, PAGE_MARGIN_PX + page_height),
        (PAPER_GRAY, PAPER_GRAY, PAPER_GRAY),
        -1,
    )

    def to_px(rect: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
        x, y, width, height = rect
        return (
            PAGE_MARGIN_PX + round(x * PAGE_WIDTH_PX),
            PAGE_MARGIN_PX + round(y * page_height),
            round(width * PAGE_WIDTH_PX),
            round(height * page_height),
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
                radius = round(min(width, height) * FILLED_DIGIT_RADIUS_RATIO)
                cv2.circle(canvas, center, radius, (MARKER_GRAY, MARKER_GRAY, MARKER_GRAY), -1)
            cell_index += 1
    return canvas


def encode_png(image: np.ndarray) -> bytes:
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise RuntimeError("Failed to encode the test image.")
    return buffer.tobytes()


def digits_with_ratio(
    first_ratio_digit: int, second_ratio_digit: int, third_ratio_digit: int
) -> tuple[int, ...]:
    digits = list(SCRIPTED_DIGITS)
    digits[7:10] = (first_ratio_digit, second_ratio_digit, third_ratio_digit)
    return tuple(digits)
