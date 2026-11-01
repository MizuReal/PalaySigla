"""ONNX inference for the paddy defect and mold detector.

Loaded once at application startup; a missing or modified artifact fails the
boot instead of degrading a request. Inference itself is CPU-bound and is
always dispatched to the service's thread pool.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Protocol

import cv2
import numpy as np

from app.ml.detection.constants import (
    BOX_FIELDS,
    DEFAULT_INPUT_SIZE,
    DEFAULT_MAX_DETECTIONS,
    EXPECTED_BATCH,
    EXPECTED_CHANNELS,
    EXPECTED_INPUT_RANK,
    NUM_CLASSES,
    PIXEL_SCALE,
)
from app.ml.detection.postprocess import RawDetection, decode_predictions

SESSION_PROVIDERS = ("CPUExecutionProvider",)
HASH_CHUNK_SIZE = 1 << 20
EXPECTED_OUTPUT_RANK = 3


class DetectorError(RuntimeError):
    """Raised when the detector model is missing, corrupt, or unusable."""


class DefectDetector(Protocol):
    def detect(
        self,
        image_rgb: np.ndarray,
        *,
        confidence_threshold: float,
        iou_threshold: float,
    ) -> list[RawDetection]:
        """Return detections in normalized-image pixel coordinates."""
        ...


def preprocess(image_rgb: np.ndarray, input_size: int) -> np.ndarray:
    """Stretch-resize to the trained geometry and normalize to NCHW float32.

    Stretch rather than letterbox: the training version was generated with
    ``Resize: Stretch to 1280x1280``. Padding instead would rescale every
    predicted box and is the classic silent accuracy loss on this pipeline.
    """
    if image_rgb.ndim != 3 or image_rgb.shape[2] != EXPECTED_CHANNELS:
        raise DetectorError("The detector expects an RGB image shaped (height, width, 3).")
    resized = cv2.resize(image_rgb, (input_size, input_size), interpolation=cv2.INTER_LINEAR)
    tensor = resized.astype(np.float32) * PIXEL_SCALE
    return np.ascontiguousarray(tensor.transpose(2, 0, 1)[None, ...])


class OnnxDetector:
    """ONNX Runtime detector for the trained YOLO11 defect model."""

    def __init__(
        self,
        model_path: str,
        sha256: str = "",
        input_size: int = DEFAULT_INPUT_SIZE,
        max_detections: int = DEFAULT_MAX_DETECTIONS,
    ) -> None:
        path = Path(model_path) if model_path else None
        if path is None or not path.is_file():
            raise DetectorError(
                "ASSESS_MODEL_PATH is not set or the model file is missing. "
                "Export best.onnx from the trained checkpoint and ship the artifact."
            )
        if sha256:
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest.lower() != sha256.lower():
                raise DetectorError(
                    "The defect detector failed its SHA-256 check; refusing to load it."
                )
        try:
            import onnxruntime as ort
        except ImportError as error:
            raise DetectorError("onnxruntime is not installed.") from error

        self._session = ort.InferenceSession(str(path), providers=list(SESSION_PROVIDERS))
        self._input_size = input_size
        self._max_detections = max_detections

        inputs = self._session.get_inputs()
        outputs = self._session.get_outputs()
        if len(inputs) != 1 or len(outputs) != 1:
            raise DetectorError("The detector model must have exactly one input and one output.")
        self._input_name = inputs[0].name
        self._validate_input_shape(inputs[0].shape)
        self._validate_output_shape(outputs[0].shape)

    def _validate_input_shape(self, shape: list[object]) -> None:
        expected = (EXPECTED_BATCH, EXPECTED_CHANNELS, self._input_size, self._input_size)
        normalized = tuple(dimension if isinstance(dimension, int) else -1 for dimension in shape)
        if len(normalized) != EXPECTED_INPUT_RANK or normalized != expected:
            raise DetectorError(
                f"The detector expects input {normalized}, but this server is configured for "
                f"{expected}. Export the ONNX at the same size the model was trained at."
            )

    def _validate_output_shape(self, shape: list[object]) -> None:
        channels = BOX_FIELDS + NUM_CLASSES
        normalized = tuple(dimension if isinstance(dimension, int) else -1 for dimension in shape)
        if len(normalized) != EXPECTED_OUTPUT_RANK:
            raise DetectorError(f"The detector output must be rank 3, got {normalized}.")
        if normalized[1] != channels and normalized[2] != channels:
            raise DetectorError(
                f"The detector output has no {channels}-channel axis: {normalized}. "
                "It was probably exported with a different class count."
            )

    def detect(
        self,
        image_rgb: np.ndarray,
        *,
        confidence_threshold: float,
        iou_threshold: float,
    ) -> list[RawDetection]:
        tensor = preprocess(image_rgb, self._input_size)
        outputs = self._session.run(None, {self._input_name: tensor})
        return decode_predictions(
            outputs[0],
            confidence_threshold=confidence_threshold,
            iou_threshold=iou_threshold,
            input_size=self._input_size,
            max_detections=self._max_detections,
        )
