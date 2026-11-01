"""Train the PalaySigla defect and mold detector.

The dataset audit runs first and blocks training while it reports problems, so
a mislabelled export cannot silently consume a GPU session.
"""

from __future__ import annotations

import argparse
import csv
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
    DatasetError,
    audit_dataset,
    file_sha256,
    format_audit,
    prepare_data_yaml,
)

RESULTS_CSV_NAME = "results.csv"
RUN_SUMMARY_NAME = "run_summary.json"
METRIC_KEYS = (
    "metrics/precision(B)",
    "metrics/recall(B)",
    "metrics/mAP50(B)",
    "metrics/mAP50-95(B)",
)


class TrainingError(RuntimeError):
    """Raised when the run cannot start or produced no usable artifact."""


def train(config: RunConfig, *, force: bool = False) -> dict[str, Any]:
    audit = audit_dataset(config)
    print(format_audit(audit))
    if audit.has_problems and not force:
        raise TrainingError(
            "Refusing to train while the audit reports blocking problems "
            "(re-run with --force to override):\n"
            + "\n".join(f"  - {problem}" for problem in audit.problems)
        )

    try:
        from ultralytics import YOLO
    except ImportError as error:
        raise TrainingError(
            "ultralytics is not installed. " "Run: pip install -r machine_learning/requirements.txt"
        ) from error

    data_yaml = prepare_data_yaml(config, config.output_dir / f"{config.run_name}-data.yaml")
    train_args: dict[str, Any] = dict(config.train)
    train_args.update({"project": str(config.output_dir), "name": config.run_name})

    model = YOLO(config.model)
    model.train(data=str(data_yaml), **train_args)

    # Ultralytics returns the validator metrics, not the trainer, so the run
    # directory is read off the trainer (it appends a suffix when name repeats).
    save_dir = Path(getattr(model.trainer, "save_dir", config.output_dir / config.run_name))
    best_weight = save_dir / WEIGHTS_DIR_NAME / BEST_WEIGHT_NAME
    if not best_weight.is_file():
        raise TrainingError(f"Training finished without producing {best_weight}.")

    summary: dict[str, Any] = {
        "run_name": config.run_name,
        "dataset_root": str(audit.root),
        "data_yaml": str(data_yaml),
        "imgsz": config.imgsz,
        "epochs_requested": config.epochs,
        "split_image_counts": {split.name: split.images for split in audit.splits},
        "class_names": audit.class_names,
        "best_weight": str(best_weight),
        "best_weight_sha256": file_sha256(best_weight),
        "final_metrics": read_final_metrics(save_dir / RESULTS_CSV_NAME),
    }
    (save_dir / RUN_SUMMARY_NAME).write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def read_final_metrics(results_csv: Path) -> dict[str, float]:
    if not results_csv.is_file():
        return {}
    with results_csv.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        return {}

    final_row = rows[-1]
    metrics: dict[str, float] = {}
    for key in METRIC_KEYS:
        raw_value = final_row.get(key)
        if raw_value is None:
            continue
        try:
            metrics[key] = float(raw_value)
        except ValueError:
            continue
    return metrics


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG_PATH)
    parser.add_argument(
        "--force", action="store_true", help="Train even when the audit reports problems."
    )
    args = parser.parse_args(argv)

    try:
        summary = train(load_run_config(args.config), force=args.force)
    except (ConfigError, DatasetError, TrainingError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
