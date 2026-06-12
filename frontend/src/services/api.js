import axios from 'axios'

const API_URL = 'http://localhost:8000'

// Interceptor global de errores
axios.interceptors.response.use(
    response => response,
    error => {
        if (!error.response) {
            error.uiMessage = 'No se puede conectar con el servidor. ¿Está corriendo el backend?'
        }
        return Promise.reject(error)
    }
)

// ── MEDICIONES ───────────────────────────────────────────────

export const getSensorsLatest = async (escenario) => {
    const response = await axios.get(`${API_URL}/measurements/${escenario}`)
    return response.data
}

export const postMeasurement = async (escenario, data) => {
    const response = await axios.post(`${API_URL}/measurements/${escenario}`, data)
    return response.data
}

/**
 * Retorna resumen estadístico por punto (distancia):
 * { escenario, total_points, completed_points, summary: [{distancia, count, rssi_avg, snr_avg, rssi_std}] }
 */
export const getMeasurementSummary = async (escenario) => {
    const response = await axios.get(`${API_URL}/measurements/${escenario}/summary`)
    return response.data
}

// ── CONTROL SERIAL ───────────────────────────────────────────

export const getSerialPorts = async () => {
    const response = await axios.get(`${API_URL}/serial/ports`)
    return response.data.ports
}

export const getSerialStatus = async () => {
    const response = await axios.get(`${API_URL}/serial/status`)
    return response.data
}

export const startSerial = async (port, escenario, distancia, targetSamples = 30) => {
    const response = await axios.post(`${API_URL}/serial/start`, {
        port,
        escenario: escenario.toUpperCase(),
        distancia: parseInt(distancia),
        target_samples: parseInt(targetSamples)
    })
    return response.data
}

export const stopSerial = async () => {
    const response = await axios.post(`${API_URL}/serial/stop`)
    return response.data
}