"""Decode raw Ultralytics ONNX output and suppress overlapping detections.

The exported graph emits ``(1, 4 + classes, anchors)``: centre-form boxes in
input pixels followed by per-class probabilities. No NMS is baked into the
graph, so suppression happens here.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.ml.detection.constants import (
    BOX_FIELDS,
    DEFAULT_MAX_DETECTIONS,
    EXPECTED_BATCH,
    NUM_CLASSES,
)


class DetectorOutputError(RuntimeError):
    """Raised when the model emits a tensor the decoder cannot interpret."""


@dataclass(frozen=True)
class RawDetection:
    """One detection in input-image pixels (origin at the top-left)."""

    class_index: int
    confidence: float
    box_xyxy: tuple[float, float, float, float]


def decode_predictions(
    output: np.ndarray,
    *,
    confidence_threshold: float,
    iou_threshold: float,
    input_size: int,
    class_count: int = NUM_CLASSES,
    max_detections: int = DEFAULT_MAX_DETECTIONS,
) -> list[RawDetection]:
    predictions = to_anchor_rows(output, class_count)

    boxes = predictions[:, :BOX_FIELDS]
    scores = predictions[:, BOX_FIELDS:]
    class_indices = scores.argmax(axis=1)
    confidences = scores[np.arange(scores.shape[0]), class_indices]

    candidate_mask = confidences >= confidence_threshold
    if not candidate_mask.any():
        return []

    boxes = boxes[candidate_mask]
    class_indices = class_indices[candidate_mask]
    confidences = confidences[candidate_mask]
    xyxy = xywh_to_xyxy(boxes)
    xyxy = clamp_boxes(xyxy, input_size)

    widths = xyxy[:, 2] - xyxy[:, 0]
    heights = xyxy[:, 3] - xyxy[:, 1]
    valid_mask = (widths > 0) & (heights > 0)
    if not valid_mask.any():
        return []

    detections: list[RawDetection] = []
    for class_index in np.unique(class_indices[valid_mask]):
        class_mask = valid_mask & (class_indices == class_index)
        class_boxes = xyxy[class_mask]
        class_scores = confidences[class_mask]
        nms_input = [
            [
                float(box[0]),
                float(box[1]),
                float(box[2] - box[0]),
                float(box[3] - box[1]),
            ]
            for box in class_boxes
        ]
        kept = cv2.dnn.NMSBoxes(
            nms_input,
            [float(score) for score in class_scores],
            float(confidence_threshold),
            float(iou_threshold),
        )
        for kept_index in flatten_indices(kept):
            detections.append(
                RawDetection(
                    class_index=int(class_index),
                    confidence=float(class_scores[kept_index]),
                    box_xyxy=(
                        float(class_boxes[kept_index][0]),
                        float(class_boxes[kept_index][1]),
                        float(class_boxes[kept_index][2]),
                        float(class_boxes[kept_index][3]),
                    ),
                )
            )

    detections.sort(key=lambda detection: detection.confidence, reverse=True)
    return detections[:max_detections]


def to_anchor_rows(output: np.ndarray, class_count: int) -> np.ndarray:
    """Normalize ``(1, C, A)`` or ``(1, A, C)`` into ``(A, C)`` anchor rows."""
    predictions = np.asarray(output, dtype=np.float32)
    if predictions.ndim == 3:
        if predictions.shape[0] != EXPECTED_BATCH:
            raise DetectorOutputError(
                f"The detector output batch must be {EXPECTED_BATCH}, got {predictions.shape[0]}."
            )
        predictions = predictions[0]
    if predictions.ndim != 2:
        raise DetectorOutputError(
            f"The detector output must be 2-D per image, got shape {predictions.shape}."
        )

    channels = BOX_FIELDS + class_count
    if predictions.shape[0] == channels:
        predictions = predictions.T
    elif predictions.shape[1] != channels:
        raise DetectorOutputError(
            f"The detector output has {predictions.shape[1]} channels, expected {channels} "
            f"(4 box fields + {class_count} classes)."
        )
    return np.ascontiguousarray(predictions)


def xywh_to_xyxy(boxes: np.ndarray) -> np.ndarray:
    center_x = boxes[:, 0]
    center_y = boxes[:, 1]
    half_width = boxes[:, 2] / 2.0
    half_height = boxes[:, 3] / 2.0
    return np.stack(
        (
            center_x - half_width,
            center_y - half_height,
            center_x + half_width,
            center_y + half_height,
        ),
        axis=1,
    )


def clamp_boxes(boxes: np.ndarray, input_size: int) -> np.ndarray:
    clamped = boxes.copy()
    clamped[:, 0] = np.clip(clamped[:, 0], 0.0, float(input_size))
    clamped[:, 1] = np.clip(clamped[:, 1], 0.0, float(input_size))
    clamped[:, 2] = np.clip(clamped[:, 2], 0.0, float(input_size))
    clamped[:, 3] = np.clip(clamped[:, 3], 0.0, float(input_size))
    return clamped


def flatten_indices(kept: object) -> list[int]:
    array = np.asarray(kept)
    if array.size == 0:
        return []
    return [int(index) for index in array.reshape(-1)]
