"""Response models for the defect and mold assessment endpoint."""

from typing import Literal

from pydantic import BaseModel, Field

Severity = Literal["none", "low", "moderate", "high"]
QualityStatus = Literal["premium", "good", "fair", "poor"]


class DefectDetection(BaseModel):
    class_key: str
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    box: list[float] = Field(
        description="Bounding box in the original photo, normalized [x, y, w, h].",
    )
    area_ratio: float = Field(
        ge=0.0,
        le=1.0,
        description="Box area as a fraction of the whole frame.",
    )


class AssessmentData(BaseModel):
    available_outputs: list[str] = Field(
        description="Outputs this model actually produces.",
    )
    unavailable_outputs: list[str] = Field(
        description="Outputs the product promises but this model cannot produce yet.",
    )
    detections: list[DefectDetection]
    counts: dict[str, int] = Field(description="Detections per class key.")
    defect_rate: float = Field(
        ge=0.0,
        le=1.0,
        description="Share of the frame covered by defect boxes.",
    )
    severity: Severity
    quality_status: QualityStatus
    needs_review: bool = Field(
        description="True when a detection sits below the review confidence threshold.",
    )
    inference_ms: int
    imgsz: int


class AssessmentResponse(BaseModel):
    data: AssessmentData
    error: None = None
