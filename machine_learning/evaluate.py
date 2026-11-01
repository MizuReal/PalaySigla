"""Evaluate a trained checkpoint and emit a human review set.

The review set matters more than the headline mAP: if the model's confident
"false positives" turn out to be genuine defects that were never boxed, the
problem is the annotations, not the architecture.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from machine_learning.config import (
    BEST_WEIGHT_NAME,
    DEFAULT_CONFIG_PATH,
    WEIGHTS_DIR_NAME,
    ConfigError,
    RunConfig,
    load_run_config,
)
from machine_learning.dataset import (
    DATA_YAML_NAME,
    DatasetError,
    discover_splits,
    load_data_yaml,
    prepare_data_yaml,
    require_split,
    resolve_dataset_root,
)
from machine_learning.dataset import (
    load_class_names as read_class_names,
)

DEFAULT_CONFIDENCE = 0.25
DEFAULT_IOU = 0.7
DEFAULT_SPLIT = "test"
FALLBACK_SPLIT = "val"
EVALUATION_SUMMARY_NAME = "evaluation.json"


class EvaluationError(RuntimeError):
    """Raised when a checkpoint cannot be evaluated."""


def evaluate(
    config: RunConfig,
    weights: Path,
    *,
    split: str = DEFAULT_SPLIT,
    confidence: float = DEFAULT_CONFIDENCE,
    iou: float = DEFAULT_IOU,
    save_review: bool = False,
) -> dict[str, Any]:
    require_weights(weights)
    try:
        from ultralytics import YOLO
    except ImportError as error:
        raise EvaluationError(
            "ultralytics is not installed. " "Run: pip install -r machine_learning/requirements.txt"
        ) from error

    resolved_split = resolve_evaluation_split(config, split)
    data_yaml = prepare_data_yaml(config, config.output_dir / f"{config.run_name}-data.yaml")

    model = YOLO(str(weights))
    metrics = model.val(
        data=str(data_yaml),
        split=resolved_split,
        imgsz=config.imgsz,
        conf=confidence,
        iou=iou,
        project=str(config.output_dir),
        name=f"{config.run_name}-val",
        plots=True,
    )

    result: dict[str, Any] = {
        "weights": str(weights),
        "split": resolved_split,
        "imgsz": config.imgsz,
        "confidence": confidence,
        "iou": iou,
        "precision": metric_value(metrics, "mp"),
        "recall": metric_value(metrics, "mr"),
        "map50": metric_value(metrics, "map50"),
        "map50_95": metric_value(metrics, "map"),
        "per_class": per_class_ap(metrics, config),
    }
    if save_review:
        result["review_dir"] = str(write_review_set(config, weights, split=resolved_split))

    summary_path = config.output_dir / config.run_name / EVALUATION_SUMMARY_NAME
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def require_weights(weights: Path) -> None:
    if not weights.is_file():
        raise EvaluationError(f"Checkpoint not found: {weights}. Pass --weights, or train first.")


def resolve_evaluation_split(config: RunConfig, requested: str) -> str:
    splits = discover_splits(resolve_dataset_root(config))
    if requested in splits:
        return requested
    if requested == DEFAULT_SPLIT and FALLBACK_SPLIT in splits:
        return FALLBACK_SPLIT
    require_split(splits, requested)
    return requested


def metric_value(metrics: Any, attribute: str) -> float:
    value = getattr(getattr(metrics, "box", None), attribute, None)
    if value is None:
        raise EvaluationError(
            f"The installed Ultralytics version exposes no '{attribute}' metric; "
            "cannot report comparable scores."
        )
    return float(value)


def per_class_ap(metrics: Any, config: RunConfig) -> dict[str, dict[str, Any]]:
    box = getattr(metrics, "box", None)
    class_indices = [int(index) for index in getattr(box, "ap_class_index", [])]
    ap_values = [float(value) for value in getattr(box, "maps", [])]
    names = class_names_for(config)
    per_class: dict[str, dict[str, Any]] = {}
    for class_index, ap_value in zip(class_indices, ap_values):
        per_class[str(class_index)] = {
            "name": names.get(class_index, str(class_index)),
            "map50_95": ap_value,
        }
    return per_class


def class_names_for(config: RunConfig) -> dict[int, str]:
    root = resolve_dataset_root(config)
    return read_class_names(load_data_yaml(root), root / DATA_YAML_NAME)


def write_review_set(
    config: RunConfig,
    weights: Path,
    *,
    split: str,
    confidence: float = DEFAULT_CONFIDENCE,
) -> Path:
    """Render predictions onto the held-out images for a visual false-positive audit."""
    from ultralytics import YOLO

    split_paths = require_split(discover_splits(resolve_dataset_root(config)), split)
    output_name = f"{config.run_name}-review-{split}"
    model = YOLO(str(weights))
    model.predict(
        source=str(split_paths.images_dir),
        imgsz=config.imgsz,
        conf=confidence,
        save=True,
        project=str(config.output_dir),
        name=output_name,
        verbose=False,
    )
    return config.output_dir / output_name


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG_PATH)
    parser.add_argument(
        "--weights",
        type=Path,
        default=None,
        help=f"Checkpoint to evaluate (default: <output_dir>/<run_name>/{WEIGHTS_DIR_NAME}/{BEST_WEIGHT_NAME}).",
    )
    parser.add_argument("--split", default=DEFAULT_SPLIT)
    parser.add_argument("--conf", type=float, default=DEFAULT_CONFIDENCE)
    parser.add_argument("--iou", type=float, default=DEFAULT_IOU)
    parser.add_argument("--review", action="store_true", help="Write annotated images.")
    args = parser.parse_args(argv)

    try:
        config = load_run_config(args.config)
        weights = args.weights or config.weights_path
        result = evaluate(
            config,
            weights,
            split=args.split,
            confidence=args.conf,
            iou=args.iou,
            save_review=args.review,
        )
    except (ConfigError, DatasetError, EvaluationError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
