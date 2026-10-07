"""Generate the shared scan-sheet template spec.

The JSON this writes is the single source of truth for the whole OCR feature:

- ``website/scripts/generateScanSheet.mjs`` renders the printable PDF from it;
- the backend loads it to warp captured photos and crop every digit cell.

Run this from the backend directory whenever the sheet layout changes:

    .venv/bin/python scripts/build_scan_spec.py

The output is committed; both consumers read it verbatim, so there is no
layout math to keep in sync across languages.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

PAGE_WIDTH_MM = 210.0
PAGE_HEIGHT_MM = 297.0

# Fiducials: the top-left one is larger so page orientation is unambiguous
# after the perspective warp (all four sit on otherwise symmetric corners).
FIDUCIAL_MARGIN_MM = 10.0
FIDUCIAL_SIZE_MM = 10.0
FIDUCIAL_ANCHOR_SIZE_MM = 14.0

FIELD_COLUMN_X_MM = (20.0, 110.0)
FIELD_ROW_Y_MM = (80.0, 140.0, 200.0)
BLOCK_WIDTH_MM = 80.0
BLOCK_HEIGHT_MM = 52.0
CELLS_Y_OFFSET_MM = 22.0
DIGIT_WIDTH_MM = 15.0
DIGIT_HEIGHT_MM = 20.0
DECIMAL_WIDTH_MM = 6.0
CELL_GAP_MM = 2.0

TEMPLATE_NAME = "palaysigla-scan-sheet"
TEMPLATE_VERSION = 1
SCAN_SPEC_FILENAME = f"scan-sheet-v{TEMPLATE_VERSION}.json"

TITLE = "PalaySigla Scan Sheet"
INSTRUCTIONS = (
    "Write one digit per cell using a dark pen.",
    "Use the printed decimal point.",
    "Keep all four corner marks visible in the photo.",
)

# key, label, unit, min, max, decimals, integer digits, fraction digits, col, row
FIELD_LAYOUT = (
    ("grain_length", "Grain length", "mm", 4.0, 12.0, 2, 2, 2, 0, 0),
    ("grain_width", "Grain width", "mm", 1.0, 9.99, 2, 1, 2, 1, 0),
    ("length_width_ratio", "Length-to-width ratio", "", 1.0, 9.99, 2, 1, 2, 0, 1),
    ("moisture_content", "Moisture content", "%", 5.0, 40.0, 1, 2, 1, 1, 1),
    ("temperature", "Temperature", "\u00b0C", 0.0, 60.0, 1, 2, 1, 0, 2),
    ("humidity", "Humidity", "%RH", 5.0, 100.0, 1, 2, 1, 1, 2),
)


def _rect(x_mm: float, y_mm: float, width_mm: float, height_mm: float) -> list[float]:
    return [
        round(x_mm / PAGE_WIDTH_MM, 6),
        round(y_mm / PAGE_HEIGHT_MM, 6),
        round(width_mm / PAGE_WIDTH_MM, 6),
        round(height_mm / PAGE_HEIGHT_MM, 6),
    ]


def _fiducials() -> list[dict[str, Any]]:
    margin = FIDUCIAL_MARGIN_MM
    size = FIDUCIAL_SIZE_MM
    anchor = FIDUCIAL_ANCHOR_SIZE_MM
    right = PAGE_WIDTH_MM - margin - size
    bottom = PAGE_HEIGHT_MM - margin - size
    return [
        {"id": "tl", "shape": "square", "rect": _rect(margin, margin, anchor, anchor)},
        {"id": "tr", "shape": "square", "rect": _rect(right, margin, size, size)},
        {"id": "br", "shape": "square", "rect": _rect(right, bottom, size, size)},
        {"id": "bl", "shape": "square", "rect": _rect(margin, bottom, size, size)},
    ]


def _cells(
    block_x_mm: float, cells_y_mm: float, integer_digits: int, fraction_digits: int
) -> list[dict[str, Any]]:
    cells: list[dict[str, Any]] = []
    x_mm = block_x_mm
    for _ in range(integer_digits):
        cells.append(
            {"kind": "digit", "rect": _rect(x_mm, cells_y_mm, DIGIT_WIDTH_MM, DIGIT_HEIGHT_MM)}
        )
        x_mm += DIGIT_WIDTH_MM + CELL_GAP_MM
    cells.append(
        {"kind": "decimal", "rect": _rect(x_mm, cells_y_mm, DECIMAL_WIDTH_MM, DIGIT_HEIGHT_MM)}
    )
    x_mm += DECIMAL_WIDTH_MM + CELL_GAP_MM
    for _ in range(fraction_digits):
        cells.append(
            {"kind": "digit", "rect": _rect(x_mm, cells_y_mm, DIGIT_WIDTH_MM, DIGIT_HEIGHT_MM)}
        )
        x_mm += DIGIT_WIDTH_MM + CELL_GAP_MM
    return cells


def build_spec() -> dict[str, Any]:
    fields: list[dict[str, Any]] = []
    for key, label, unit, min_value, max_value, decimals, int_d, frac_d, col, row in FIELD_LAYOUT:
        block_x = FIELD_COLUMN_X_MM[col]
        block_y = FIELD_ROW_Y_MM[row]
        fields.append(
            {
                "key": key,
                "label": label,
                "unit": unit,
                "min": min_value,
                "max": max_value,
                "decimals": decimals,
                "block": _rect(block_x, block_y, BLOCK_WIDTH_MM, BLOCK_HEIGHT_MM),
                "cells": _cells(block_x, block_y + CELLS_Y_OFFSET_MM, int_d, frac_d),
            }
        )
    return {
        "template": TEMPLATE_NAME,
        "version": TEMPLATE_VERSION,
        "page": {"width_mm": PAGE_WIDTH_MM, "height_mm": PAGE_HEIGHT_MM},
        "title": TITLE,
        "instructions": list(INSTRUCTIONS),
        "fiducials": _fiducials(),
        "fields": fields,
    }


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    output_path = repo_root / "ocr_templates" / SCAN_SPEC_FILENAME
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(build_spec(), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
