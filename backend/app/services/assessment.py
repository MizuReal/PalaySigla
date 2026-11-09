"""Assessment service: validate an uploaded paddy photo, run the defect
detector off the event loop, and aggregate detections into a reviewable result.

The detector is CPU-bound, so inference is dispatched to a bounded thread pool
and the event loop stays responsive for other requests.
"""

from __future__ import annotations

import asyncio
import time
from concurrent.futures import Executor
from functools import partial
from io import BytesIO

import numpy as np
from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import Settings
from app.ml.detection.constants import (
    AVAILABLE_OUTPUTS,
    CLASS_LABELS,
    CLASS_NAMES,
    QUALITY_BY_SEVERITY,
    SEVERITY_HIGH,
    SEVERITY_LOW,
    SEVERITY_LOW_MAX,
    SEVERITY_MODERATE,
    SEVERITY_MODERATE_MAX,
    SEVERITY_NONE,
    SEVERITY_NONE_MAX,
    UNAVAILABLE_OUTPUTS,
)
from app.ml.detection.detector import DefectDetector, DetectorError
from app.ml.detection.postprocess import RawDetection
from app.models.assessment import AssessmentData, DefectDetection, Severity, SeverityBands

ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png"})
MAX_IMAGE_DIMENSION_PX = 12000
MAX_DECODE_PIXELS = 40_000_000
CONFIDENCE_DECIMALS = 4
BOX_DECIMALS = 5
RATIO_DECIMALS = 4

BAD_IMAGE_MESSAGE = "Upload a JPEG or PNG photo of the paddy sample."
IMAGE_TOO_LARGE_MESSAGE = "The photo is too large. Use an image smaller than 10 MB."
UNKNOWN_CLASS_MESSAGE = "The detector returned a class index outside the configured classes."

Image.MAX_IMAGE_PIXELS = MAX_DECODE_PIXELS


def decode_image(image_bytes: bytes) -> np.ndarray:
    """Decode to an RGB array, honouring EXIF orientation and dropping metadata."""
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            transposed = ImageOps.exif_transpose(image)
            width, height = transposed.size
            if max(width, height) > MAX_IMAGE_DIMENSION_PX or width * height > MAX_DECODE_PIXELS:
                raise HTTPException(status_code=400, detail=BAD_IMAGE_MESSAGE)
            rgb = np.asarray(transposed.convert("RGB"))
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=400, detail=BAD_IMAGE_MESSAGE) from error
    return np.ascontiguousarray(rgb)


def classify_severity(defect_rate: float) -> Severity:
    if defect_rate <= SEVERITY_NONE_MAX:
        return SEVERITY_NONE
    if defect_rate <= SEVERITY_LOW_MAX:
        return SEVERITY_LOW
    if defect_rate <= SEVERITY_MODERATE_MAX:
        return SEVERITY_MODERATE
    return SEVERITY_HIGH


class AssessmentService:
    def __init__(
        self,
        detector: DefectDetector,
        executor: Executor,
        settings: Settings,
    ) -> None:
        self._detector = detector
        self._executor = executor
        self._settings = settings

    async def process(self, image_bytes: bytes, content_type: str | None) -> AssessmentData:
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail=BAD_IMAGE_MESSAGE)
        if not image_bytes:
            raise HTTPException(status_code=400, detail=BAD_IMAGE_MESSAGE)
        if len(image_bytes) > self._settings.assess_max_image_bytes:
            raise HTTPException(status_code=400, detail=IMAGE_TOO_LARGE_MESSAGE)

        image_rgb = decode_image(image_bytes)
        loop = asyncio.get_running_loop()
        analyze = partial(
            self._detector.detect,
            image_rgb,
            confidence_threshold=self._settings.assess_confidence_threshold,
            iou_threshold=self._settings.assess_iou_threshold,
        )
        started = time.perf_counter()
        try:
            detections = await loop.run_in_executor(self._executor, analyze)
        except DetectorError as error:
            raise HTTPException(
                status_code=500, detail="The defect model failed to run."
            ) from error
        inference_ms = int((time.perf_counter() - started) * 1000)
        return self._assemble(detections, inference_ms)

    def _assemble(self, detections: list[RawDetection], inference_ms: int) -> AssessmentData:
        input_size = float(self._settings.assess_imgsz)
        review_threshold = self._settings.assess_review_confidence_threshold
        counts: dict[str, int] = dict.fromkeys(CLASS_NAMES, 0)
        converted: list[DefectDetection] = []
        covered_area = 0.0

        for detection in detections:
            if not 0 <= detection.class_index < len(CLASS_NAMES):
                raise HTTPException(status_code=500, detail=UNKNOWN_CLASS_MESSAGE)
            class_key = CLASS_NAMES[detection.class_index]
            x1, y1, x2, y2 = detection.box_xyxy
            normalized = [
                round(x1 / input_size, BOX_DECIMALS),
                round(y1 / input_size, BOX_DECIMALS),
                round((x2 - x1) / input_size, BOX_DECIMALS),
                round((y2 - y1) / input_size, BOX_DECIMALS),
            ]
            area_ratio = min(1.0, max(0.0, normalized[2] * normalized[3]))
            converted.append(
                DefectDetection(
                    class_key=class_key,
                    label=CLASS_LABELS[class_key],
                    confidence=round(detection.confidence, CONFIDENCE_DECIMALS),
                    box=normalized,
                    area_ratio=round(area_ratio, BOX_DECIMALS),
                    needs_review=detection.confidence < review_threshold,
                )
            )
            counts[class_key] += 1
            covered_area += area_ratio

        defect_rate = round(min(1.0, covered_area), RATIO_DECIMALS)
        severity = classify_severity(defect_rate)
        return AssessmentData(
            available_outputs=list(AVAILABLE_OUTPUTS),
            unavailable_outputs=list(UNAVAILABLE_OUTPUTS),
            detections=converted,
            counts=counts,
            defect_rate=defect_rate,
            severity=severity,
            severity_bands=SeverityBands(
                none_max=SEVERITY_NONE_MAX,
                low_max=SEVERITY_LOW_MAX,
                moderate_max=SEVERITY_MODERATE_MAX,
            ),
            quality_status=QUALITY_BY_SEVERITY[severity],
            needs_review=any(item.needs_review for item in converted),
            review_confidence_threshold=round(review_threshold, CONFIDENCE_DECIMALS),
            inference_ms=inference_ms,
            imgsz=self._settings.assess_imgsz,
        )
