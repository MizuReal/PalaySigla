"""Command line entry point for the PalaySigla training pipeline.

Usage (from the repository root):
    python -m machine_learning.cli audit
    python -m machine_learning.cli train
    python -m machine_learning.cli evaluate --review
    python -m machine_learning.cli export
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path

from machine_learning.config import (
    DEFAULT_CONFIG_PATH,
    ConfigError,
    RunConfig,
    load_run_config,
)
from machine_learning.dataset import DatasetError, audit_dataset, format_audit
from machine_learning.evaluate import (
    DEFAULT_CONFIDENCE,
    DEFAULT_IOU,
    DEFAULT_SPLIT,
    EvaluationError,
    evaluate,
)
from machine_learning.export import DEFAULT_OPSET, ExportError, run_export
from machine_learning.train import TrainingError, train

EXIT_FAILURE = 1
EXIT_SUCCESS = 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="machine_learning", description=__doc__)
    parser.add_argument(
        "--config", type=Path, default=DEFAULT_CONFIG_PATH, help="Training YAML to load."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit_parser = subparsers.add_parser("audit", help="Audit the dataset before training.")
    audit_parser.add_argument("--json", action="store_true", help="Print the audit as JSON.")

    train_parser = subparsers.add_parser("train", help="Train the detector.")
    train_parser.add_argument(
        "--force", action="store_true", help="Train even when the audit reports problems."
    )

    evaluate_parser = subparsers.add_parser(
        "evaluate", help="Score a checkpoint on a held-out split."
    )
    evaluate_parser.add_argument("--weights", type=Path, default=None)
    evaluate_parser.add_argument("--split", default=DEFAULT_SPLIT)
    evaluate_parser.add_argument("--conf", type=float, default=DEFAULT_CONFIDENCE)
    evaluate_parser.add_argument("--iou", type=float, default=DEFAULT_IOU)
    evaluate_parser.add_argument(
        "--review", action="store_true", help="Write annotated images for the false-positive audit."
    )

    export_parser = subparsers.add_parser("export", help="Export ONNX and print the artifact hash.")
    export_parser.add_argument("--weights", type=Path, default=None)
    export_parser.add_argument("--opset", type=int, default=DEFAULT_OPSET)
    export_parser.add_argument("--skip-parity", action="store_true")
    return parser


def resolve_weights(config: RunConfig, explicit: Path | None) -> Path:
    weights = explicit if explicit is not None else config.weights_path
    if not weights.is_file():
        raise FileNotFoundError(
            f"Checkpoint not found: {weights}. Train first, or pass --weights <path>."
        )
    return weights


def run_command(args: argparse.Namespace, config: RunConfig) -> int:
    if args.command == "audit":
        audit = audit_dataset(config)
        print(json.dumps(audit.to_dict(), indent=2) if args.json else format_audit(audit))
        return EXIT_FAILURE if audit.has_problems else EXIT_SUCCESS

    if args.command == "train":
        summary = train(config, force=args.force)
        print(json.dumps(summary, indent=2))
        return EXIT_SUCCESS

    if args.command == "evaluate":
        result = evaluate(
            config,
            resolve_weights(config, args.weights),
            split=args.split,
            confidence=args.conf,
            iou=args.iou,
            save_review=args.review,
        )
        print(json.dumps(result, indent=2))
        return EXIT_SUCCESS

    result = run_export(
        config,
        resolve_weights(config, args.weights),
        opset=args.opset,
        check_parity=not args.skip_parity,
    )
    print(json.dumps(result, indent=2))
    return EXIT_SUCCESS


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        config = load_run_config(args.config)
        return run_command(args, config)
    except (
        ConfigError,
        DatasetError,
        TrainingError,
        EvaluationError,
        ExportError,
        FileNotFoundError,
    ) as error:
        print(f"error: {error}", file=sys.stderr)
        return EXIT_FAILURE


if __name__ == "__main__":
    raise SystemExit(main())
