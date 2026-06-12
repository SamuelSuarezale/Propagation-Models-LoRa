from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MeasurementBase(BaseModel):
    distancia: int
    rssi: float
    snr: float
    ruido: int
    rpm: int
    rfid_uid: Optional[str] = None

class MeasurementCreate(MeasurementBase):
    pass

class MeasurementResponse(MeasurementBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class PointSummary(BaseModel):
    distancia: int
    count: int
    rssi_avg: float
    snr_avg: float
    rssi_std: float

class SessionSummaryResponse(BaseModel):
    escenario: str
    total_points: int
    completed_points: int
    summary: list[PointSummary]