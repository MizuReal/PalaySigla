"""Sheet registration: page detection, fiducial-based homography, cell crops.

The captured photo is warped to a canonical, top-down A4 image using the four
printed corner markers, so absolute print scale, margins, camera angle, and
paper size stop mattering. Every cell is then cropped at the spec's known
coordinates.
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
PAGE_QUAD_MIN_AREA_RATIO = 0.15
PAGE_QUAD_APPROX_EPSILON = 0.02
PROBE_SCALE_DIVISOR = 3
CORNER_ROTATIONS = 4
MIN_PROBE_FIDUCIALS = 3
REQUIRED_FIDUCIALS = 4

_FORM_NOT_FOUND_MESSAGE = (
    "We couldn't find the scan sheet in this photo. Lay the sheet flat, include "
    "all four corner marks, and avoid glare — then take the photo again."
)

DetectedFiducial = tuple[float, float, float]


class ScanImageError(ValueError):
    """Raised when the uploaded bytes are not a usable image."""


class ScanFormNotFoundError(ValueError):
    """Raised when the page or its fiducials cannot be located."""


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


def _find_page_quad(gray: np.ndarray) -> np.ndarray | None:
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, mask = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    image_area = float(gray.shape[0] * gray.shape[1])
    best: np.ndarray | None = None
    best_area = 0.0
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < image_area * PAGE_QUAD_MIN_AREA_RATIO:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, PAGE_QUAD_APPROX_EPSILON * perimeter, True)
        if len(approx) != 4:
            continue
        if area > best_area:
            best = approx.reshape(4, 2).astype(np.float32)
            best_area = area
    return best


def _order_corners(points: np.ndarray) -> np.ndarray:
    center = points.mean(axis=0)
    angles = np.arctan2(points[:, 1] - center[1], points[:, 0] - center[0])
    ordered = points[np.argsort(angles)]
    start = int(np.argmin(ordered.sum(axis=1)))
    return np.roll(ordered, -start, axis=0)


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


def _score_fiducials(
    detected: dict[str, DetectedFiducial],
    spec: ScanSheetSpec,
    width_px: int,
    height_px: int,
) -> tuple[int, float]:
    matched = 0
    score = 0.0
    for fiducial in spec.fiducials:
        found = detected.get(fiducial.id)
        if found is None:
            continue
        expected_x, expected_y = _fiducial_center_px(fiducial.rect, width_px, height_px)
        expected_area = _fiducial_expected_area(fiducial.rect, width_px, height_px)
        center_x, center_y, area = found
        distance = math.hypot(center_x - expected_x, center_y - expected_y) / math.sqrt(
            expected_area
        )
        size_error = abs(math.log(max(area, 1.0) / expected_area))
        score += (1.0 / (1.0 + distance)) * (1.0 / (1.0 + size_error))
        matched += 1
    return matched, score


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


def _choose_rotation(
    ordered_corners: np.ndarray, gray: np.ndarray, spec: ScanSheetSpec
) -> int | None:
    canonical_width = spec.canonical_width_px
    canonical_height = spec.canonical_height_px
    probe_width = max(1, canonical_width // PROBE_SCALE_DIVISOR)
    probe_height = max(1, canonical_height // PROBE_SCALE_DIVISOR)
    destination = np.array(
        [[0, 0], [probe_width, 0], [probe_width, probe_height], [0, probe_height]],
        dtype=np.float32,
    )
    best_rotation: int | None = None
    best_matched = 0
    best_score = -1.0
    for rotation in range(CORNER_ROTATIONS):
        source = np.roll(ordered_corners, -rotation, axis=0).astype(np.float32)
        matrix = cv2.getPerspectiveTransform(source, destination)
        warped = cv2.warpPerspective(gray, matrix, (probe_width, probe_height))
        detected = _detect_fiducials(warped, spec)
        matched, score = _score_fiducials(detected, spec, probe_width, probe_height)
        if matched >= MIN_PROBE_FIDUCIALS and (matched, score) > (best_matched, best_score):
            best_rotation, best_matched, best_score = rotation, matched, score
    return best_rotation


def warp_to_canonical(image_bgr: np.ndarray, spec: ScanSheetSpec) -> WarpResult:
    if image_bgr.ndim != 3 or image_bgr.shape[2] != 3:
        raise ScanImageError("The scan image must be a three-channel color image.")
    work = _downscale(image_bgr)
    gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY)
    quad = _find_page_quad(gray)
    if quad is None:
        raise ScanFormNotFoundError(_FORM_NOT_FOUND_MESSAGE)
    ordered = _order_corners(quad)
    rotation = _choose_rotation(ordered, gray, spec)
    if rotation is None:
        raise ScanFormNotFoundError(_FORM_NOT_FOUND_MESSAGE)

    canonical_width = spec.canonical_width_px
    canonical_height = spec.canonical_height_px
    source = np.roll(ordered, -rotation, axis=0).astype(np.float32)
    destination = np.array(
        [[0, 0], [canonical_width, 0], [canonical_width, canonical_height], [0, canonical_height]],
        dtype=np.float32,
    )
    coarse = cv2.getPerspectiveTransform(source, destination)
    coarse_image = cv2.warpPerspective(gray, coarse, (canonical_width, canonical_height))

    detected = _detect_fiducials(coarse_image, spec)
    if not _fiducials_are_plausible(detected, spec, canonical_width, canonical_height):
        raise ScanFormNotFoundError(_FORM_NOT_FOUND_MESSAGE)
    source_points = np.array(
        [detected[fiducial.id][:2] for fiducial in spec.fiducials], dtype=np.float32
    )
    destination_points = np.array(
        [
            _fiducial_center_px(fiducial.rect, canonical_width, canonical_height)
            for fiducial in spec.fiducials
        ],
        dtype=np.float32,
    )
    refine = cv2.getPerspectiveTransform(source_points, destination_points)
    work_to_canonical = refine @ coarse

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
                    f"Digit cell {field_spec.key}[{cell_index}] falls outside the page."
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
