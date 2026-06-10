import serial
import json
import time
from database import supabase

SERIAL_PORT = "COM4"
BAUD_RATE = 115200

def parse_data(line: str) -> dict | None:
    try:
        data = json.loads(line.strip())
        return data
    except json.JSONDecodeError:
        return None

def save_measurement(data: dict, escenario: str):
    table = "measurements_los" if escenario == "LOS" else "measurements_nlos"
    try:
        supabase.table(table).insert(data).execute()
        print(f"[{escenario}] Guardado: dist={data['distancia']}m RSSI={data['rssi']}dBm")
    except Exception as e:
        print(f"Error guardando en Supabase: {e}")

def start_serial(escenario: str = "LOS"):
    print(f"Iniciando lectura Serial en {SERIAL_PORT} - Escenario: {escenario}")
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    time.sleep(2)
    
    try:
        while True:
            line = ser.readline().decode("utf-8", errors="ignore")
            if line.strip():
                data = parse_data(line)
                if data:
                    save_measurement(data, escenario)
    except KeyboardInterrupt:
        print("Lectura detenida")
        ser.close()