import cv2
import numpy as np

from app.ml.scan.digits import preprocess_cell
from app.ml.scan.spec import DIGIT_INPUT_SIZE


def _blank_cell() -> np.ndarray:
    return np.full((200, 150, 3), 255, dtype=np.uint8)


def _digit_cell() -> np.ndarray:
    cell = _blank_cell()
    cv2.putText(cell, "7", (30, 160), cv2.FONT_HERSHEY_SIMPLEX, 4.5, (0, 0, 0), 14)
    return cell


def test_blank_cell_returns_none():
    assert preprocess_cell(_blank_cell()) is None


def test_digit_cell_normalizes_to_model_input():
    tensor = preprocess_cell(_digit_cell())

    assert tensor is not None
    assert tensor.shape == (DIGIT_INPUT_SIZE, DIGIT_INPUT_SIZE)
    assert tensor.dtype == np.float32
