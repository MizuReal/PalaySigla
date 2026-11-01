"""Dataset layout discovery, auditing, and ``data.yaml`` preparation.

The audit encodes the failure modes this dataset actually has: objects too
small for the configured input size, positives that were never boxed (so the
training loop would treat them as background), and duplicates that leak
between splits and inflate the reported score.
"""

from __future__ import annotations

import hashlib
import math
from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from machine_learning.config import RunConfig

DATA_YAML_NAME = "data.yaml"
IMAGES_DIR_NAME = "images"
LABELS_DIR_NAME = "labels"
LABEL_SUFFIX = ".txt"
IMAGE_SUFFIXES = frozenset({".jpg", ".jpeg", ".png", ".webp"})
BOX_FIELD_COUNT = 5
COORDINATE_TOLERANCE = 1e-3
HASH_CHUNK_SIZE = 1 << 20

SPLIT_KEYS = ("train", "val", "test")
SPLIT_DIR_CANDIDATES: dict[str, tuple[str, ...]] = {
    "train": ("train",),
    "val": ("valid", "val"),
    "test": ("test",),
}

# Below ~32 px at the network input, small-object recall collapses; below 16 px
# a single-stride-8 feature map cannot represent the object at all.
MIN_OBJECT_PX_AT_INPUT = 32.0
HARD_MIN_OBJECT_PX_AT_INPUT = 16.0
MIN_INSTANCES_PER_CLASS = 50
PERCENTILES = (10, 50, 90)
MAX_REPORTED_ITEMS = 10


class DatasetError(RuntimeError):
    """Raised when the export is missing, malformed, or unusable."""


@dataclass(frozen=True)
class SplitPaths:
    name: str
    images_dir: Path
    labels_dir: Path


@dataclass(frozen=True)
class SplitAudit:
    name: str
    images: int
    annotated_images: int
    null_images: int
    boxes: int
    class_counts: dict[int, int]
    object_px_percentiles: dict[int, float]


@dataclass(frozen=True)
class DatasetAudit:
    root: Path
    imgsz: int
    class_names: dict[int, str]
    splits: tuple[SplitAudit, ...]
    cross_split_duplicates: tuple[str, ...]
    problems: tuple[str, ...]
    warnings: tuple[str, ...]

    @property
    def has_problems(self) -> bool:
        return bool(self.problems)

    def to_dict(self) -> dict[str, Any]:
        return {
            "root": str(self.root),
            "imgsz": self.imgsz,
            "class_names": self.class_names,
            "splits": [
                {
                    "name": split.name,
                    "images": split.images,
                    "annotated_images": split.annotated_images,
                    "null_images": split.null_images,
                    "boxes": split.boxes,
                    "class_counts": split.class_counts,
                    "object_px_percentiles": split.object_px_percentiles,
                }
                for split in self.splits
            ],
            "cross_split_duplicates": list(self.cross_split_duplicates),
            "problems": list(self.problems),
            "warnings": list(self.warnings),
        }


def resolve_dataset_root(config: RunConfig) -> Path:
    """Locate the exported dataset, tolerating a single wrapping folder from a zip."""
    root = config.dataset_root
    if (root / DATA_YAML_NAME).is_file():
        return root
    if root.is_dir():
        nested = sorted(child for child in root.iterdir() if (child / DATA_YAML_NAME).is_file())
        if len(nested) == 1:
            return nested[0]
    raise DatasetError(
        f"{root} does not contain {DATA_YAML_NAME}. Unzip the Roboflow YOLO export there, "
        "either directly or inside a single wrapper folder."
    )


def load_data_yaml(root: Path) -> dict[str, Any]:
    source = root / DATA_YAML_NAME
    try:
        loaded = yaml.safe_load(source.read_text(encoding="utf-8"))
    except yaml.YAMLError as error:
        raise DatasetError(f"{source} is not valid YAML: {error}") from error
    if not isinstance(loaded, dict):
        raise DatasetError(f"{source} must contain a YAML mapping.")
    return loaded


def load_class_names(data: Mapping[str, Any], source: Path) -> dict[int, str]:
    raw_names = data.get("names")
    if isinstance(raw_names, dict) and raw_names:
        return {int(index): str(name) for index, name in raw_names.items()}
    if isinstance(raw_names, list) and raw_names:
        return {index: str(name) for index, name in enumerate(raw_names)}
    raise DatasetError(f"{source} has no usable 'names' mapping.")


def discover_splits(root: Path) -> dict[str, SplitPaths]:
    """Find ``<root>/<split>/images`` directories, accepting Roboflow's naming."""
    found: dict[str, SplitPaths] = {}
    tried: list[str] = []
    for split_key in SPLIT_KEYS:
        for directory_name in SPLIT_DIR_CANDIDATES[split_key]:
            images_dir = root / directory_name / IMAGES_DIR_NAME
            tried.append(str(images_dir))
            if images_dir.is_dir():
                found[split_key] = SplitPaths(
                    name=split_key,
                    images_dir=images_dir,
                    labels_dir=images_dir.parent / LABELS_DIR_NAME,
                )
                break
    if "train" not in found or "val" not in found:
        expected = "\n".join(f"  - {path}" for path in tried)
        raise DatasetError(f"No train/val images directory under {root}. Looked for:\n{expected}")
    return found


