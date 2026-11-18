"""Request and response models for the defect assessment and advice endpoints."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.ml.detection.constants import CLASS_NAMES, DEFAULT_MAX_DETECTIONS
from app.models.chat import MAX_HISTORY_MESSAGES, ChatTurn

Severity = Literal["none", "low", "moderate", "high"]
QualityStatus = Literal["premium", "good", "fair", "poor"]
AdviceLanguage = Literal["english", "tagalog"]


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


class AssessmentAdviceContext(BaseModel):
    """The measurements the client may send to the advice endpoint.

    Quality status, severity, and the review flag are derived server-side from
    the detector constants; the client only supplies what the model measured.
    """

    defect_rate: float = Field(ge=0.0, le=1.0)
    counts: dict[str, int] = Field(
        default_factory=dict,
        description="Flagged areas per known defect class key.",
    )
    highest_confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    lowest_confidence: float | None = Field(default=None, ge=0.0, le=1.0)

    @field_validator("counts")
    @classmethod
    def only_known_classes(cls, counts: dict[str, int]) -> dict[str, int]:
        unknown = sorted(set(counts) - set(CLASS_NAMES))
        if unknown:
            raise ValueError(f"Unknown defect classes: {', '.join(unknown)}")
        if any(count < 0 for count in counts.values()):
            raise ValueError("Defect counts cannot be negative.")
        if sum(counts.values()) > DEFAULT_MAX_DETECTIONS:
            raise ValueError(f"Total flagged areas cannot exceed {DEFAULT_MAX_DETECTIONS}.")
        return counts

    @model_validator(mode="after")
    def confidence_range(self) -> "AssessmentAdviceContext":
        has_high = self.highest_confidence is not None
        has_low = self.lowest_confidence is not None
        if has_high != has_low:
            raise ValueError("Provide both highest and lowest confidence, or neither.")
        if (
            self.highest_confidence is not None
            and self.lowest_confidence is not None
            and self.lowest_confidence > self.highest_confidence
        ):
            raise ValueError("lowest_confidence cannot exceed highest_confidence.")
        return self


class AssessmentAdviceRequest(BaseModel):
    assessment: AssessmentAdviceContext
    messages: list[ChatTurn] = Field(
        default_factory=list,
        max_length=MAX_HISTORY_MESSAGES,
        description="Conversation history. Empty asks for the opening analysis.",
    )
    language: AdviceLanguage = Field(
        default="english",
        description="Language for the opening analysis; follow-ups mirror the user.",
    )

    @field_validator("messages")
    @classmethod
    def must_end_with_user_message(cls, messages: list[ChatTurn]) -> list[ChatTurn]:
        if messages and messages[-1].role != "user":
            raise ValueError("The last message must come from the user.")
        return messages


class AssessmentAdviceReply(BaseModel):
    reply: str


class AssessmentAdviceResponse(BaseModel):
    data: AssessmentAdviceReply
    error: None = None
