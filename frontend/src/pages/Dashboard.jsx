import { useState, useEffect, useRef } from 'react'
import { 
    getSensorsLatest, 
    getSerialPorts, 
    getSerialStatus, 
    startSerial, 
    stopSerial 
} from '../services/api'
import SensorPanel from '../components/SensorPanel'
import PropagationChart from '../components/PropagationChart'
import './Dashboard.css'

function Dashboard() {
    const [losData, setLosData] = useState([])
    const [nlosData, setNlosData] = useState([])
    const [loading, setLoading] = useState(true)
    const [connected, setConnected] = useState(false)
    
    // Serial Port Control States
    const [ports, setPorts] = useState([])
    const [selectedPort, setSelectedPort] = useState('')
    const [targetDistance, setTargetDistance] = useState(16)
    const [targetSamples, setTargetSamples] = useState(30)
    const [selectedScenario, setSelectedScenario] = useState('los')
    
    const [serialStatus, setSerialStatus] = useState({
        is_active: false,
        port: '',
        escenario: '',
        distancia: 16,
        samples_captured: 0,
        target_samples: 30,
        last_error: null
    })
    
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [lastCompletedStats, setLastCompletedStats] = useState(null)
    
    const serialStatusRef = useRef(serialStatus)
    serialStatusRef.current = serialStatus

    useEffect(() => {
        // Initial fetches
        fetchData()
        fetchPorts()
        fetchStatus()
        
        // Interval for general data refresh (every 5 seconds)
        const dataInterval = setInterval(fetchData, 5000)
        
        // Interval for serial status monitoring (every 1 second)
        const statusInterval = setInterval(async () => {
            const wasActive = serialStatusRef.current.is_active
            const status = await fetchStatus()
            
            // If the serial reading just stopped/finished, reload data and calculate run statistics
            if (wasActive && status && !status.is_active) {
                await fetchData()
                
                // If it finished without error and gathered the target samples, show summary
                if (!status.last_error && status.samples_captured >= status.target_samples) {
                    setSuccessMsg(`¡Medición completada! Se guardaron ${status.samples_captured} muestras a ${status.distancia} metros.`)
                    calculateStats(status.escenario.toLowerCase(), status.distancia)
                } else if (status.last_error) {
                    setErrorMsg(`Lectura interrumpida: ${status.last_error}`)
                }
            }
        }, 1000)
        
        return () => {
            clearInterval(dataInterval)
            clearInterval(statusInterval)
        }
    }, [])

    const fetchData = async () => {
        try {
            const [los, nlos] = await Promise.all([
                getSensorsLatest('los'),
                getSensorsLatest('nlos')
            ])
            setLosData(los)
            setNlosData(nlos)

            // Resolve connected status: check if we got any measurement in the last 15s
            const allData = [...los, ...nlos]
            if (allData.length > 0) {
                const latestSample = allData.reduce((prev, current) => 
                    new Date(current.timestamp) > new Date(prev.timestamp) ? current : prev
                )
                const lastTime = new Date(latestSample.timestamp)
                const now = new Date()
                const diffSeconds = (now - lastTime) / 1000
                setConnected(diffSeconds < 15)
            } else {
                setConnected(false)
            }
        } catch (error) {
            console.error('Error fetching measurements data:', error)
            setConnected(false)
        } finally {
            setLoading(false)
        }
    }

    const fetchPorts = async () => {
        try {
            const portsList = await getSerialPorts()
            setPorts(portsList)
            if (portsList.length > 0 && !selectedPort) {
                setSelectedPort(portsList[0])
            }
        } catch (error) {
            console.error('Error fetching available serial ports:', error)
        }
    }

    const fetchStatus = async () => {
        try {
            const status = await getSerialStatus()
            setSerialStatus(status)
            
            // Sync current active scenario to the view if active
            if (status.is_active) {
                setSelectedScenario(status.escenario.toLowerCase())
            }
            return status
        } catch (error) {
            console.error('Error fetching serial status:', error)
            return null
        }
    }

    const handleStartCapture = async () => {
        setErrorMsg('')
        setSuccessMsg('')
        setLastCompletedStats(null)

        if (!selectedPort) {
            setErrorMsg('Seleccione un puerto COM para conectar el módulo LoRa.')
            return
        }

        try {
            await startSerial(selectedPort, selectedScenario, targetDistance, targetSamples)
            // Immediately update UI state
            await fetchStatus()
        } catch (err) {
            const errMsg = err.response?.data?.detail || 'No se pudo iniciar la captura serial.'
            setErrorMsg(errMsg)
        }
    }

    const handleStopCapture = async () => {
        try {
            await stopSerial()
            await fetchStatus()
            setErrorMsg('Captura detenida por el usuario.')
        } catch (err) {
            setErrorMsg('Error al detener la captura serial.')
        }
    }

    const calculateStats = (escenario, distancia) => {
        const sourceData = escenario === 'los' ? losData : nlosData
        // Filter elements matching this distance
        const matching = sourceData.filter(item => item.distancia === distancia)
        if (matching.length > 0) {
            const avgRssi = matching.reduce((sum, item) => sum + item.rssi, 0) / matching.length
            const avgSnr = matching.reduce((sum, item) => sum + item.snr, 0) / matching.length
            setLastCompletedStats({
                distancia,
                muestras: matching.length,
                rssiPromedio: avgRssi.toFixed(2),
                snrPromedio: avgSnr.toFixed(2)
            })
        }
    }

    const handleNextDistance = () => {
        setTargetDistance(prev => prev + 16)
        setSuccessMsg('')
        setLastCompletedStats(null)
    }

    const handlePrevDistance = () => {
        setTargetDistance(prev => Math.max(16, prev - 16))
        setSuccessMsg('')
        setLastCompletedStats(null)
    }

    // Solve "latest measurement" sorting bug:
    // Filter selected scenario data and find the one with the maximum timestamp (true latest)
    const activeDataList = selectedScenario === 'los' ? losData : nlosData
    const latestMeasurement = activeDataList.length > 0 
        ? activeDataList.reduce((prev, curr) => new Date(curr.timestamp) > new Date(prev.timestamp) ? curr : prev)
        : null

    const progressPercentage = serialStatus.is_active 
        ? Math.min(100, Math.round((serialStatus.samples_captured / serialStatus.target_samples) * 100))
        : 0

    return (
        <div className="dashboard-container">
            {/* Header section with connection status */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Centro de Control de Propagación LoRa</h1>
                    <p className="dashboard-subtitle">Recolección controlada de mediciones para análisis de pérdidas</p>
                </div>
                <div className="status-badge-container">
                    <span className={`dashboard-status ${connected ? 'connected' : 'disconnected'}`}>
                        {connected ? '● Datos Recibiéndose' : '○ Esperando Datos'}
                    </span>
                </div>
            </div>

            {/* Top Row: Assistant and Sensor Cards side-by-side */}
            <div className="dashboard-top-row">
                
                {/* Left side: Guided Assistant Control Center */}
                <div className="control-column">
                    
                    {/* Guided Wizard Card */}
                    <div className="control-card wizard-card">
                        <div className="card-header">
                            <h2 className="card-title">Asistente de Medición en Campo</h2>
                            {serialStatus.is_active && <div className="pulse-indicator"></div>}
                        </div>
                        
                        {!serialStatus.is_active ? (
                            <div className="wizard-setup">
                                <div className="setup-group">
                                    <label>Escenario de Medición</label>
                                    <div className="scenario-toggle-buttons">
                                        <button 
                                            className={`toggle-btn ${selectedScenario === 'los' ? 'active los' : ''}`}
                                            onClick={() => setSelectedScenario('los')}
                                        >
                                            LOS (Línea de Vista)
                                        </button>
                                        <button 
                                            className={`toggle-btn ${selectedScenario === 'nlos' ? 'active nlos' : ''}`}
                                            onClick={() => setSelectedScenario('nlos')}
                                        >
                                            NLOS (Sin Vista)
                                        </button>
                                    </div>
                                </div>

                                <div className="setup-row">
                                    <div className="setup-group flex-1">
                                        <label>Puerto COM (LoRa Rx)</label>
                                        <div className="port-select-wrapper">
                                            <select 
                                                value={selectedPort} 
                                                onChange={e => setSelectedPort(e.target.value)}
                                                disabled={ports.length === 0}
                                            >
                                                {ports.length > 0 ? (
                                                    ports.map(p => <option key={p} value={p}>{p}</option>)
                                                ) : (
                                                    <option value="">No hay puertos</option>
                                                )}
                                            </select>
                                            <button className="btn-refresh" onClick={fetchPorts} title="Refrescar Puertos">
                                                ↻
                                            </button>
                                        </div>
                                    </div>

                                    <div className="setup-group flex-1">
                                        <label>Cantidad de Muestras</label>
                                        <input 
                                            type="number" 
                                            value={targetSamples} 
                                            onChange={e => setTargetSamples(Math.max(1, parseInt(e.target.value) || 0))}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div className="setup-group">
                                    <label>Distancia del Punto Actual</label>
                                    <div className="distance-control">
                                        <button className="dist-btn" onClick={handlePrevDistance}>-16m</button>
                                        <input 
                                            type="number" 
                                            value={targetDistance} 
                                            onChange={e => setTargetDistance(Math.max(1, parseInt(e.target.value) || 0))}
                                            className="distance-input"
                                        />
                                        <span className="unit-label">metros</span>
                                        <button className="dist-btn" onClick={handleNextDistance}>+16m</button>
                                    </div>
                                </div>

                                <button className="btn-start" onClick={handleStartCapture}>
                                    Iniciar Medición ({targetSamples} muestras)
                                </button>
                            </div>
                        ) : (
                            <div className="wizard-active">
                                <div className="active-details">
                                    <p className="active-scenario">Midiendo: <strong>{serialStatus.escenario}</strong> a <strong>{serialStatus.distancia} metros</strong></p>
                                    <p className="active-port">Puerto: <span>{serialStatus.port}</span></p>
                                </div>

                                <div className="progress-section">
                                    <div className="progress-text">
                                        <span>Capturando datos...</span>
                                        <span>{serialStatus.samples_captured} / {serialStatus.target_samples} muestras</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
                                    </div>
                                </div>

                                <button className="btn-stop" onClick={handleStopCapture}>
                                    Cancelar Captura
                                </button>
                            </div>
                        )}

                        {errorMsg && <div className="alert-message error">{errorMsg}</div>}
                        {successMsg && <div className="alert-message success">{successMsg}</div>}
                    </div>

                    {/* Stats summary of last completed run */}
                    {lastCompletedStats && (
                        <div className="control-card stats-summary-card">
                            <h3 className="summary-title">Resumen del Punto Completado</h3>
                            <div className="summary-grid">
                                <div className="summary-stat">
                                    <span className="stat-label">Distancia</span>
                                    <span className="stat-val">{lastCompletedStats.distancia} m</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-label">Muestras</span>
                                    <span className="stat-val">{lastCompletedStats.muestras} / 30</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-label">Promedio RSSI</span>
                                    <span className="stat-val highlighted">{lastCompletedStats.rssiPromedio} dBm</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-label">Promedio SNR</span>
                                    <span className="stat-val highlighted">{lastCompletedStats.snrPromedio} dB</span>
                                </div>
                            </div>
                            <button className="btn-advance" onClick={handleNextDistance}>
                                Preparar Siguiente Punto (+16 metros)
                            </button>
                        </div>
                    )}
                </div>

                {/* Right side: SensorPanel */}
                <div className="display-column">
                    {loading ? (
                        <p className="dashboard-loading">Cargando datos del servidor...</p>
                    ) : (
                        <SensorPanel 
                            latestMeasurement={latestMeasurement} 
                            scenario={selectedScenario} 
                        />
                    )}
                </div>
            </div>

            {/* Bottom Row: Charts full width */}
            {!loading && (
                <div className="dashboard-bottom-row">
                    <PropagationChart losData={losData} nlosData={nlosData} />
                </div>
            )}
        </div>
    )
}

export default Dashboard