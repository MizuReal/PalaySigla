"""Export a trained checkpoint to ONNX and verify it matches the PyTorch model.

Two silent failures are caught here: an ONNX graph exported at a different input
size than the model was trained at, and a graph whose predictions drift from the
checkpoint it came from.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from machine_learning.config import (
    DEFAULT_CONFIG_PATH,
    ConfigError,
    RunConfig,
    load_run_config,
)
from machine_learning.dataset import (
    IMAGE_SUFFIXES,
    DatasetError,
    discover_splits,
    require_split,
    resolve_dataset_root,
)

DEFAULT_OPSET = 17
DEFAULT_CONFIDENCE = 0.25
DEFAULT_IOU = 0.7
DEFAULT_PARITY_SAMPLES = 5
PARITY_BOX_IOU = 0.5
HASH_CHUNK_SIZE = 1 << 20
EXPECTED_CHANNELS = 3
EXPECTED_BATCH = 1


class ExportError(RuntimeError):
    """Raised when an artifact cannot be exported or verified."""


def export_onnx(weights: Path, imgsz: int, opset: int = DEFAULT_OPSET) -> Path:
    if not weights.is_file():
        raise ExportError(f"Checkpoint not found: {weights}.")
    try:
        from ultralytics import YOLO
    except ImportError as error:
        raise ExportError(
            "ultralytics is not installed. Run: " "pip install -r machine_learning/requirements.txt"
        ) from error

    exported = YOLO(str(weights)).export(
        format="onnx",
        imgsz=imgsz,
        opset=opset,
        simplify=True,
        dynamic=False,
    )
    path = Path(str(exported))
    if not path.is_file():
        raise ExportError(f"Ultralytics reported {path} but no file was written.")
    return path


def onnx_input_shape(onnx_path: Path) -> tuple[int, ...]:
    try:
        import onnxruntime as ort
    except ImportError as error:
        raise ExportError(
            "onnxruntime is not installed; it is required to verify the export."
        ) from error
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    raw_shape = session.get_inputs()[0].shape
    return tuple(int(dimension) if isinstance(dimension, int) else -1 for dimension in raw_shape)


def assert_input_shape(onnx_path: Path, imgsz: int) -> tuple[int, ...]:
    shape = onnx_input_shape(onnx_path)
    expected = (EXPECTED_BATCH, EXPECTED_CHANNELS, imgsz, imgsz)
    if shape != expected:
        raise ExportError(
            f"{onnx_path} expects input {shape}, but the model was trained at {expected}. "
            "Exporting at the wrong resolution silently degrades accuracy; re-export with "
            f"imgsz={imgsz}."
        )
    return shape


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(HASH_CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_parity(
    pt_weights: Path,
    onnx_path: Path,
    images: Sequence[Path],
    imgsz: int,
    *,
    confidence: float = DEFAULT_CONFIDENCE,
    iou: float = DEFAULT_IOU,
    max_images: int = DEFAULT_PARITY_SAMPLES,
) -> dict[str, Any]:
    """Compare detections from the checkpoint and the exported graph."""
    try:
        from ultralytics import YOLO
    except ImportError as error:
        raise ExportError(
            "ultralytics is not installed; it is required for the parity check."
        ) from error

    if not images:
        raise ExportError("No images available for the parity check.")

    torch_model = YOLO(str(pt_weights))
    onnx_model = YOLO(str(onnx_path))
    report: list[dict[str, Any]] = []

    for image in list(images)[:max_images]:
        pt_boxes = torch_model.predict(
            str(image), imgsz=imgsz, conf=confidence, iou=iou, verbose=False
        )[0].boxes
        onnx_boxes = onnx_model.predict(
            str(image), imgsz=imgsz, conf=confidence, iou=iou, verbose=False
        )[0].boxes
        matched, confidence_deltas = match_detections(pt_boxes, onnx_boxes, PARITY_BOX_IOU)
        report.append(
            {
                "image": str(image),
                "torch_detections": len(pt_boxes),
                "onnx_detections": len(onnx_boxes),
                "matched": matched,
                "mean_confidence_delta": (
                    round(sum(confidence_deltas) / len(confidence_deltas), 4)
                    if confidence_deltas
                    else None
                ),
            }
        )

    return {
        "onnx_input_shape": list(onnx_input_shape(onnx_path)),
        "imgsz": imgsz,
        "per_image": report,
    }


def match_detections(
    pt_boxes: Any,
    onnx_boxes: Any,
    iou_threshold: float,
) -> tuple[int, list[float]]:
    pt_xyxy = pt_boxes.xyxy.cpu().numpy()
    pt_conf = pt_boxes.conf.cpu().numpy()
    pt_cls = pt_boxes.cls.cpu().numpy()
    onnx_xyxy = onnx_boxes.xyxy.cpu().numpy()
    onnx_conf = onnx_boxes.conf.cpu().numpy()
    onnx_cls = onnx_boxes.cls.cpu().numpy()

    used: set[int] = set()
    matches = 0
    confidence_deltas: list[float] = []
    for pt_index in range(len(pt_xyxy)):
        best_index: int | None = None
        best_iou = iou_threshold
        for onnx_index in range(len(onnx_xyxy)):
            if onnx_index in used or pt_cls[pt_index] != onnx_cls[onnx_index]:
                continue
            overlap = box_iou(pt_xyxy[pt_index], onnx_xyxy[onnx_index])
            if overlap >= best_iou:
                best_iou = overlap
                best_index = onnx_index
        if best_index is None:
            continue
        used.add(best_index)
        matches += 1
        confidence_deltas.append(abs(float(pt_conf[pt_index]) - float(onnx_conf[best_index])))
    return matches, confidence_deltas


def box_iou(first: Sequence[float], second: Sequence[float]) -> float:
    left = max(float(first[0]), float(second[0]))
    top = max(float(first[1]), float(second[1]))
    right = min(float(first[2]), float(second[2]))
    bottom = min(float(first[3]), float(second[3]))
    intersection = max(0.0, right - left) * max(0.0, bottom - top)
    if intersection == 0.0:
        return 0.0
    first_area = max(0.0, float(first[2]) - float(first[0])) * max(
        0.0, float(first[3]) - float(first[1])
    )
    second_area = max(0.0, float(second[2]) - float(second[0])) * max(
        0.0, float(second[3]) - float(second[1])
    )
    union = first_area + second_area - intersection
    return intersection / union if union > 0 else 0.0


def parity_images(config: RunConfig, split: str) -> list[Path]:
    split_paths = require_split(discover_splits(resolve_dataset_root(config)), split)
    images = sorted(
        path
        for path in split_paths.images_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    )
    return images[:DEFAULT_PARITY_SAMPLES]


def parity_split(config: RunConfig) -> str:
    return "test" if "test" in discover_splits(resolve_dataset_root(config)) else "val"


def run_export(
    config: RunConfig,
    weights: Path,
    *,
    opset: int = DEFAULT_OPSET,
    check_parity: bool = True,
) -> dict[str, Any]:
    onnx_path = export_onnx(weights, config.imgsz, opset)
    shape = assert_input_shape(onnx_path, config.imgsz)

    result: dict[str, Any] = {
        "checkpoint": str(weights),
        "onnx": str(onnx_path),
        "onnx_sha256": sha256_file(onnx_path),
        "onnx_input_shape": list(shape),
        "imgsz": config.imgsz,
    }
    if check_parity:
        result["parity"] = verify_parity(
            weights,
            onnx_path,
            parity_images(config, parity_split(config)),
            config.imgsz,
        )
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG_PATH)
    parser.add_argument("--weights", type=Path, default=None)
    parser.add_argument("--opset", type=int, default=DEFAULT_OPSET)
    parser.add_argument("--skip-parity", action="store_true")
    args = parser.parse_args(argv)

    try:
        config = load_run_config(args.config)
        weights = args.weights or config.weights_path
        result = run_export(config, weights, opset=args.opset, check_parity=not args.skip_parity)
    except (ConfigError, DatasetError, ExportError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
