"""Dev-only: train the scan digit CNN and export it to ONNX.

The production backend never trains; it loads the exported artifact through
``SCAN_DIGIT_MODEL_PATH`` at boot. Requires the training extras:

    .venv/bin/pip install -r requirements-dev.txt
    .venv/bin/python scripts/train_digit_model.py --output models/scan_digit.onnx

The script prints the artifact's SHA-256 so it can be recorded in
``SCAN_DIGIT_MODEL_SHA256`` for the startup integrity check.
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path

# The script runs as a file (`python scripts/...`), so the backend root must be
# on sys.path before the `app` package can be imported.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from app.ml.scan.spec import DIGIT_INPUT_SIZE, MNIST_MEAN, MNIST_STD

DEFAULT_EPOCHS = 5
DEFAULT_BATCH_SIZE = 128
DEFAULT_LEARNING_RATE = 1e-3
DEFAULT_SEED = 20260101
MNIST_DOWNLOAD_URL = "https://ossci-datasets.s3.amazonaws.com/mnist"
AFFINE_DEGREES = 8.0
AFFINE_TRANSLATE = 0.08
AFFINE_SCALE = (0.85, 1.15)
AFFINE_SHEAR = 5.0
DROPOUT = 0.3
HIDDEN_UNITS = 128
CONV_CHANNELS = (32, 64, 128)
ONNX_OPSET = 17


class DigitCNN(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        first, second, third = CONV_CHANNELS
        self.features = nn.Sequential(
            nn.Conv2d(1, first, 3, padding=1),
            nn.BatchNorm2d(first),
            nn.ReLU(inplace=True),
            nn.Conv2d(first, second, 3, padding=1),
            nn.BatchNorm2d(second),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(second, third, 3, padding=1),
            nn.BatchNorm2d(third),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(third * 7 * 7, HIDDEN_UNITS),
            nn.ReLU(inplace=True),
            nn.Dropout(DROPOUT),
            nn.Linear(HIDDEN_UNITS, 10),
        )

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        return self.classifier(self.features(inputs))


def _build_datasets(data_dir: Path) -> tuple[datasets.MNIST, datasets.MNIST]:
    train_transform = transforms.Compose(
        [
            transforms.RandomAffine(
                degrees=AFFINE_DEGREES,
                translate=(AFFINE_TRANSLATE, AFFINE_TRANSLATE),
                scale=AFFINE_SCALE,
                shear=AFFINE_SHEAR,
            ),
            transforms.ToTensor(),
            transforms.Normalize((MNIST_MEAN,), (MNIST_STD,)),
        ]
    )
    eval_transform = transforms.Compose(
        [transforms.ToTensor(), transforms.Normalize((MNIST_MEAN,), (MNIST_STD,))]
    )
    train_set = datasets.MNIST(str(data_dir), train=True, download=True, transform=train_transform)
    test_set = datasets.MNIST(str(data_dir), train=False, download=True, transform=eval_transform)
    return train_set, test_set


def _evaluate(model: nn.Module, loader: DataLoader) -> float:
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for images, labels in loader:
            predictions = model(images).argmax(dim=1)
            correct += int((predictions == labels).sum().item())
            total += int(labels.numel())
    return correct / max(total, 1)


def _train(
    model: nn.Module, train_set: datasets.MNIST, epochs: int, batch_size: int, lr: float
) -> None:
    loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=0)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss()
    model.train()
    for epoch in range(epochs):
        running_loss = 0.0
        for images, labels in loader:
            optimizer.zero_grad()
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer.step()
            running_loss += float(loss.item())
        print(f"epoch {epoch + 1}/{epochs} — loss {running_loss / max(len(loader), 1):.4f}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="models/scan_digit.onnx")
    parser.add_argument("--data-dir", default=".ml-data")
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS)
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--learning-rate", type=float, default=DEFAULT_LEARNING_RATE)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    train_set, test_set = _build_datasets(Path(args.data_dir))
    model = DigitCNN()
    _train(model, train_set, args.epochs, args.batch_size, args.learning_rate)
    accuracy = _evaluate(model, DataLoader(test_set, batch_size=512, num_workers=0))
    print(f"test accuracy: {accuracy * 100:.2f}%")

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    dummy = torch.zeros(1, 1, DIGIT_INPUT_SIZE, DIGIT_INPUT_SIZE)
    torch.onnx.export(
        model,
        dummy,
        str(output_path),
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=ONNX_OPSET,
    )
    digest = hashlib.sha256(output_path.read_bytes()).hexdigest()
    print(f"wrote {output_path}")
    print(f"sha256: {digest}")


if __name__ == "__main__":
    main()
