"""Scan-sheet template spec.

Loads ``ocr_templates/scan-sheet-v1.json`` — the shared contract between the
printable PDF (rendered by the website) and this recognizer. Every geometric
value is normalized to the page (``[x, y, w, h]`` with a top-left origin), so
the same numbers drive PDF points and canonical pixels.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

Rect = tuple[float, float, float, float]

SCAN_SPEC_FILENAME = "scan-sheet-v1.json"

# Canonical warp target: A4 portrait at ~254 dpi. A 15 mm digit cell renders
# ~150 px wide here, which is comfortably more than any model input needs.
CANONICAL_WIDTH_PX = 2100

# Digit-cell preprocessing constants (must match scripts/train_digit_model.py).
DIGIT_INPUT_SIZE = 28
DIGIT_CONTENT_SIZE = 20
BLANK_INK_RATIO = 0.02
MNIST_MEAN = 0.1307
MNIST_STD = 0.3081

# Cell crops are padded outward so a digit touching a printed border is not
# clipped before classification.
CELL_CROP_MARGIN_RATIO = 0.08

# Fiducial search: window size relative to the expected marker, and the
# minimum ink-covered fraction before a contour counts as a marker.
FIDUCIAL_SEARCH_WINDOW_SCALE = 2.5
FIDUCIAL_MIN_AREA_RATIO = 0.2

# Plausibility gates after the coarse warp: a real marker sits near its
# expected spot with a sane area, and the anchor is visibly larger than the
# other three (this is what proves the sheet's orientation).
FIDUCIAL_MAX_OFFSET_RATIO = 1.5
FIDUCIAL_AREA_TOLERANCE = (0.4, 2.5)
ANCHOR_SIZE_FACTOR = 1.15

# The layout is anchored by a larger top-left marker; all four corners are
# otherwise symmetric, so the marker size is what disambiguates orientation.
ANCHOR_FIDUCIAL_ID = "tl"
EXPECTED_FIDUCIAL_IDS = ("tl", "tr", "br", "bl")

# Field keys the report layer cross-checks (length / width derive the ratio).
GRAIN_LENGTH_KEY = "grain_length"
GRAIN_WIDTH_KEY = "grain_width"
RATIO_KEY = "length_width_ratio"

CIRCUMFERENCE_APPROX_EPSILON = 0.02


class ScanSpecError(ValueError):
    """Raised when the template spec is missing or malformed."""


@dataclass(frozen=True)
class CellSpec:
    kind: str
    rect: Rect

    @property
    def is_digit(self) -> bool:
        return self.kind == "digit"


@dataclass(frozen=True)
class FiducialSpec:
    id: str
    shape: str
    rect: Rect


@dataclass(frozen=True)
class FieldSpec:
    key: str
    label: str
    unit: str
    min_value: float
    max_value: float
    decimals: int
    block: Rect
    cells: tuple[CellSpec, ...]

    @property
    def digit_cells(self) -> tuple[CellSpec, ...]:
        return tuple(cell for cell in self.cells if cell.is_digit)

    @property
    def integer_digits(self) -> int:
        count = 0
        for cell in self.cells:
            if cell.kind == "decimal":
                break
            if cell.is_digit:
                count += 1
        return count


@dataclass(frozen=True)
class ScanSheetSpec:
    version: int
    page_width_mm: float
    page_height_mm: float
    title: str
    instructions: tuple[str, ...]
    fiducials: tuple[FiducialSpec, ...]
    fields: tuple[FieldSpec, ...]

    @property
    def canonical_width_px(self) -> int:
        return CANONICAL_WIDTH_PX

    @property
    def canonical_height_px(self) -> int:
        return round(CANONICAL_WIDTH_PX * self.page_height_mm / self.page_width_mm)

    def field(self, key: str) -> FieldSpec:
        for field_spec in self.fields:
            if field_spec.key == key:
                return field_spec
        raise ScanSpecError(f"Unknown scan field: {key}")


def _parse_rect(value: object, label: str) -> Rect:
    if not isinstance(value, list) or len(value) != 4:
        raise ScanSpecError(f"{label} must be a [x, y, w, h] list.")
    rect = tuple(float(part) for part in value)
    x, y, width, height = rect
    if width <= 0 or height <= 0:
        raise ScanSpecError(f"{label} must have a positive size.")
    if x < 0 or y < 0 or x + width > 1.0001 or y + height > 1.0001:
        raise ScanSpecError(f"{label} must lie inside the page.")
    return rect


def _parse_field(raw: object, index: int) -> FieldSpec:
    if not isinstance(raw, dict):
        raise ScanSpecError(f"fields[{index}] must be an object.")
    label = str(raw.get("label", f"field {index}"))
    cells_raw = raw.get("cells")
    if not isinstance(cells_raw, list) or not cells_raw:
        raise ScanSpecError(f"{label}: at least one cell is required.")
    cells: list[CellSpec] = []
    for cell_index, cell_raw in enumerate(cells_raw):
        if not isinstance(cell_raw, dict):
            raise ScanSpecError(f"{label}: cells[{cell_index}] must be an object.")
        kind = str(cell_raw.get("kind", ""))
        if kind not in ("digit", "decimal"):
            raise ScanSpecError(f"{label}: cells[{cell_index}] has an unknown kind.")
        cells.append(CellSpec(kind=kind, rect=_parse_rect(cell_raw.get("rect"), label)))
    digit_count = sum(1 for cell in cells if cell.is_digit)
    if digit_count == 0:
        raise ScanSpecError(f"{label}: at least one digit cell is required.")
    if all(cell.is_digit for cell in cells):
        raise ScanSpecError(f"{label}: a decimal cell is required.")
    min_value = float(raw.get("min", 0.0))
    max_value = float(raw.get("max", 0.0))
    if min_value >= max_value:
        raise ScanSpecError(f"{label}: min must be less than max.")
    return FieldSpec(
        key=str(raw.get("key", f"field_{index}")),
        label=label,
        unit=str(raw.get("unit", "")),
        min_value=min_value,
        max_value=max_value,
        decimals=int(raw.get("decimals", 0)),
        block=_parse_rect(raw.get("block"), f"{label} block"),
        cells=tuple(cells),
    )


def parse_scan_sheet_spec(payload: object) -> ScanSheetSpec:
    if not isinstance(payload, dict):
        raise ScanSpecError("The scan sheet spec must be a JSON object.")
    page = payload.get("page")
    if not isinstance(page, dict):
        raise ScanSpecError("The scan sheet spec is missing its page section.")
    fiducials_raw = payload.get("fiducials")
    if not isinstance(fiducials_raw, list):
        raise ScanSpecError("The scan sheet spec is missing its fiducials.")
    fiducials = tuple(
        FiducialSpec(
            id=str(raw.get("id", "")),
            shape=str(raw.get("shape", "square")),
            rect=_parse_rect(raw.get("rect"), f"fiducial {raw.get('id')}"),
        )
        for raw in fiducials_raw
        if isinstance(raw, dict)
    )
    if {fid.id for fid in fiducials} != set(EXPECTED_FIDUCIAL_IDS):
        raise ScanSpecError("The scan sheet spec must define exactly the four corner fiducials.")
    fields_raw = payload.get("fields")
    if not isinstance(fields_raw, list) or not fields_raw:
        raise ScanSpecError("The scan sheet spec is missing its fields.")
    fields = tuple(_parse_field(raw, index) for index, raw in enumerate(fields_raw))
    if len({field.key for field in fields}) != len(fields):
        raise ScanSpecError("Scan field keys must be unique.")
    instructions_raw = payload.get("instructions", [])
    instructions = (
        tuple(str(line) for line in instructions_raw) if isinstance(instructions_raw, list) else ()
    )
    return ScanSheetSpec(
        version=int(payload.get("version", 1)),
        page_width_mm=float(page.get("width_mm", 0.0)),
        page_height_mm=float(page.get("height_mm", 0.0)),
        title=str(payload.get("title", "Scan sheet")),
        instructions=instructions,
        fiducials=fiducials,
        fields=fields,
    )


def load_scan_sheet_spec(templates_dir: Path, filename: str = SCAN_SPEC_FILENAME) -> ScanSheetSpec:
    spec_path = templates_dir / filename
    if not spec_path.is_file():
        raise ScanSpecError(f"Scan sheet spec not found at {spec_path}.")
    try:
        payload = json.loads(spec_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ScanSpecError(f"Scan sheet spec at {spec_path} is unreadable.") from error
    return parse_scan_sheet_spec(payload)
