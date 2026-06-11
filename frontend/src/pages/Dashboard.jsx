import { useState, useEffect } from 'react'
import { getSensorsLatest } from '../services/api'
import SensorPanel from '../components/SensorPanel'
import PropagationChart from '../components/PropagationChart'
import './Dashboard.css'

function Dashboard() {
    const [losData, setLosData] = useState([])
    const [nlosData, setNlosData] = useState([])
    const [loading, setLoading] = useState(true)
    const [connected, setConnected] = useState(false)

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [])

const fetchData = async () => {
    try {
        const [los, nlos] = await Promise.all([
            getSensorsLatest('los'),
            getSensorsLatest('nlos')
        ])
        setLosData(los)
        setNlosData(nlos)

        const lastLos = los[los.length - 1]
        const lastNlos = nlos[nlos.length - 1]
        const last = lastLos || lastNlos

        if (last) {
            const lastTime = new Date(last.timestamp)
            const now = new Date()
            const diffSeconds = (now - lastTime) / 1000
            setConnected(diffSeconds < 30)
        } else {
            setConnected(false)
        }
    } catch (error) {
        console.error('Error fetching data:', error)
        setConnected(false)
    } finally {
        setLoading(false)
    }
}

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Dashboard</h1>
                <span className={`dashboard-status ${connected ? 'connected' : 'disconnected'}`}>
                    {connected ? '● Conectado' : '○ Sin conexión'}
                </span>
            </div>

            {loading ? (
                <p className="dashboard-loading">Cargando datos...</p>
            ) : (
                <>
                    <SensorPanel losData={losData} nlosData={nlosData} />
                    <PropagationChart losData={losData} nlosData={nlosData} />
                </>
            )}
        </div>
    )
}

export default Dashboard