def require_split(splits: Mapping[str, SplitPaths], name: str) -> SplitPaths:
    split = splits.get(name)
    if split is None:
        available = ", ".join(sorted(splits)) or "none"
        raise DatasetError(f"Split '{name}' is not present (available: {available}).")
    return split


def iter_images(images_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in images_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    )


def label_path_for(image_path: Path) -> Path:
    return image_path.parent.parent / LABELS_DIR_NAME / f"{image_path.stem}{LABEL_SUFFIX}"


def read_boxes(label_path: Path, class_count: int) -> list[tuple[int, float, float, float, float]]:
    """Read YOLO ``class cx cy w h`` rows, rejecting anything the trainer would misread."""
    if not label_path.is_file():
        return []
    text = label_path.read_text(encoding="utf-8").strip()
    if not text:
        return []

    boxes: list[tuple[int, float, float, float, float]] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        fields = line.split()
        if len(fields) != BOX_FIELD_COUNT:
            raise DatasetError(
                f"{label_path}:{line_number} has {len(fields)} fields, expected {BOX_FIELD_COUNT}."
            )
        try:
            class_id = int(fields[0])
            center_x, center_y, width, height = (float(value) for value in fields[1:])
        except ValueError as error:
            raise DatasetError(f"{label_path}:{line_number} is not numeric.") from error

        if not 0 <= class_id < class_count:
            raise DatasetError(
                f"{label_path}:{line_number} class id {class_id} is outside 0..{class_count - 1}."
            )
        if width <= 0 or height <= 0:
            raise DatasetError(f"{label_path}:{line_number} has a zero-area box.")
        for value in (center_x, center_y, width, height):
            if value < -COORDINATE_TOLERANCE or value > 1 + COORDINATE_TOLERANCE:
                raise DatasetError(
                    f"{label_path}:{line_number} coordinates outside [0, 1]: {value}."
                )
        boxes.append(
            (
                class_id,
                clamp_unit(center_x),
                clamp_unit(center_y),
                clamp_unit(width),
                clamp_unit(height),
            )
        )
    return boxes


def clamp_unit(value: float) -> float:
    return min(1.0, max(0.0, value))


