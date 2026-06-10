from fastapi import APIRouter
from models import MeasurementCreate, MeasurementResponse
from database import supabase
from typing import List

router = APIRouter()

# ── LOS ──────────────────────────────────────────
@router.post("/measurements/los", response_model=MeasurementResponse)
def create_measurement_los(measurement: MeasurementCreate):
    data = measurement.dict()
    result = supabase.table("measurements_los").insert(data).execute()
    return result.data[0]

@router.get("/measurements/los", response_model=List[MeasurementResponse])
def get_measurements_los():
    result = supabase.table("measurements_los").select("*").order("distancia").execute()
    return result.data

# ── NLOS ─────────────────────────────────────────
@router.post("/measurements/nlos", response_model=MeasurementResponse)
def create_measurement_nlos(measurement: MeasurementCreate):
    data = measurement.dict()
    result = supabase.table("measurements_nlos").insert(data).execute()
    return result.data[0]

@router.get("/measurements/nlos", response_model=List[MeasurementResponse])
def get_measurements_nlos():
    result = supabase.table("measurements_nlos").select("*").order("distancia").execute()
    return result.data