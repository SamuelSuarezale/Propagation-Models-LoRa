from fastapi import APIRouter, HTTPException
from models import MeasurementCreate, MeasurementResponse, SessionSummaryResponse, PointSummary
from database import supabase
from typing import List
import statistics

router = APIRouter()

# ── LOS ──────────────────────────────────────────
@router.post("/measurements/los", response_model=MeasurementResponse)
def create_measurement_los(measurement: MeasurementCreate):
    data = measurement.model_dump()
    result = supabase.table("measurements_los").insert(data).execute()
    return result.data[0]

@router.get("/measurements/los", response_model=List[MeasurementResponse])
def get_measurements_los():
    result = supabase.table("measurements_los").select("*").order("distancia").execute()
    return result.data

# ── NLOS ─────────────────────────────────────────
@router.post("/measurements/nlos", response_model=MeasurementResponse)
def create_measurement_nlos(measurement: MeasurementCreate):
    data = measurement.model_dump()
    result = supabase.table("measurements_nlos").insert(data).execute()
    return result.data[0]

@router.get("/measurements/nlos", response_model=List[MeasurementResponse])
def get_measurements_nlos():
    result = supabase.table("measurements_nlos").select("*").order("distancia").execute()
    return result.data

# ── SUMMARY (para el ProgressMap) ────────────────
@router.get("/measurements/{escenario}/summary", response_model=SessionSummaryResponse)
def get_measurement_summary(escenario: str):
    escenario_lower = escenario.lower()
    if escenario_lower not in ["los", "nlos"]:
        raise HTTPException(status_code=400, detail="Escenario debe ser 'los' o 'nlos'")

    table = f"measurements_{escenario_lower}"
    result = supabase.table(table).select("distancia,rssi,snr").execute()

    # Agrupar mediciones por distancia
    grouped: dict[int, dict] = {}
    for item in result.data:
        d = item["distancia"]
        if d not in grouped:
            grouped[d] = {"rssi": [], "snr": []}
        grouped[d]["rssi"].append(item["rssi"])
        grouped[d]["snr"].append(item["snr"])

    # Calcular estadísticas por punto
    summary_list: list[PointSummary] = []
    for dist in sorted(grouped.keys()):
        rssi_vals = grouped[dist]["rssi"]
        snr_vals  = grouped[dist]["snr"]
        std_rssi  = round(statistics.stdev(rssi_vals), 2) if len(rssi_vals) > 1 else 0.0

        summary_list.append(PointSummary(
            distancia  = dist,
            count      = len(rssi_vals),
            rssi_avg   = round(sum(rssi_vals) / len(rssi_vals), 2),
            snr_avg    = round(sum(snr_vals)  / len(snr_vals),  2),
            rssi_std   = std_rssi,
        ))

    # Puntos esperados según escenario
    total_points = 25 if escenario_lower == "los" else 13

    return SessionSummaryResponse(
        escenario        = escenario_lower.upper(),
        total_points     = total_points,
        completed_points = len(summary_list),
        summary          = summary_list,
    )