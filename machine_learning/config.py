"""Typed access to the training configuration.

Relative paths in the YAML resolve against the repository root, so the same
file works from a local shell and from a Kaggle notebook without edits.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

PACKAGE_ROOT = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE_ROOT.parent
DEFAULT_CONFIG_PATH = PACKAGE_ROOT / "configs" / "train.yaml"

REQUIRED_TOP_LEVEL_KEYS = ("dataset_root", "output_dir", "run_name", "model", "train")
REQUIRED_TRAIN_KEYS = ("imgsz", "epochs", "batch", "patience")

WEIGHTS_DIR_NAME = "weights"
BEST_WEIGHT_NAME = "best.pt"

IMGSZ_MULTIPLE = 32
MIN_IMGSZ = 320
MAX_IMGSZ = 1920
RUN_NAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]+$")


class ConfigError(ValueError):
    """Raised when the training configuration is missing or malformed."""


@dataclass(frozen=True)
class RunConfig:
    """One training run: where the data is, where output goes, how to train."""

    config_path: Path
    dataset_root: Path
    output_dir: Path
    run_name: str
    model: str
    train: Mapping[str, Any]

    @property
    def imgsz(self) -> int:
        return int(self.train["imgsz"])

    @property
    def epochs(self) -> int:
        return int(self.train["epochs"])

    @property
    def weights_path(self) -> Path:
        return self.output_dir / self.run_name / WEIGHTS_DIR_NAME / BEST_WEIGHT_NAME


def resolve_repo_path(raw: str) -> Path:
    candidate = Path(raw).expanduser()
    if candidate.is_absolute():
        return candidate
    return (REPO_ROOT / candidate).resolve()


def load_run_config(path: Path = DEFAULT_CONFIG_PATH) -> RunConfig:
    resolved = path.expanduser()
    if not resolved.is_file():
        raise ConfigError(f"Training config not found: {resolved}")

    try:
        loaded = yaml.safe_load(resolved.read_text(encoding="utf-8"))
    except yaml.YAMLError as error:
        raise ConfigError(f"{resolved} is not valid YAML: {error}") from error
    if not isinstance(loaded, dict):
        raise ConfigError(f"{resolved} must contain a YAML mapping.")

    missing = [key for key in REQUIRED_TOP_LEVEL_KEYS if key not in loaded]
    if missing:
        raise ConfigError(f"{resolved} is missing required keys: {', '.join(missing)}")

    train = loaded["train"]
    if not isinstance(train, dict):
        raise ConfigError(f"{resolved}: 'train' must be a mapping of Ultralytics arguments.")
    missing_train = [key for key in REQUIRED_TRAIN_KEYS if key not in train]
    if missing_train:
        raise ConfigError(f"{resolved}: 'train' is missing keys: {', '.join(missing_train)}")

    run_name = str(loaded["run_name"])
    if not RUN_NAME_PATTERN.match(run_name):
        raise ConfigError(
            f"{resolved}: run_name '{run_name}' may only contain letters, digits, '.', '_' and '-'."
        )

    validate_training_values(train, resolved)
    return RunConfig(
        config_path=resolved,
        dataset_root=resolve_repo_path(str(loaded["dataset_root"])),
        output_dir=resolve_repo_path(str(loaded["output_dir"])),
        run_name=run_name,
        model=str(loaded["model"]),
        train=dict(train),
    )


def validate_training_values(train: Mapping[str, Any], source: Path) -> None:
    imgsz = require_int(train, "imgsz", source, minimum=MIN_IMGSZ, maximum=MAX_IMGSZ)
    if imgsz % IMGSZ_MULTIPLE:
        raise ConfigError(f"{source}: imgsz must be a multiple of {IMGSZ_MULTIPLE}, got {imgsz}.")
    require_int(train, "epochs", source, minimum=1)
    require_int(train, "batch", source, minimum=1)
    require_int(train, "patience", source, minimum=1)


def require_int(
    train: Mapping[str, Any],
    key: str,
    source: Path,
    *,
    minimum: int,
    maximum: int | None = None,
) -> int:
    value = train[key]
    if isinstance(value, bool) or not isinstance(value, int):
        raise ConfigError(f"{source}: '{key}' must be an integer, got {value!r}.")
    if value < minimum:
        raise ConfigError(f"{source}: '{key}' must be >= {minimum}, got {value}.")
    if maximum is not None and value > maximum:
        raise ConfigError(f"{source}: '{key}' must be <= {maximum}, got {value}.")
    return value
