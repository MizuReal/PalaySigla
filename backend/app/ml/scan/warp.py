"""Scan-card registration: marker-first detection and cell crops.

The captured photo does not have to fill the frame, be cut out, or sit on a
contrasting surface: the four printed corner markers are found directly in the
image, grouped into a card quad by their 8 mm/6 mm anchor-size ratio and the
spec's relative geometry, and mapped to a canonical card frame. Every digit
cell is then cropped at the spec's known coordinates.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import cv2
import numpy as np

from app.ml.scan.spec import (
    ANCHOR_FIDUCIAL_ID,
    ANCHOR_SIZE_FACTOR,
    CELL_CROP_MARGIN_RATIO,
    FIDUCIAL_AREA_TOLERANCE,
    FIDUCIAL_MAX_OFFSET_RATIO,
    FIDUCIAL_MIN_AREA_RATIO,
    FIDUCIAL_SEARCH_WINDOW_SCALE,
    Rect,
    ScanSheetSpec,
)

PROCESSING_MAX_DIMENSION_PX = 3000

# Marker candidates: solid, square-ish dark blobs. Text glyphs and hollow
# cell/block outlines fail the fill ratio; decimal dots and specks fail the
# area band.
MARKER_MIN_AREA_PX = 400
MARKER_MIN_AREA_RATIO = 0.0001
MARKER_MAX_AREA_RATIO = 0.02
MARKER_SQUARENESS = 0.75
MARKER_FILL_RATIO = 0.9

# Grouping bounds: candidates are sorted by area, so only the largest few can
# be the anchor; the smaller markers are capped for pairwise enumeration.
MAX_MARKER_CANDIDATES = 60
MAX_ANCHOR_CANDIDATES = 12
MAX_SMALL_MARKERS = 24
SMALL_MARKER_AREA_TOLERANCE = 0.35
MIN_TRIANGLE_AREA_PX = 1.0

# The fourth marker's predicted position must land this close (relative to the
# anchor-to-top-right distance), and the final four-point reprojection error
# must stay under the same order of magnitude.
CLOSURE_TOLERANCE_RATIO = 0.35
MAX_MATCH_ERROR_RATIO = 0.25

REQUIRED_FIDUCIALS = 4

_FORM_NOT_FOUND_MESSAGE = (
    "We couldn't find the scan card in this photo. Include all four corner "
    "marks, lay the card flat, and avoid glare — then take the photo again."
)

DetectedFiducial = tuple[float, float, float]


class ScanImageError(ValueError):
    """Raised when the uploaded bytes are not a usable image."""


class ScanFormNotFoundError(ValueError):
    """Raised when the card or its fiducials cannot be located."""


@dataclass(frozen=True)
class WarpResult:
    image: np.ndarray
    homography: np.ndarray
    original_width: int
    original_height: int

    def rect_in_original(self, rect: Rect) -> list[float]:
        """Map a canonical-pixel rect back to normalized original-image coords."""
        x, y, width, height = rect
        corners = np.array(
            [[[x, y], [x + width, y], [x + width, y + height], [x, y + height]]],
            dtype=np.float32,
        )
        inverse = np.linalg.inv(self.homography)
        mapped = cv2.perspectiveTransform(corners, inverse)[0]
        min_x = float(np.clip(mapped[:, 0].min(), 0.0, self.original_width))
        max_x = float(np.clip(mapped[:, 0].max(), 0.0, self.original_width))
        min_y = float(np.clip(mapped[:, 1].min(), 0.0, self.original_height))
        max_y = float(np.clip(mapped[:, 1].max(), 0.0, self.original_height))
        return [
            round(min_x / self.original_width, 6),
            round(min_y / self.original_height, 6),
            round((max_x - min_x) / self.original_width, 6),
            round((max_y - min_y) / self.original_height, 6),
        ]


@dataclass(frozen=True)
class CellCrop:
    field_key: str
    cell_index: int
    rect: Rect
    image: np.ndarray


@dataclass(frozen=True)
class MarkerCandidate:
    x: float
    y: float
    area: float
    side: float


def _downscale(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    scale = min(1.0, PROCESSING_MAX_DIMENSION_PX / max(height, width))
    if scale >= 1.0:
        return image
    return cv2.resize(
        image,
        (round(width * scale), round(height * scale)),
        interpolation=cv2.INTER_AREA,
    )


def _detect_marker_candidates(gray: np.ndarray) -> list[MarkerCandidate]:
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, mask = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    image_area = float(gray.shape[0] * gray.shape[1])
    min_area = max(MARKER_MIN_AREA_PX, image_area * MARKER_MIN_AREA_RATIO)
    max_area = image_area * MARKER_MAX_AREA_RATIO
    candidates: list[MarkerCandidate] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area or area > max_area:
            continue
        (_, _), (width, height), _ = cv2.minAreaRect(contour)
        if width <= 0 or height <= 0:
            continue
        if min(width, height) / max(width, height) < MARKER_SQUARENESS:
            continue
        if area / (width * height) < MARKER_FILL_RATIO:
            continue
        moments = cv2.moments(contour)
        if moments["m00"] <= 0:
            continue
        candidates.append(
            MarkerCandidate(
                x=moments["m10"] / moments["m00"],
                y=moments["m01"] / moments["m00"],
                area=float(area),
                side=(width + height) / 2,
            )
        )
    candidates.sort(key=lambda candidate: candidate.area, reverse=True)
    return candidates[:MAX_MARKER_CANDIDATES]


def _expected_centers(spec: ScanSheetSpec) -> dict[str, tuple[float, float]]:
    """Fiducial centers in card-normalized coordinates."""
    return {
        fiducial.id: (
            fiducial.rect[0] + fiducial.rect[2] / 2,
            fiducial.rect[1] + fiducial.rect[3] / 2,
        )
        for fiducial in spec.fiducials
    }


def _anchor_area_ratio(spec: ScanSheetSpec) -> float:
    anchor = next(fid for fid in spec.fiducials if fid.id == ANCHOR_FIDUCIAL_ID)
    small = next(fid for fid in spec.fiducials if fid.id != ANCHOR_FIDUCIAL_ID)
    anchor_area = anchor.rect[2] * anchor.rect[3]
    small_area = small.rect[2] * small.rect[3]
    return anchor_area / small_area


def _match_card_markers(
    candidates: list[MarkerCandidate], spec: ScanSheetSpec
) -> dict[str, MarkerCandidate] | None:
    expected = _expected_centers(spec)
    anchor_ratio = _anchor_area_ratio(spec)
    tl = expected[ANCHOR_FIDUCIAL_ID]
    tr = expected["tr"]
    br = expected["br"]
    bl = expected["bl"]
    best_match: dict[str, MarkerCandidate] | None = None
    best_error: float | None = None

    for anchor in candidates[:MAX_ANCHOR_CANDIDATES]:
        expected_small_area = anchor.area / anchor_ratio
        smalls = [
            candidate
            for candidate in candidates
            if candidate is not anchor
            and abs(candidate.area - expected_small_area)
            <= expected_small_area * SMALL_MARKER_AREA_TOLERANCE
        ]
        if len(smalls) < 3:
            continue
        smalls = smalls[:MAX_SMALL_MARKERS]
        for top_right in smalls:
            for bottom_right in smalls:
                if bottom_right is top_right:
                    continue
                triangle = np.array(
                    [
                        [anchor.x, anchor.y],
                        [top_right.x, top_right.y],
                        [bottom_right.x, bottom_right.y],
                    ],
                    dtype=np.float32,
                )
                if abs(cv2.contourArea(triangle)) < MIN_TRIANGLE_AREA_PX:
                    continue
                reference = math.hypot(top_right.x - anchor.x, top_right.y - anchor.y)
                if reference <= 0:
                    continue
                forward = cv2.getAffineTransform(triangle, np.array([tl, tr, br], dtype=np.float32))
                inverse = cv2.invertAffineTransform(forward)
                predicted = inverse @ np.array([bl[0], bl[1], 1.0], dtype=np.float64)
                bottom_left: MarkerCandidate | None = None
                closure_distance: float | None = None
                for candidate in smalls:
                    if candidate is top_right or candidate is bottom_right:
                        continue
                    distance = math.hypot(candidate.x - predicted[0], candidate.y - predicted[1])
                    if closure_distance is None or distance < closure_distance:
                        closure_distance = distance
                        bottom_left = candidate
                if bottom_left is None or closure_distance > reference * CLOSURE_TOLERANCE_RATIO:
                    continue

                quad = [anchor, top_right, bottom_right, bottom_left]
                targets = [tl, tr, br, bl]
                matrix = cv2.getPerspectiveTransform(
                    np.array([[candidate.x, candidate.y] for candidate in quad], dtype=np.float32),
                    np.array(targets, dtype=np.float32),
                )
                # A planar card photographed from the front can never mirror;
                # a negative determinant is the identity-vs-reflection
                # ambiguity of four symmetric corner markers.
                if np.linalg.det(matrix[:2, :2]) <= 0:
                    continue
                try:
                    inverse = np.linalg.inv(matrix)
                except np.linalg.LinAlgError:
                    continue
                total_error = 0.0
                for candidate, target in zip(quad, targets):
                    predicted_point = cv2.perspectiveTransform(
                        np.array([[[target[0], target[1]]]], dtype=np.float32), inverse
                    )[0][0]
                    total_error += math.hypot(
                        candidate.x - predicted_point[0], candidate.y - predicted_point[1]
                    )
                error = total_error / (reference * len(quad))
                if error > MAX_MATCH_ERROR_RATIO:
                    continue
                if best_error is None or error < best_error:
                    best_error = error
                    best_match = {
                        ANCHOR_FIDUCIAL_ID: anchor,
                        "tr": top_right,
                        "br": bottom_right,
                        "bl": bottom_left,
                    }
    return best_match


def _fiducial_center_px(rect: Rect, width_px: int, height_px: int) -> tuple[float, float]:
    x, y, width, height = rect
    return ((x + width / 2) * width_px, (y + height / 2) * height_px)


def _fiducial_expected_area(rect: Rect, width_px: int, height_px: int) -> float:
    return max(rect[2] * width_px * rect[3] * height_px, 1.0)


def _detect_fiducial(
    gray: np.ndarray, rect: Rect, width_px: int, height_px: int
) -> DetectedFiducial | None:
    center_x, center_y = _fiducial_center_px(rect, width_px, height_px)
    expected_size = max(rect[2] * width_px, rect[3] * height_px)
    half_window = expected_size * FIDUCIAL_SEARCH_WINDOW_SCALE / 2
    x0 = int(max(0, center_x - half_window))
    y0 = int(max(0, center_y - half_window))
    x1 = int(min(gray.shape[1], center_x + half_window))
    y1 = int(min(gray.shape[0], center_y + half_window))
    if x1 - x0 < 4 or y1 - y0 < 4:
        return None
    window = gray[y0:y1, x0:x1]
    blurred = cv2.GaussianBlur(window, (5, 5), 0)
    _, mask = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    marker = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(marker)
    expected_area = _fiducial_expected_area(rect, width_px, height_px)
    if area < expected_area * FIDUCIAL_MIN_AREA_RATIO:
        return None
    moments = cv2.moments(marker)
    if moments["m00"] <= 0:
        return None
    return (
        x0 + moments["m10"] / moments["m00"],
        y0 + moments["m01"] / moments["m00"],
        float(area),
    )


def _detect_fiducials(gray: np.ndarray, spec: ScanSheetSpec) -> dict[str, DetectedFiducial]:
    height_px, width_px = gray.shape[:2]
    detected: dict[str, DetectedFiducial] = {}
    for fiducial in spec.fiducials:
        found = _detect_fiducial(gray, fiducial.rect, width_px, height_px)
        if found is not None:
            detected[fiducial.id] = found
    return detected


def _fiducials_are_plausible(
    detected: dict[str, DetectedFiducial],
    spec: ScanSheetSpec,
    width_px: int,
    height_px: int,
) -> bool:
    if len(detected) < REQUIRED_FIDUCIALS:
        return False
    areas: dict[str, float] = {}
    for fiducial in spec.fiducials:
        found = detected.get(fiducial.id)
        if found is None:
            return False
        center_x, center_y, area = found
        expected_x, expected_y = _fiducial_center_px(fiducial.rect, width_px, height_px)
        expected_area = _fiducial_expected_area(fiducial.rect, width_px, height_px)
        expected_size = math.sqrt(expected_area)
        if math.hypot(center_x - expected_x, center_y - expected_y) > (
            expected_size * FIDUCIAL_MAX_OFFSET_RATIO
        ):
            return False
        area_ratio = area / expected_area
        if not FIDUCIAL_AREA_TOLERANCE[0] <= area_ratio <= FIDUCIAL_AREA_TOLERANCE[1]:
            return False
        areas[fiducial.id] = area
    anchor_area = areas[ANCHOR_FIDUCIAL_ID]
    return all(
        anchor_area > areas[fiducial.id] * ANCHOR_SIZE_FACTOR
        for fiducial in spec.fiducials
        if fiducial.id != ANCHOR_FIDUCIAL_ID
    )


def warp_to_canonical(image_bgr: np.ndarray, spec: ScanSheetSpec) -> WarpResult:
    if image_bgr.ndim != 3 or image_bgr.shape[2] != 3:
        raise ScanImageError("The scan image must be a three-channel color image.")
    work = _downscale(image_bgr)
    gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY)
    candidates = _detect_marker_candidates(gray)
    matched = _match_card_markers(candidates, spec) if candidates else None
    if matched is None:
        raise ScanFormNotFoundError(_FORM_NOT_FOUND_MESSAGE)

    canonical_width = spec.canonical_width_px
    canonical_height = spec.canonical_height_px
    expected = _expected_centers(spec)
    normalized = cv2.getPerspectiveTransform(
        np.array(
            [[matched[fiducial.id].x, matched[fiducial.id].y] for fiducial in spec.fiducials],
            dtype=np.float32,
        ),
        np.array([expected[fiducial.id] for fiducial in spec.fiducials], dtype=np.float32),
    )
    scale = np.array(
        [[canonical_width, 0.0, 0.0], [0.0, canonical_height, 0.0], [0.0, 0.0, 1.0]],
        dtype=np.float64,
    )
    work_to_canonical = scale @ normalized
    canonical_gray = cv2.warpPerspective(
        gray, work_to_canonical, (canonical_width, canonical_height)
    )

    detected = _detect_fiducials(canonical_gray, spec)
    if not _fiducials_are_plausible(detected, spec, canonical_width, canonical_height):
        raise ScanFormNotFoundError(_FORM_NOT_FOUND_MESSAGE)
    src_points = np.array(
        [detected[fiducial.id][:2] for fiducial in spec.fiducials], dtype=np.float32
    )
    dst_points = np.array(
        [
            _fiducial_center_px(fiducial.rect, canonical_width, canonical_height)
            for fiducial in spec.fiducials
        ],
        dtype=np.float32,
    )
    work_to_canonical = cv2.getPerspectiveTransform(src_points, dst_points) @ work_to_canonical

    original_width = image_bgr.shape[1]
    original_height = image_bgr.shape[0]
    work_scale = work.shape[1] / original_width
    original_to_work = np.array(
        [[work_scale, 0.0, 0.0], [0.0, work_scale, 0.0], [0.0, 0.0, 1.0]],
        dtype=np.float64,
    )
    original_to_canonical = work_to_canonical @ original_to_work
    canonical_image = cv2.warpPerspective(
        image_bgr, original_to_canonical, (canonical_width, canonical_height)
    )
    return WarpResult(
        image=canonical_image,
        homography=original_to_canonical,
        original_width=original_width,
        original_height=original_height,
    )


def crop_cells(canonical_bgr: np.ndarray, spec: ScanSheetSpec) -> list[CellCrop]:
    height_px, width_px = canonical_bgr.shape[:2]
    crops: list[CellCrop] = []
    for field_spec in spec.fields:
        cell_index = 0
        for cell in field_spec.cells:
            if not cell.is_digit:
                continue
            x, y, width, height = cell.rect
            x_px = x * width_px
            y_px = y * height_px
            width_cell = width * width_px
            height_cell = height * height_px
            margin_x = width_cell * CELL_CROP_MARGIN_RATIO
            margin_y = height_cell * CELL_CROP_MARGIN_RATIO
            x0 = int(max(0, round(x_px - margin_x)))
            y0 = int(max(0, round(y_px - margin_y)))
            x1 = int(min(width_px, round(x_px + width_cell + margin_x)))
            y1 = int(min(height_px, round(y_px + height_cell + margin_y)))
            if x1 - x0 < 4 or y1 - y0 < 4:
                raise ScanImageError(
                    f"Digit cell {field_spec.key}[{cell_index}] falls outside the card."
                )
            crops.append(
                CellCrop(
                    field_key=field_spec.key,
                    cell_index=cell_index,
                    rect=(x_px, y_px, width_cell, height_cell),
                    image=canonical_bgr[y0:y1, x0:x1].copy(),
                )
            )
            cell_index += 1
    return crops
