# machine_learning

Training tooling for the PalaySigla defect and mold detector (YOLO11-S). It is
separate from `backend/` on purpose: `torch` and `ultralytics` never enter the
API image, and the backend only ever loads the exported ONNX artifact.

## Layout

| File | Purpose |
|---|---|
| `config.py` | Typed access to the YAML recipe; repo-relative path resolution |
| `dataset.py` | Layout discovery, dataset audit, `data.yaml` preparation |
| `train.py` | Audit-gated training run + run summary with artifact hash |
| `evaluate.py` | Held-out scoring, per-class AP, visual review set |
| `export.py` | ONNX export, input-shape assertion, SHA-256, `.pt` parity check |
| `cli.py` | `python -m machine_learning.cli audit\|train\|evaluate\|export` |
| `configs/train.yaml` | The recipe: 1280 px input, YOLO11-S, camera-simulation augmentation |

## Setup

```bash
cd /home/jensen/PalaySigla
python3 -m venv .venv-ml && . .venv-ml/bin/activate
pip install -r machine_learning/requirements.txt
```

Put the unzipped Roboflow export at `backend/datasets/mold/` (or point
`dataset_root` in `configs/train.yaml` at wherever it lives). The export must
contain `data.yaml` plus `train/`, `valid/`, `test/` each with `images/` and
`labels/`.

## Commands

```bash
# 1. Audit first — this is the step that decides whether training is worth it.
python -m machine_learning.cli audit

# 2. Train (refuses to start if the audit reports blocking problems).
python -m machine_learning.cli train

# 3. Score the locked test split, and render predictions for a visual review.
python -m machine_learning.cli evaluate --review

# 4. Export ONNX at the trained resolution, print the SHA-256, check parity.
python -m machine_learning.cli export
```

`--force` on `train` overrides the audit gate. Use it only for a deliberate
diagnostic run, never for a model you intend to ship.

## Tests

```bash
pip install -r machine_learning/requirements-dev.txt
python -m pytest machine_learning/tests -q
```

The audit tests need neither torch nor ultralytics: they build a synthetic
export in a temp directory and assert on the audit's findings.

## What the audit reports

- per-split image, annotated, null-image, and box counts
- **object size percentiles in pixels at the configured input size** — the
  number that tells you whether the resolution is workable (target ≥ 32 px)
- duplicate images appearing in more than one split (silent mAP inflation)
- class coverage, including classes with zero instances
- missing negative frames (every frame containing a defect teaches the model
  that a defect always exists somewhere)

The audit reads the export read-only; `data.yaml` is rewritten with resolved
absolute paths next to the run output, so the downloaded dataset keeps working
on any host.

## Kaggle

Upload the export as a private Kaggle Dataset, enable GPU + Internet, then run
from a checkout of this repository (add the repo root to `sys.path`, or
`%cd` into it) and override the paths in `configs/train.yaml`:

```yaml
dataset_root: /kaggle/input/palay-mold
output_dir: /kaggle/working/runs
```

`/kaggle/working` is wiped when the session ends: download `best.pt`,
`best.onnx`, and the run summary before closing the tab.

## Handoff to the backend

`export` prints the ONNX path and its SHA-256. Those become:

```
ASSESS_MODEL_PATH=/etc/secrets/mold_detector.onnx
ASSESS_MODEL_SHA256=79e6e321661d1546bdf92b30fa320c00a6f9f01d722012d86ebf2ca991d9fa59
ASSESS_IMGSZ=1280
```

The checked-in `models/` folder is gitignored; the artifact travels as a
deploy secret. The current export is a 36.7 MB fp32 graph with input
`[1, 3, 1280, 1280]` and output `[1, 5, 33600]`, one class
(`Palay-Molds-and-Discoloration`).

The ONNX input must be `[1, 3, 1280, 1280]`; `export` fails loudly if it is not.
Inference must reproduce the same preprocessing (stretch-resize to 1280, RGB,
`/255`), or the artifact will underperform its validation numbers.

## Acceptance criteria

A checkpoint is shippable only when, on the locked test split:

- mold recall ≥ 0.70 and precision ≥ 0.70
- mAP@50 ≥ 0.75, mAP@50-95 ≥ 0.45
- the review set shows no confident "false positives" that are actually
  unboxed defects (if they are, fix the annotations before tuning anything)
- `export` parity holds: the ONNX graph reproduces the checkpoint's detections

## Licensing

Ultralytics YOLO is AGPL-3.0. Acceptable for coursework; shipping PalaySigla as
a closed-source product requires a commercial Ultralytics licence.
