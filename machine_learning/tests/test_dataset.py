"""Unit tests for dataset auditing and data.yaml preparation."""

from __future__ import annotations

from pathlib import Path

import pytest
from machine_learning.config import RunConfig
from machine_learning.dataset import (
    DATA_YAML_NAME,
    DatasetError,
    audit_dataset,
    prepare_data_yaml,
)

IMGSZ = 1280
NAME_LINE = "names: ['mold']"
DEFAULT_BOX = "0 0.5 0.5 0.05 0.05"
TINY_BOX = "0 0.5 0.5 0.008 0.008"


def make_config(root: Path, imgsz: int = IMGSZ) -> RunConfig:
    return RunConfig(
        config_path=root / "train.yaml",
        dataset_root=root,
        output_dir=root / "runs",
        run_name="unit",
        model="yolo11s.pt",
        train={"imgsz": imgsz, "epochs": 1, "batch": 1, "patience": 1},
    )


def write_dataset(
    root: Path,
    split_sizes: dict[str, int],
    *,
    box: str = DEFAULT_BOX,
    empty_labels: tuple[str, ...] = (),
) -> Path:
    for split, count in split_sizes.items():
        images_dir = root / split / "images"
        labels_dir = root / split / "labels"
        images_dir.mkdir(parents=True)
        labels_dir.mkdir(parents=True)
        for index in range(count):
            stem = f"{split}_{index}"
            (images_dir / f"{stem}.jpg").write_bytes(f"{stem}-pixels".encode())
            content = "" if stem in empty_labels else f"{box}\n"
            (labels_dir / f"{stem}.txt").write_text(content, encoding="utf-8")
    (root / DATA_YAML_NAME).write_text(f"nc: 1\n{NAME_LINE}\n", encoding="utf-8")
    return root


def test_audit_reports_counts_and_null_images(tmp_path: Path) -> None:
    root = write_dataset(
        tmp_path / "dataset", {"train": 4, "valid": 2, "test": 1}, empty_labels=("train_3",)
    )

    audit = audit_dataset(make_config(root))

    split_by_name = {split.name: split for split in audit.splits}
    assert split_by_name["train"].images == 4
    assert split_by_name["train"].annotated_images == 3
    assert split_by_name["train"].null_images == 1
    assert split_by_name["train"].boxes == 3
    assert split_by_name["test"].images == 1
    assert not audit.cross_split_duplicates


def test_audit_flags_duplicates_across_splits(tmp_path: Path) -> None:
    root = write_dataset(tmp_path / "dataset", {"train": 2, "valid": 1, "test": 1})
    duplicate = (root / "train" / "images" / "train_0.jpg").read_bytes()
    (root / "test" / "images" / "test_0.jpg").write_bytes(duplicate)

    audit = audit_dataset(make_config(root))

    assert audit.cross_split_duplicates
    assert any("more than one split" in problem for problem in audit.problems)


def test_audit_flags_class_with_no_instances(tmp_path: Path) -> None:
    root = write_dataset(tmp_path / "dataset", {"train": 2, "valid": 1, "test": 1})
    (root / DATA_YAML_NAME).write_text("nc: 2\nnames: ['mold', 'discoloration']\n")

    audit = audit_dataset(make_config(root))

    assert any("discoloration" in problem for problem in audit.problems)


def test_audit_flags_objects_below_hard_floor(tmp_path: Path) -> None:
    root = write_dataset(tmp_path / "dataset", {"train": 2, "valid": 1, "test": 1}, box=TINY_BOX)

    audit = audit_dataset(make_config(root))

    assert any("hard floor" in problem for problem in audit.problems)


def test_audit_warns_when_no_negative_frames(tmp_path: Path) -> None:
    root = write_dataset(tmp_path / "dataset", {"train": 2, "valid": 1, "test": 1})

    audit = audit_dataset(make_config(root))

    assert any("healthy sample" in warning for warning in audit.warnings)


def test_audit_rejects_malformed_label(tmp_path: Path) -> None:
    root = write_dataset(tmp_path / "dataset", {"train": 1, "valid": 1, "test": 1})
    (root / "train" / "labels" / "train_0.txt").write_text("0 0.5 0.5 0.05\n")

    with pytest.raises(DatasetError, match="expected 5"):
        audit_dataset(make_config(root))


def test_audit_rejects_class_id_out_of_range(tmp_path: Path) -> None:
    root = write_dataset(
        tmp_path / "dataset", {"train": 1, "valid": 1, "test": 1}, box="3 0.5 0.5 0.05 0.05"
    )

    with pytest.raises(DatasetError, match="class id 3"):
        audit_dataset(make_config(root))


def test_prepare_data_yaml_writes_canonical_paths(tmp_path: Path) -> None:
    root = write_dataset(tmp_path / "dataset", {"train": 1, "valid": 1})
    (root / DATA_YAML_NAME).write_text(
        "train: ../train/images\nval: ../valid/images\nnc: 1\nnames: ['mold']\n"
    )

    destination = prepare_data_yaml(make_config(root), tmp_path / "out" / "data.yaml")
    text = destination.read_text(encoding="utf-8")

    assert f"path: {root}" in text
    assert "train: train/images" in text
    assert "val: valid/images" in text
    assert "test:" not in text
    assert "0: mold" in text
