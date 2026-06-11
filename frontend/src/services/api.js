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