"""Scan OCR service: validate an uploaded photo, run the warp + digit pipeline
off the event loop, and assemble per-field results with confidence and review
flags.
"""

from __future__ import annotations

import asyncio
from concurrent.futures import Executor
from io import BytesIO

import cv2
import numpy as np
from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import Settings
from app.ml.scan.digits import DigitClassifier, DigitPrediction, preprocess_cell
from app.ml.scan.spec import (
    GRAIN_LENGTH_KEY,
    GRAIN_WIDTH_KEY,
    RATIO_KEY,
    FieldSpec,
    ScanSheetSpec,
)
from app.ml.scan.warp import (
    ScanFormNotFoundError,
    ScanImageError,
    crop_cells,
    warp_to_canonical,
)
from app.models.scan import ScanData, ScanDigit, ScanFieldResult

ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png"})
MAX_IMAGE_DIMENSION_PX = 12000
MAX_DECODE_PIXELS = 40_000_000
CONFIDENCE_DECIMALS = 4

BAD_IMAGE_MESSAGE = "Upload a JPEG or PNG photo of the scan sheet."
IMAGE_TOO_LARGE_MESSAGE = "The photo is too large. Use an image smaller than 10 MB."
CLASSIFIER_MISMATCH_MESSAGE = "The digit classifier returned an unexpected result count."

Image.MAX_IMAGE_PIXELS = MAX_DECODE_PIXELS


def _decode_image(image_bytes: bytes) -> np.ndarray:
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
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def _assemble_field(
    field_spec: FieldSpec, digits: list[ScanDigit], confidence_threshold: float
) -> tuple[float | None, bool, float]:
    if len(digits) != len(field_spec.digit_cells):
        raise RuntimeError(CLASSIFIER_MISMATCH_MESSAGE)
    if any(digit.is_blank for digit in digits):
        return None, True, 0.0
    digits_text = "".join(str(digit.digit) for digit in digits)
    integer_count = field_spec.integer_digits
    integer_part = digits_text[:integer_count] or "0"
    fraction_part = digits_text[integer_count:] or "0"
    value = float(f"{integer_part}.{fraction_part}")
    confidence = round(min(digit.confidence for digit in digits), CONFIDENCE_DECIMALS)
    needs_review = (
        confidence < confidence_threshold
        or not field_spec.min_value <= value <= field_spec.max_value
    )
    return round(value, field_spec.decimals), needs_review, confidence


def _compute_ratio(values: dict[str, float | None]) -> float | None:
    length = values.get(GRAIN_LENGTH_KEY)
    width = values.get(GRAIN_WIDTH_KEY)
    if length is None or width is None or width <= 0:
        return None
    return round(length / width, CONFIDENCE_DECIMALS)


class ScanService:
    def __init__(
        self,
        spec: ScanSheetSpec,
        classifier: DigitClassifier,
        executor: Executor,
        settings: Settings,
    ) -> None:
        self._spec = spec
        self._classifier = classifier
        self._executor = executor
        self._settings = settings

    async def process(self, image_bytes: bytes, content_type: str | None) -> ScanData:
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail=BAD_IMAGE_MESSAGE)
        if not image_bytes:
            raise HTTPException(status_code=400, detail=BAD_IMAGE_MESSAGE)
        if len(image_bytes) > self._settings.scan_max_image_bytes:
            raise HTTPException(status_code=400, detail=IMAGE_TOO_LARGE_MESSAGE)
        loop = asyncio.get_running_loop()
        try:
            return await loop.run_in_executor(self._executor, self._process_sync, image_bytes)
        except ScanFormNotFoundError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        except ScanImageError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    def _process_sync(self, image_bytes: bytes) -> ScanData:
        image = _decode_image(image_bytes)
        warped = warp_to_canonical(image, self._spec)
        crops = crop_cells(warped.image, self._spec)
        prepared = [preprocess_cell(crop.image) for crop in crops]
        printable_cells = [tensor for tensor in prepared if tensor is not None]
        classifier_results = self._classifier.predict(printable_cells)
        if len(classifier_results) != len(printable_cells):
            raise RuntimeError(CLASSIFIER_MISMATCH_MESSAGE)
        predictions = iter(classifier_results)
        digits_by_field: dict[str, list[ScanDigit]] = {}
        for crop, tensor in zip(crops, prepared):
            if tensor is None:
                prediction = DigitPrediction(digit=0, confidence=0.0, is_blank=True)
            else:
                prediction = next(predictions)
            digits_by_field.setdefault(crop.field_key, []).append(
                ScanDigit(
                    index=crop.cell_index,
                    digit=None if prediction.is_blank else prediction.digit,
                    confidence=round(prediction.confidence, CONFIDENCE_DECIMALS),
                    is_blank=prediction.is_blank,
                    rect=warped.rect_in_original(crop.rect),
                )
            )

        threshold = self._settings.scan_digit_confidence_threshold
        fields: list[ScanFieldResult] = []
        values: dict[str, float | None] = {}
        for field_spec in self._spec.fields:
            digits = digits_by_field.get(field_spec.key, [])
            value, needs_review, confidence = _assemble_field(field_spec, digits, threshold)
            values[field_spec.key] = value
            fields.append(
                ScanFieldResult(
                    key=field_spec.key,
                    label=field_spec.label,
                    unit=field_spec.unit,
                    value=value,
                    needs_review=needs_review,
                    confidence=confidence,
                    digits=digits,
                )
            )

        computed_ratio = _compute_ratio(values)
        if computed_ratio is not None:
            for index, field in enumerate(fields):
                if field.key != RATIO_KEY or field.value is None:
                    continue
                if abs(field.value - computed_ratio) > self._settings.scan_ratio_mismatch_tolerance:
                    fields[index] = field.model_copy(update={"needs_review": True})
        return ScanData(
            computed_ratio=computed_ratio,
            overall_needs_review=any(field.needs_review for field in fields),
            fields=fields,
        )