def percentile(values: Sequence[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[int(position)]
    weight = position - lower
    return ordered[lower] * (1.0 - weight) + ordered[upper] * weight


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(HASH_CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def audit_dataset(config: RunConfig) -> DatasetAudit:
    root = resolve_dataset_root(config)
    data = load_data_yaml(root)
    class_names = load_class_names(data, root / DATA_YAML_NAME)
    splits = discover_splits(root)

    problems: list[str] = []
    warnings: list[str] = []
    split_audits: list[SplitAudit] = []
    hash_splits: dict[str, set[str]] = defaultdict(set)
    all_object_px: list[float] = []
    totals_by_class: Counter[int] = Counter()
    train_null_images = 0

    for split_key in SPLIT_KEYS:
        split = splits.get(split_key)
        if split is None:
            if split_key == "test":
                warnings.append("No test split found; evaluate against 'val' instead.")
                continue
            raise DatasetError(f"Split '{split_key}' is required but missing.")
        split_audits.append(
            audit_split(
                split=split,
                imgsz=config.imgsz,
                class_count=len(class_names),
                hash_splits=hash_splits,
                all_object_px=all_object_px,
                totals_by_class=totals_by_class,
                problems=problems,
            )
        )
        if split_key == "train":
            train_null_images = split_audits[-1].null_images

    duplicated = sorted(digest for digest, owners in hash_splits.items() if len(owners) > 1)
    if duplicated:
        problems.append(
            f"{len(duplicated)} image(s) appear in more than one split, so validation scores "
            "measure memorization rather than generalization."
        )

    append_class_coverage(totals_by_class, class_names, problems, warnings)

    if all_object_px:
        median_px = percentile(all_object_px, 0.5)
        if median_px < HARD_MIN_OBJECT_PX_AT_INPUT:
            problems.append(
                f"Median object is {median_px:.1f}px at {config.imgsz}px input, below the "
                f"{HARD_MIN_OBJECT_PX_AT_INPUT:.0f}px hard floor. Raise imgsz or tile the images."
            )
        elif median_px < MIN_OBJECT_PX_AT_INPUT:
            warnings.append(
                f"Median object is {median_px:.1f}px at {config.imgsz}px input. Small-object "
                f"recall usually degrades below {MIN_OBJECT_PX_AT_INPUT:.0f}px."
            )

    if train_null_images == 0:
        warnings.append(
            "The train split has no images without annotations, so the model never sees a "
            "genuinely healthy sample."
        )

    return DatasetAudit(
        root=root,
        imgsz=config.imgsz,
        class_names=class_names,
        splits=tuple(split_audits),
        cross_split_duplicates=tuple(duplicated[:MAX_REPORTED_ITEMS]),
        problems=tuple(problems),
        warnings=tuple(warnings),
    )


def audit_split(
    *,
    split: SplitPaths,
    imgsz: int,
    class_count: int,
    hash_splits: dict[str, set[str]],
    all_object_px: list[float],
    totals_by_class: Counter[int],
    problems: list[str],
) -> SplitAudit:
    images = iter_images(split.images_dir)
    if not images:
        problems.append(f"Split '{split.name}' contains no images.")
        return SplitAudit(split.name, 0, 0, 0, 0, {}, {p: 0.0 for p in PERCENTILES})

    class_counts: Counter[int] = Counter()
    object_px: list[float] = []
    null_images = 0

    for image in images:
        hash_splits[file_sha256(image)].add(split.name)
        boxes = read_boxes(label_path_for(image), class_count)
        if not boxes:
            null_images += 1
            continue
        for class_id, _center_x, _center_y, width, height in boxes:
            class_counts[class_id] += 1
            # Equivalent to sqrt(area) in pixels at the configured input, the same
            # notion COCO uses to classify objects as small (< 32 px).
            object_px.append(math.sqrt(width * height) * imgsz)

    totals_by_class.update(class_counts)
    all_object_px.extend(object_px)
    return SplitAudit(
        name=split.name,
        images=len(images),
        annotated_images=len(images) - null_images,
        null_images=null_images,
        boxes=sum(class_counts.values()),
        class_counts=dict(sorted(class_counts.items())),
        object_px_percentiles={
            percentile_value: round(percentile(object_px, percentile_value / 100), 1)
            for percentile_value in PERCENTILES
        },
    )


def append_class_coverage(
    totals_by_class: Counter[int],
    class_names: Mapping[int, str],
    problems: list[str],
    warnings: list[str],
) -> None:
    for class_id, class_name in class_names.items():
        count = totals_by_class.get(class_id, 0)
        if count == 0:
            problems.append(f"Class '{class_name}' has zero annotated instances.")
        elif count < MIN_INSTANCES_PER_CLASS:
            warnings.append(
                f"Class '{class_name}' has only {count} instances; "
                f"{MIN_INSTANCES_PER_CLASS}+ is recommended for stable AP."
            )


def prepare_data_yaml(config: RunConfig, destination: Path) -> Path:
    """Write a resolved copy of data.yaml; the export itself is never modified."""
    root = resolve_dataset_root(config)
    class_names = load_class_names(load_data_yaml(root), root / DATA_YAML_NAME)
    splits = discover_splits(root)

    payload: dict[str, Any] = {
        "path": str(root),
        "train": relative_images_path(splits["train"], root),
        "val": relative_images_path(splits["val"], root),
    }
    if "test" in splits:
        payload["test"] = relative_images_path(splits["test"], root)
    payload["nc"] = len(class_names)
    payload["names"] = {index: name for index, name in sorted(class_names.items())}

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")
    return destination


def relative_images_path(split: SplitPaths, root: Path) -> str:
    try:
        return split.images_dir.relative_to(root).as_posix()
    except ValueError as error:
        raise DatasetError(
            f"{split.images_dir} is outside the dataset root {root}; the export layout is broken."
        ) from error


def format_audit(audit: DatasetAudit) -> str:
    lines = [
        f"Dataset: {audit.root}",
        f"Input size: {audit.imgsz}px",
        "Classes: " + ", ".join(f"{index}={name}" for index, name in audit.class_names.items()),
        "",
    ]
    header = (
        f"{'split':<7}{'images':>8}{'labelled':>10}{'null':>7}{'boxes':>8}"
        f"{'p10 px':>9}{'median px':>11}{'p90 px':>9}"
    )
    lines.append(header)
    lines.append("-" * len(header))
    for split in audit.splits:
        lines.append(
            f"{split.name:<7}{split.images:>8}{split.annotated_images:>10}"
            f"{split.null_images:>7}{split.boxes:>8}"
            f"{split.object_px_percentiles.get(10, 0.0):>9.1f}"
            f"{split.object_px_percentiles.get(50, 0.0):>11.1f}"
            f"{split.object_px_percentiles.get(90, 0.0):>9.1f}"
        )

    if audit.cross_split_duplicates:
        lines += ["", "Duplicate images across splits:"]
        lines += [f"  - {digest[:12]}" for digest in audit.cross_split_duplicates]
    if audit.warnings:
        lines += ["", "Warnings:"] + [f"  - {warning}" for warning in audit.warnings]
    if audit.problems:
        lines += ["", "Problems:"] + [f"  - {problem}" for problem in audit.problems]
    if not audit.problems and not audit.warnings:
        lines += ["", "Audit clean."]
    return "\n".join(lines)
