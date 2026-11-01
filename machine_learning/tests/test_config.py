"""Unit tests for training configuration loading."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from machine_learning.config import ConfigError, load_run_config

VALID_CONFIG = {
    "dataset_root": "datasets/mold",
    "output_dir": "runs",
    "run_name": "unit-1280",
    "model": "yolo11s.pt",
    "train": {"imgsz": 1280, "epochs": 10, "batch": 4, "patience": 5},
}


def write_config(tmp_path: Path, overrides: dict | None = None) -> Path:
    payload = {**VALID_CONFIG, **(overrides or {})}
    path = tmp_path / "train.yaml"
    path.write_text(yaml.safe_dump(payload), encoding="utf-8")
    return path


def test_loads_valid_config(tmp_path: Path) -> None:
    config = load_run_config(write_config(tmp_path))

    assert config.run_name == "unit-1280"
    assert config.imgsz == 1280
    assert config.dataset_root.is_absolute()
    assert config.weights_path.name == "best.pt"


def test_rejects_missing_config(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match="not found"):
        load_run_config(tmp_path / "absent.yaml")


def test_rejects_missing_required_key(tmp_path: Path) -> None:
    path = write_config(tmp_path)
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    payload.pop("model")
    path.write_text(yaml.safe_dump(payload), encoding="utf-8")

    with pytest.raises(ConfigError, match="model"):
        load_run_config(path)


def test_rejects_imgsz_not_multiple_of_32(tmp_path: Path) -> None:
    train = {**VALID_CONFIG["train"], "imgsz": 1000}

    with pytest.raises(ConfigError, match="multiple of 32"):
        load_run_config(write_config(tmp_path, {"train": train}))


def test_rejects_non_integer_epochs(tmp_path: Path) -> None:
    train = {**VALID_CONFIG["train"], "epochs": "many"}

    with pytest.raises(ConfigError, match="'epochs' must be an integer"):
        load_run_config(write_config(tmp_path, {"train": train}))


def test_rejects_unsafe_run_name(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match="run_name"):
        load_run_config(write_config(tmp_path, {"run_name": "nested/path"}))
