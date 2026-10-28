"""Generate the shared scan-card template spec.

The JSON this writes is the single source of truth for the whole OCR feature:

- ``website/scripts/generateScanSheet.mjs`` tiles the cards on an A4 sheet and
  renders the printable PDF from it;
- the backend loads it to find the card's corner markers and crop every digit
  cell.

Cards are A6 (105 x 148.5 mm) so exactly four fit on one A4 page (2 x 2); the
farmer prints once, cuts a card, and each scan costs a quarter sheet.

Run this from the backend directory whenever the card layout changes:

    .venv/bin/python scripts/build_scan_spec.py

The output is committed; both consumers read it verbatim, so there is no
layout math to keep in sync across languages.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CARD_WIDTH_MM = 105.0
CARD_HEIGHT_MM = 148.5

SHEET_WIDTH_MM = 210.0
SHEET_HEIGHT_MM = 297.0
SHEET_COLUMNS = 2
SHEET_ROWS = 2

# Fiducials: the top-left one is larger so the card's orientation is
# unambiguous after the perspective warp. Detection is marker-first, so the
# card never depends on its border or background.
FIDUCIAL_MARGIN_MM = 6.0
FIDUCIAL_SIZE_MM = 6.0
FIDUCIAL_ANCHOR_SIZE_MM = 8.0

FIELD_LEFT_MM = 6.0
FIELD_WIDTH_MM = CARD_WIDTH_MM - 2 * FIELD_LEFT_MM
FIELD_TOP_MM = 26.0
FIELD_BOTTOM_MM = 136.0
FIELD_COUNT = 6
FIELD_ROW_HEIGHT_MM = (FIELD_BOTTOM_MM - FIELD_TOP_MM) / FIELD_COUNT
DIGIT_WIDTH_MM = 7.5
DIGIT_HEIGHT_MM = 13.0
DECIMAL_WIDTH_MM = 5.0
CELL_GAP_MM = 1.2
CELLS_RIGHT_MM = 97.0

TEMPLATE_NAME = "palaysigla-scan-card"
TEMPLATE_VERSION = 1
SCAN_SPEC_FILENAME = f"scan-sheet-v{TEMPLATE_VERSION}.json"

TITLE = "PalaySigla Scan Card"
INSTRUCTIONS = ("Write one digit per cell with a dark pen.",)

# key, label, unit, min, max, decimals, integer digits, fraction digits
FIELD_LAYOUT = (
    ("grain_length", "Grain length", "mm", 4.0, 12.0, 2, 2, 2),
    ("grain_width", "Grain width", "mm", 1.0, 9.99, 2, 1, 2),
    ("length_width_ratio", "Length-to-width ratio", "", 1.0, 9.99, 2, 1, 2),
    ("moisture_content", "Moisture content", "%", 5.0, 40.0, 1, 2, 1),
    ("temperature", "Temperature", "\u00b0C", 0.0, 60.0, 1, 2, 1),
    ("humidity", "Humidity", "%RH", 5.0, 100.0, 1, 2, 1),
)


def _rect(x_mm: float, y_mm: float, width_mm: float, height_mm: float) -> list[float]:
    return [
        round(x_mm / CARD_WIDTH_MM, 6),
        round(y_mm / CARD_HEIGHT_MM, 6),
        round(width_mm / CARD_WIDTH_MM, 6),
        round(height_mm / CARD_HEIGHT_MM, 6),
    ]


def _fiducials() -> list[dict[str, Any]]:
    margin = FIDUCIAL_MARGIN_MM
    size = FIDUCIAL_SIZE_MM
    anchor = FIDUCIAL_ANCHOR_SIZE_MM
    right = CARD_WIDTH_MM - margin - size
    bottom = CARD_HEIGHT_MM - margin - size
    return [
        {"id": "tl", "shape": "square", "rect": _rect(margin, margin, anchor, anchor)},
        {"id": "tr", "shape": "square", "rect": _rect(right, margin, size, size)},
        {"id": "br", "shape": "square", "rect": _rect(right, bottom, size, size)},
        {"id": "bl", "shape": "square", "rect": _rect(margin, bottom, size, size)},
    ]


def _cells(row_y_mm: float, integer_digits: int, fraction_digits: int) -> list[dict[str, Any]]:
    digit_count = integer_digits + fraction_digits
    total_width = digit_count * DIGIT_WIDTH_MM + DECIMAL_WIDTH_MM + digit_count * CELL_GAP_MM
    x_mm = CELLS_RIGHT_MM - total_width
    y_mm = row_y_mm + (FIELD_ROW_HEIGHT_MM - DIGIT_HEIGHT_MM) / 2

    cells: list[dict[str, Any]] = []
    for _ in range(integer_digits):
        cells.append({"kind": "digit", "rect": _rect(x_mm, y_mm, DIGIT_WIDTH_MM, DIGIT_HEIGHT_MM)})
        x_mm += DIGIT_WIDTH_MM + CELL_GAP_MM
    cells.append({"kind": "decimal", "rect": _rect(x_mm, y_mm, DECIMAL_WIDTH_MM, DIGIT_HEIGHT_MM)})
    x_mm += DECIMAL_WIDTH_MM + CELL_GAP_MM
    for _ in range(fraction_digits):
        cells.append({"kind": "digit", "rect": _rect(x_mm, y_mm, DIGIT_WIDTH_MM, DIGIT_HEIGHT_MM)})
        x_mm += DIGIT_WIDTH_MM + CELL_GAP_MM
    return cells


def build_spec() -> dict[str, Any]:
    fields: list[dict[str, Any]] = []
    for index, (key, label, unit, min_value, max_value, decimals, int_d, frac_d) in enumerate(
        FIELD_LAYOUT
    ):
        row_y = FIELD_TOP_MM + index * FIELD_ROW_HEIGHT_MM
        fields.append(
            {
                "key": key,
                "label": label,
                "unit": unit,
                "min": min_value,
                "max": max_value,
                "decimals": decimals,
                "block": _rect(FIELD_LEFT_MM, row_y, FIELD_WIDTH_MM, FIELD_ROW_HEIGHT_MM),
                "cells": _cells(row_y, int_d, frac_d),
            }
        )
    return {
        "template": TEMPLATE_NAME,
        "version": TEMPLATE_VERSION,
        "card": {"width_mm": CARD_WIDTH_MM, "height_mm": CARD_HEIGHT_MM},
        "sheet": {
            "width_mm": SHEET_WIDTH_MM,
            "height_mm": SHEET_HEIGHT_MM,
            "columns": SHEET_COLUMNS,
            "rows": SHEET_ROWS,
        },
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
