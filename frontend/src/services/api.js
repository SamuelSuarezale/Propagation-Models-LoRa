import axios from 'axios'

const API_URL = 'http://localhost:8000'

export const getSensorsLatest = async (escenario) => {
    const response = await axios.get(`${API_URL}/measurements/${escenario}`)
    return response.data
}

export const postMeasurement = async (escenario, data) => {
    const response = await axios.post(`${API_URL}/measurements/${escenario}`, data)
    return response.data
}

// ── SERIAL PORT CONTROL ─────────────────────────────────────

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
        escenario: escenario.toUpperCase(), // Ensure LOS/NLOS in uppercase
        distancia: parseInt(distancia),
        target_samples: parseInt(targetSamples)
    })
    return response.data
}

export const stopSerial = async () => {
    const response = await axios.post(`${API_URL}/serial/stop`)
    return response.data
}