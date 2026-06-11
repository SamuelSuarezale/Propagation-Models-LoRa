import { useState, useEffect } from 'react'
import { getSensorsLatest } from '../services/api'
import './Measurements.css'

function Measurements() {
    const [losData, setLosData] = useState([])
    const [nlosData, setNlosData] = useState([])
    const [activeTab, setActiveTab] = useState('los')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [los, nlos] = await Promise.all([
                getSensorsLatest('los'),
                getSensorsLatest('nlos')
            ])
            setLosData(los)
            setNlosData(nlos)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const currentData = activeTab === 'los' ? losData : nlosData

    return (
        <div className="measurements">
            <div className="measurements-header">
                <h1 className="measurements-title">Mediciones</h1>
                <div className="measurements-tabs">
                    <button
                        className={`tab ${activeTab === 'los' ? 'active-los' : ''}`}
                        onClick={() => setActiveTab('los')}
                    >
                        LOS ({losData.length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'nlos' ? 'active-nlos' : ''}`}
                        onClick={() => setActiveTab('nlos')}
                    >
                        NLOS ({nlosData.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="measurements-loading">Cargando datos...</p>
            ) : (
                <div className="table-container">
                    <table className="measurements-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Distancia (m)</th>
                                <th>RSSI (dBm)</th>
                                <th>SNR (dB)</th>
                                <th>Ruido</th>
                                <th>RPM</th>
                                <th>RFID</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{index + 1}</td>
                                    <td>{item.distancia}</td>
                                    <td className={item.rssi > -80 ? 'good' : item.rssi > -100 ? 'medium' : 'bad'}>
                                        {item.rssi}
                                    </td>
                                    <td className={item.snr > 5 ? 'good' : item.snr > 0 ? 'medium' : 'bad'}>
                                        {item.snr}
                                    </td>
                                    <td>{item.ruido}</td>
                                    <td>{item.rpm}</td>
                                    <td>{item.rfid_uid || '---'}</td>
                                    <td>{new Date(item.timestamp).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default Measurements