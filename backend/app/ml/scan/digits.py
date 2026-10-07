"""Handwritten-digit preprocessing and classification.

Each value cell holds exactly one handwritten digit. After the sheet is warped
to canonical size, a cell crop is thresholded, deskewed, centered, and scaled
into the MNIST-style 28x28 input the classifier was trained on. Preprocessing
constants live in ``app/ml/scan/spec.py`` so training and inference can never
drift.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import cv2
import numpy as np

from app.ml.scan.spec import (
    BLANK_INK_RATIO,
    DIGIT_CONTENT_SIZE,
    DIGIT_INPUT_SIZE,
    MNIST_MEAN,
    MNIST_STD,
)

SESSION_PROVIDERS = ("CPUExecutionProvider",)
EXPECTED_INPUT_CHANNELS = 1
EXPECTED_CLASS_COUNT = 10
MASK_BORDER_PX = 2
MIN_COMPONENT_AREA_RATIO = 0.0005
MAX_DESKEW_ANGLE_DEGREES = 20.0
MIN_DESKEW_ANGLE_DEGREES = 0.5
ADAPTIVE_BLOCK_DIVISOR = 4
ADAPTIVE_C = 10


class ScanModelError(RuntimeError):
    """Raised when the digit model is missing, corrupt, or unusable."""


@dataclass(frozen=True)
class DigitPrediction:
    digit: int
    confidence: float
    is_blank: bool


class DigitClassifier(Protocol):
    def predict(self, cells: list[np.ndarray]) -> list[DigitPrediction]:
        """Classify preprocessed 28x28 cells.

        Implementations must return one prediction per input, in input order.
        """
        ...


def _ink_mask(cell_gray: np.ndarray) -> np.ndarray:
    blurred = cv2.GaussianBlur(cell_gray, (3, 3), 0)
    block_size = max(11, (min(cell_gray.shape[:2]) // ADAPTIVE_BLOCK_DIVISOR) | 1)
    mask = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        block_size,
        ADAPTIVE_C,
    )
    mask[:MASK_BORDER_PX, :] = 0
    mask[-MASK_BORDER_PX:, :] = 0
    mask[:, :MASK_BORDER_PX] = 0
    mask[:, -MASK_BORDER_PX:] = 0
    return mask


def _ink_bounding_box(mask: np.ndarray) -> tuple[int, int, int, int] | None:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    min_area = max(4.0, mask.size * MIN_COMPONENT_AREA_RATIO)
    min_x, min_y = mask.shape[1], mask.shape[0]
    max_x = max_y = 0
    found = False
    for contour in contours:
        if cv2.contourArea(contour) < min_area:
            continue
        x, y, width, height = cv2.boundingRect(contour)
        min_x = min(min_x, x)
        min_y = min(min_y, y)
        max_x = max(max_x, x + width - 1)
        max_y = max(max_y, y + height - 1)
        found = True
    if not found or max_x <= min_x or max_y <= min_y:
        return None
    return min_x, min_y, max_x - min_x + 1, max_y - min_y + 1


def _ink_height(mask: np.ndarray) -> float:
    box = _ink_bounding_box(mask)
    return float(box[3]) if box is not None else mask.shape[0]


def _deskew(mask: np.ndarray) -> np.ndarray:
    coordinates = cv2.findNonZero(mask)
    if coordinates is None:
        return mask
    (_, _), (_, _), angle = cv2.minAreaRect(coordinates)
    if angle < -45:
        angle += 90
    if not MIN_DESKEW_ANGLE_DEGREES <= abs(angle) <= MAX_DESKEW_ANGLE_DEGREES:
        return mask
    height, width = mask.shape[:2]
    best = mask
    best_height = _ink_height(mask)
    for candidate in (angle, -angle):
        matrix = cv2.getRotationMatrix2D((width / 2, height / 2), candidate, 1.0)
        rotated = cv2.warpAffine(
            mask, matrix, (width, height), flags=cv2.INTER_NEAREST, borderValue=0
        )
        rotated_height = _ink_height(rotated)
        if rotated_height < best_height:
            best, best_height = rotated, rotated_height
    return best


def _center_digit(mask: np.ndarray) -> np.ndarray:
    box = _ink_bounding_box(mask)
    if box is None:
        raise ValueError("The digit mask has no ink.")
    x, y, width, height = box
    digit = mask[y : y + height, x : x + width]
    scale = min(DIGIT_CONTENT_SIZE / width, DIGIT_CONTENT_SIZE / height)
    resized_width = max(1, round(width * scale))
    resized_height = max(1, round(height * scale))
    resized = cv2.resize(digit, (resized_width, resized_height), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((DIGIT_INPUT_SIZE, DIGIT_INPUT_SIZE), dtype=np.uint8)
    offset_x = (DIGIT_INPUT_SIZE - resized_width) // 2
    offset_y = (DIGIT_INPUT_SIZE - resized_height) // 2
    canvas[offset_y : offset_y + resized_height, offset_x : offset_x + resized_width] = resized
    moments = cv2.moments(canvas)
    if moments["m00"] > 0:
        center_x = moments["m10"] / moments["m00"]
        center_y = moments["m01"] / moments["m00"]
        target = (DIGIT_INPUT_SIZE - 1) / 2
        shift = np.float32([[1, 0, target - center_x], [0, 1, target - center_y]])
        canvas = cv2.warpAffine(
            canvas,
            shift,
            (DIGIT_INPUT_SIZE, DIGIT_INPUT_SIZE),
            flags=cv2.INTER_LINEAR,
            borderValue=0,
        )
    return canvas


def preprocess_cell(cell_bgr: np.ndarray) -> np.ndarray | None:
    """Normalize one digit cell to a 28x28 float tensor, or ``None`` if blank."""
    gray = cv2.cvtColor(cell_bgr, cv2.COLOR_BGR2GRAY) if cell_bgr.ndim == 3 else cell_bgr
    mask = _ink_mask(gray)
    ink_ratio = cv2.countNonZero(mask) / mask.size
    if ink_ratio < BLANK_INK_RATIO:
        return None
    mask = _deskew(mask)
    canvas = _center_digit(mask)
    tensor = canvas.astype(np.float32) / 255.0
    return (tensor - MNIST_MEAN) / MNIST_STD


def _softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - logits.max(axis=1, keepdims=True)
    exponent = np.exp(shifted)
    return exponent / exponent.sum(axis=1, keepdims=True)


class OnnxDigitClassifier:
    """ONNX Runtime classifier for the trained scan digit CNN."""

    def __init__(self, model_path: str, sha256: str = "") -> None:
        path = Path(model_path) if model_path else None
        if path is None or not path.is_file():
            raise ScanModelError(
                "SCAN_DIGIT_MODEL_PATH is not set or the model file is missing. "
                "Train it with scripts/train_digit_model.py or ship the artifact."
            )
        if sha256:
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest.lower() != sha256.lower():
                raise ScanModelError(
                    "The scan digit model failed its SHA-256 check; refusing to load it."
                )
        try:
            import onnxruntime as ort
        except ImportError as error:
            raise ScanModelError("onnxruntime is not installed.") from error
        self._session = ort.InferenceSession(str(path), providers=list(SESSION_PROVIDERS))
        inputs = self._session.get_inputs()
        outputs = self._session.get_outputs()
        if len(inputs) != 1 or len(outputs) != 1:
            raise ScanModelError("The scan digit model must have exactly one input and output.")
        self._input_name = inputs[0].name
        input_shape = inputs[0].shape
        if (
            len(input_shape) != 4
            or input_shape[1] != EXPECTED_INPUT_CHANNELS
            or input_shape[2] != DIGIT_INPUT_SIZE
            or input_shape[3] != DIGIT_INPUT_SIZE
        ):
            raise ScanModelError("The scan digit model expects (N, 1, 28, 28) input.")
        output_shape = outputs[0].shape
        if not output_shape or output_shape[-1] != EXPECTED_CLASS_COUNT:
            raise ScanModelError("The scan digit model must emit a 10-class output.")

    def predict(self, cells: list[np.ndarray]) -> list[DigitPrediction]:
        if not cells:
            return []
        batch = np.stack(cells).astype(np.float32)[:, None, :, :]
        logits = self._session.run(None, {self._input_name: batch})[0]
        probabilities = _softmax(np.asarray(logits, dtype=np.float32))
        predictions: list[DigitPrediction] = []
        for row in probabilities:
            digit = int(np.argmax(row))
            predictions.append(
                DigitPrediction(digit=digit, confidence=float(row[digit]), is_blank=False)
            )
        return predictions
