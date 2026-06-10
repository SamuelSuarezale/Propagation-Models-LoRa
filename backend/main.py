from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router
import threading
from serial_reader import start_serial

app = FastAPI(title="LoRa Propagation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

serial_thread = None

@app.get("/")
def root():
    return {"message": "LoRa Propagation API funcionando"}

@app.post("/serial/start/{escenario}")
def start_serial_reading(escenario: str):
    global serial_thread
    if escenario not in ["LOS", "NLOS"]:
        return {"error": "escenario debe ser LOS o NLOS"}
    serial_thread = threading.Thread(target=start_serial, args=(escenario,), daemon=True)
    serial_thread.start()
    return {"message": f"Lectura Serial iniciada - Escenario: {escenario}"}

@app.post("/serial/stop")
def stop_serial_reading():
    return {"message": "Detenga el servidor para parar la lectura"}