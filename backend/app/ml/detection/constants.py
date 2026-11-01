"""Preprocessing and postprocessing constants for the defect detector.

The artifact is a YOLO11-S fine-tuned through Roboflow on one class,
``Palay-Molds-and-Discoloration``, at 1280x1280 with a *stretch* resize. These
values must match that training pipeline exactly; see ``preprocess`` for why
stretch and letterbox are not interchangeable here.
"""

from __future__ import annotations

CLASS_NAMES = ("mold_discoloration",)
CLASS_LABELS = {"mold_discoloration": "Mold / discoloration"}
NUM_CLASSES = len(CLASS_NAMES)

EXPECTED_INPUT_RANK = 4
EXPECTED_BATCH = 1
EXPECTED_CHANNELS = 3
BOX_FIELDS = 4

# Ultralytics applies the sigmoid to class scores inside the detection head
# before export, so the ONNX output already holds probabilities in [0, 1].
PIXEL_SCALE = 1.0 / 255.0

DEFAULT_INPUT_SIZE = 1280
DEFAULT_MAX_DETECTIONS = 300

# Severity is the share of the frame covered by defect boxes. These bands are
# provisional until agronomic cutoffs are supplied; they live here (not inline)
# so calibration is one edit.
SEVERITY_NONE_MAX = 0.0025
SEVERITY_LOW_MAX = 0.0100
SEVERITY_MODERATE_MAX = 0.0300
SEVERITY_NONE = "none"
SEVERITY_LOW = "low"
SEVERITY_MODERATE = "moderate"
SEVERITY_HIGH = "high"

QUALITY_BY_SEVERITY = {
    SEVERITY_NONE: "premium",
    SEVERITY_LOW: "good",
    SEVERITY_MODERATE: "fair",
    SEVERITY_HIGH: "poor",
}

AVAILABLE_OUTPUTS = ("mold", "quality_status")
UNAVAILABLE_OUTPUTS = ("market_grade", "variety")
