from pydantic import BaseModel


class GeocodeResult(BaseModel):
    place_id: int
    label: str
    lat: float
    lng: float
    place_type: str | None = None


class GeocodeSearchResponse(BaseModel):
    data: list[GeocodeResult]
    error: None = None


class GeocodeReverseResponse(BaseModel):
    data: GeocodeResult
    error: None = None
