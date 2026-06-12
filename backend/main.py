from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routes import router
from serial_reader import SerialReaderManager
from pydantic import BaseModel
import time

app = FastAPI(title="LoRa Propagation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# Initialize global Serial Reader Manager
reader_manager = SerialReaderManager()

class SerialStartRequest(BaseModel):
    port: str
    escenario: str
    distancia: int
    target_samples: int = 30

@app.get("/")
def root():
    return {"message": "LoRa Propagation API funcionando"}

@app.get("/serial/ports")
def get_serial_ports():
    return {"ports": reader_manager.get_available_ports()}

@app.get("/serial/status")
def get_serial_status():
    return {
        "is_active": reader_manager.is_running,
        "port": reader_manager.port,
        "escenario": reader_manager.escenario,
        "distancia": reader_manager.distancia,
        "samples_captured": reader_manager.samples_captured,
        "target_samples": reader_manager.target_samples,
        "last_error": reader_manager.last_error,
        "latest_measurement": reader_manager.latest_measurement
    }

@app.post("/serial/start")
def start_serial_reading(req: SerialStartRequest):
    if req.escenario not in ["LOS", "NLOS"]:
        raise HTTPException(status_code=400, detail="El escenario debe ser LOS o NLOS")
    if req.distancia <= 0:
        raise HTTPException(status_code=400, detail="La distancia debe ser mayor a 0")
    if req.target_samples <= 0:
        raise HTTPException(status_code=400, detail="El objetivo de muestras debe ser mayor a 0")
        
    try:
        reader_manager.start(req.port, req.escenario, req.distancia, req.target_samples)
        # Give the thread a small window to fail opening the port so we can return the error immediately
        time.sleep(0.5)
        if reader_manager.last_error:
            # If there was an error opening the port, return it
            err = reader_manager.last_error
            reader_manager.last_error = None
            raise HTTPException(status_code=400, detail=err)
            
        return {
            "message": "Lectura serial iniciada con éxito",
            "port": req.port,
            "escenario": req.escenario,
            "distancia": req.distancia
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/serial/stop")
def stop_serial_reading():
    try:
        reader_manager.stop()
        return {"message": "Lectura serial detenida con éxito"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))