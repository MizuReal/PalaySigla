from pydantic import BaseModel, Field


class ScanDigit(BaseModel):
    index: int = Field(description="Digit position within its field, left to right.")
    digit: int | None = Field(description="Recognized digit, or null when the cell is blank.")
    confidence: float
    is_blank: bool
    rect: list[float] = Field(
        description="Cell bounds in the original photo, normalized [x, y, w, h]."
    )


class ScanFieldResult(BaseModel):
    key: str
    label: str
    unit: str
    value: float | None = Field(description="Assembled value, or null when a digit is unreadable.")
    needs_review: bool
    confidence: float
    digits: list[ScanDigit]


class ScanData(BaseModel):
    computed_ratio: float | None = Field(
        description="Grain length divided by grain width when both were read."
    )
    overall_needs_review: bool
    fields: list[ScanFieldResult]


class ScanOcrResponse(BaseModel):
    data: ScanData
    error: None = None
