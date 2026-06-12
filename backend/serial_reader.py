import serial
import serial.tools.list_ports
import json
import time
import threading
from database import supabase

BAUD_RATE = 115200

class SerialReaderManager:
    def __init__(self):
        self.ser = None
        self.thread = None
        self.stop_event = threading.Event()
        self.is_running = False
        self.port = None
        self.escenario = None
        self.distancia = 16
        self.target_samples = 30
        self.samples_captured = 0
        self.last_error = None

    def get_available_ports(self):
        try:
            ports = serial.tools.list_ports.comports()
            return [port.device for port in ports]
        except Exception as e:
            print(f"Error al listar puertos: {e}")
            return []

    def _read_loop(self, port, escenario, distancia, target_samples):
        self.last_error = None
        self.samples_captured = 0
        
        try:
            print(f"Abriendo puerto Serial {port}...")
            self.ser = serial.Serial(port, BAUD_RATE, timeout=0.5)
            # Give some time for Heltec board to initialize/reset
            time.sleep(1.5)
        except Exception as e:
            self.last_error = f"No se pudo abrir el puerto {port}: {str(e)}"
            self.is_running = False
            print(self.last_error)
            return

        print(f"Lectura Serial iniciada en {port} - Escenario: {escenario} - Distancia: {distancia}m - Objetivo: {target_samples} muestras")
        
        try:
            # Clear input buffer to discard stale data
            self.ser.reset_input_buffer()
            
            while not self.stop_event.is_set() and self.samples_captured < target_samples:
                # Read a line from serial
                if self.ser.in_waiting > 0:
                    try:
                        line = self.ser.readline().decode("utf-8", errors="ignore")
                        if line.strip():
                            data = self.parse_data(line)
                            if data:
                                # Inject current distance from UI configuration
                                data["distancia"] = distancia
                                self.save_measurement(data, escenario)
                                self.samples_captured += 1
                                print(f"[{escenario}] Muestra {self.samples_captured}/{target_samples} guardada: RSSI={data['rssi']}dBm")
                    except Exception as le:
                        print(f"Error leyendo línea serial: {le}")
                else:
                    time.sleep(0.05)  # Yield CPU
                    
            if self.samples_captured >= target_samples:
                print(f"Objetivo alcanzado ({target_samples} muestras). Deteniendo lectura.")
                
        except Exception as e:
            self.last_error = f"Error en lectura serial: {str(e)}"
            print(self.last_error)
        finally:
            if self.ser and self.ser.is_open:
                try:
                    self.ser.close()
                except Exception:
                    pass
            self.is_running = False
            print("Lectura Serial finalizada y puerto cerrado.")

    def parse_data(self, line: str) -> dict | None:
        try:
            data = json.loads(line.strip())
            # Basic validation of data structure
            required_fields = ["rssi", "snr", "ruido", "rpm"]
            for field in required_fields:
                if field not in data:
                    return None
            return data
        except json.JSONDecodeError:
            return None

    def save_measurement(self, data: dict, escenario: str):
        table = "measurements_los" if escenario == "LOS" else "measurements_nlos"
        try:
            supabase.table(table).insert(data).execute()
        except Exception as e:
            self.last_error = f"Error guardando en base de datos: {str(e)}"
            print(self.last_error)

    def start(self, port: str, escenario: str, distancia: int, target_samples: int):
        if self.is_running:
            self.stop()
            
        self.stop_event.clear()
        self.port = port
        self.escenario = escenario
        self.distancia = distancia
        self.target_samples = target_samples
        self.samples_captured = 0
        self.is_running = True
        
        self.thread = threading.Thread(
            target=self._read_loop,
            args=(port, escenario, distancia, target_samples),
            daemon=True
        )
        self.thread.start()

    def stop(self):
        if not self.is_running:
            return
        self.stop_event.set()
        if self.ser and self.ser.is_open:
            try:
                self.ser.close()
            except Exception:
                pass
        if self.thread:
            self.thread.join(timeout=1.0)
        self.is_running = False