"""Shared fakes for assessment tests."""

from __future__ import annotations

import io

import numpy as np
from PIL import Image

from app.ml.detection.postprocess import RawDetection

IMAGE_RGB = (180, 165, 130)


class FakeDetector:
    """Returns scripted detections and records what it was handed."""

    def __init__(self, detections: list[RawDetection] | None = None) -> None:
        self._detections = list(detections) if detections is not None else []
        self.calls = 0
        self.image_shape: tuple[int, ...] | None = None
        self.confidence_threshold: float | None = None
        self.iou_threshold: float | None = None

    def detect(
        self,
        image_rgb: np.ndarray,
        *,
        confidence_threshold: float,
        iou_threshold: float,
    ) -> list[RawDetection]:
        self.calls += 1
        self.image_shape = tuple(image_rgb.shape)
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        return list(self._detections)


def make_detection(
    confidence: float = 0.8,
    box: tuple[float, float, float, float] = (0.0, 0.0, 128.0, 128.0),
    class_index: int = 0,
) -> RawDetection:
    return RawDetection(class_index=class_index, confidence=confidence, box_xyxy=box)


def encode_image(width: int = 1280, height: int = 960, image_format: str = "PNG") -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), IMAGE_RGB).save(buffer, format=image_format)
    return buffer.getvalue()
