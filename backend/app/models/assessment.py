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
    needs_review: bool = Field(
        description="True when this box falls below the review confidence threshold.",
    )


class SeverityBands(BaseModel):
    """Coverage cutoffs behind ``severity``, so clients never hardcode them."""

    none_max: float = Field(ge=0.0, le=1.0, description="Coverage at or below is 'none'.")
    low_max: float = Field(ge=0.0, le=1.0, description="Coverage at or below is 'low'.")
    moderate_max: float = Field(ge=0.0, le=1.0, description="Coverage at or below is 'moderate'.")


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
    severity_bands: SeverityBands = Field(
        description="Coverage cutoffs that produced this severity.",
    )
    quality_status: QualityStatus
    needs_review: bool = Field(
        description="True when a detection sits below the review confidence threshold.",
    )
    review_confidence_threshold: float = Field(
        ge=0.0,
        le=1.0,
        description="Detections below this confidence are flagged for review.",
    )
    inference_ms: int
    imgsz: int


class AssessmentResponse(BaseModel):
    data: AssessmentData
    error: None = None
