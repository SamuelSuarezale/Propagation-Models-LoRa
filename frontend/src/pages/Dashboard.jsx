import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getMeasurementSummary,
    getSerialPorts,
    getSerialStatus,
    startSerial,
    stopSerial
} from '../services/api'
import SensorPanel from '../components/SensorPanel'
import PropagationChart from '../components/PropagationChart'
import ProgressMap from '../components/ProgressMap'
import './Dashboard.css'

// ── Constantes de sesión ─────────────────────────────────────
const SCENARIO_CONFIG = {
    los:  { label: 'LOS — Línea de Vista',     totalPoints: 25, maxDist: 400, color: '#0ea5e9' },
    nlos: { label: 'NLOS — Sin Línea de Vista', totalPoints: 13, maxDist: 208, color: '#f59e0b' },
}

// Estados del wizard
const WS = { SETUP: 'SETUP', CAPTURING: 'CAPTURING', POINT_DONE: 'POINT_DONE', SESSION_COMPLETE: 'SESSION_COMPLETE' }

function Dashboard() {
    const navigate = useNavigate()

    // ── Configuración de sesión ──────────────────────────────
    const [scenario,      setScenario]      = useState('los')
    const [samplesPerPt,  setSamplesPerPt]  = useState(30)
    const [selectedPort,  setSelectedPort]  = useState('')
    const [ports,         setPorts]         = useState([])

    // ── Estado del wizard ────────────────────────────────────
    const [wizardState,   setWizardState]   = useState(WS.SETUP)
    const [currentIndex,  setCurrentIndex]  = useState(0)   // 0-based índice del punto actual
    const [pointSummaries, setPointSummaries] = useState([]) // puntos ya completados en esta sesión

    // ── Datos en tiempo real ─────────────────────────────────
    const [serialStatus, setSerialStatus] = useState({
        is_active: false, port: '', escenario: '', distancia: 16,
        samples_captured: 0, target_samples: 30, last_error: null
    })
    const [latestMeasurement, setLatestMeasurement] = useState(null)
    const [losData,  setLosData]  = useState([])
    const [nlosData, setNlosData] = useState([])

    // ── Mensajes de UI ───────────────────────────────────────
    const [errorMsg,   setErrorMsg]   = useState('')
    const [pointStats, setPointStats] = useState(null)  // Stats del punto recién completado

    const serialStatusRef = useRef(serialStatus)
    serialStatusRef.current = serialStatus

    const scenarioCfg = SCENARIO_CONFIG[scenario]

    // ── Distancia del punto actual ───────────────────────────
    const currentDistance = (currentIndex + 1) * 16

    // ── Fetch de datos ───────────────────────────────────────
    const fetchAllData = useCallback(async () => {
        try {
            const [losSummary, nlosSummary] = await Promise.all([
                getMeasurementSummary('los'),
                getMeasurementSummary('nlos'),
            ])
            // Reconstruir losData / nlosData para los gráficos
            const buildChartData = (summary) =>
                summary.summary.map(p => ({
                    distancia: p.distancia,
                    rssi: p.rssi_avg,
                    snr: p.snr_avg,
                    rssi_std: p.rssi_std,
                }))
            setLosData(buildChartData(losSummary))
            setNlosData(buildChartData(nlosSummary))
            return { losSummary, nlosSummary }
        } catch (err) {
            console.error('Error cargando datos:', err)
            return null
        }
    }, [])

    const fetchPorts = async () => {
        try {
            const list = await getSerialPorts()
            setPorts(list)
            if (list.length > 0 && !selectedPort) setSelectedPort(list[0])
        } catch { /* silencioso */ }
    }

    const fetchStatus = async () => {
        try {
            const st = await getSerialStatus()
            setSerialStatus(st)
            if (st && st.latest_measurement) {
                setLatestMeasurement(st.latest_measurement)
            }
            return st
        } catch { return null }
    }

    // ── Inicialización ───────────────────────────────────────
    useEffect(() => {
        fetchAllData()
        fetchPorts()
        fetchStatus()

        // Datos: cada 5s
        const dataInterval = setInterval(fetchAllData, 5000)

        // Status serial: cada 1s — detecta cuando termina un punto
        const statusInterval = setInterval(async () => {
            const wasActive = serialStatusRef.current.is_active
            const st = await fetchStatus()

            if (wasActive && st && !st.is_active) {
                // El punto acaba de terminar → calcular stats y pasar a POINT_DONE
                const freshData = await fetchAllData()
                const escKey = st.escenario?.toLowerCase() || scenario
                const summary = escKey === 'los' ? freshData?.losSummary : freshData?.nlosSummary
                const pointData = summary?.summary.find(p => p.distancia === st.distancia)

                if (st.last_error) {
                    setErrorMsg(`Error en captura: ${st.last_error}`)
                    setWizardState(WS.SETUP)
                } else if (st.samples_captured >= st.target_samples) {
                    setPointStats(pointData || null)
                    // Actualizar la lista de puntos completados
                    if (pointData) {
                        setPointSummaries(prev => {
                            const exists = prev.find(p => p.distancia === pointData.distancia)
                            return exists ? prev : [...prev, pointData]
                        })
                    }
                    setWizardState(WS.POINT_DONE)
                }
            }
        }, 1000)

        return () => {
            clearInterval(dataInterval)
            clearInterval(statusInterval)
        }
    }, []) // eslint-disable-line

    // ── Acciones del wizard ──────────────────────────────────
    const handleStartCapture = async () => {
        setErrorMsg('')
        setLatestMeasurement(null)
        if (!selectedPort) {
            setErrorMsg('Seleccione un puerto COM para conectar el módulo LoRa.')
            return
        }
        try {
            await startSerial(selectedPort, scenario, currentDistance, samplesPerPt)
            await fetchStatus()
            setWizardState(WS.CAPTURING)
        } catch (err) {
            const msg = err.response?.data?.detail || err.uiMessage || 'No se pudo iniciar la captura.'
            setErrorMsg(msg)
        }
    }

    const handleCancelCapture = async () => {
        try {
            await stopSerial()
            await fetchStatus()
        } catch {}
        setLatestMeasurement(null)
        setWizardState(WS.SETUP)
        setErrorMsg('Captura cancelada.')
    }

    const handleNextPoint = () => {
        const nextIndex = currentIndex + 1
        setLatestMeasurement(null)
        if (nextIndex >= scenarioCfg.totalPoints) {
            setWizardState(WS.SESSION_COMPLETE)
        } else {
            setCurrentIndex(nextIndex)
            setWizardState(WS.SETUP)
            setPointStats(null)
            setErrorMsg('')
        }
    }

    const handleResetSession = () => {
        setWizardState(WS.SETUP)
        setCurrentIndex(0)
        setPointSummaries([])
        setPointStats(null)
        setLatestMeasurement(null)
        setErrorMsg('')
    }

    // ── Progreso de barra de captura ─────────────────────────
    const captureProgress = serialStatus.is_active
        ? Math.min(100, Math.round((serialStatus.samples_captured / serialStatus.target_samples) * 100))
        : 0

    return (
        <div className="dashboard-container">

            {/* ── ENCABEZADO ─────────────────────────────── */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Centro de Control de Propagación LoRa</h1>
                    <p className="dashboard-subtitle">
                        {wizardState === WS.CAPTURING
                            ? `Capturando punto ${currentIndex + 1} de ${scenarioCfg.totalPoints} — ${currentDistance} m`
                            : 'Recolección controlada de mediciones para análisis de pérdidas'}
                    </p>
                </div>
                <span className={`dashboard-status ${wizardState === WS.CAPTURING ? 'connected' : 'disconnected'}`}>
                    {wizardState === WS.CAPTURING ? '● Capturando datos' : '○ En espera'}
                </span>
            </div>

            {/* ── MAPA DE PROGRESO (siempre visible) ────── */}
            <div className="dashboard-map-row">
                <ProgressMap
                    totalPoints={scenarioCfg.totalPoints}
                    completedPoints={currentIndex}
                    currentIndex={wizardState === WS.SESSION_COMPLETE ? scenarioCfg.totalPoints : currentIndex}
                    scenario={scenario}
                    pointSummaries={pointSummaries}
                />
            </div>

            {/* ── FILA PRINCIPAL: Wizard + Sensor Panel ─── */}
            <div className="dashboard-top-row">

                {/* ── COLUMNA IZQUIERDA: Wizard ────────── */}
                <div className="control-column">

                    {/* ESTADO: SETUP */}
                    {wizardState === WS.SETUP && (
                        <div className="control-card wizard-card">
                            <div className="card-header">
                                <h2 className="card-title">Asistente de Medición</h2>
                                <div className="point-badge">
                                    Punto {currentIndex + 1} / {scenarioCfg.totalPoints}
                                </div>
                            </div>

                            <div className="wizard-setup">
                                {/* Escenario */}
                                <div className="setup-group">
                                    <label>Escenario de Medición</label>
                                    <div className="scenario-toggle-buttons">
                                        <button
                                            className={`toggle-btn ${scenario === 'los'  ? 'active los'  : ''}`}
                                            onClick={() => { setScenario('los');  setCurrentIndex(0); setPointSummaries([]); }}
                                            disabled={currentIndex > 0}
                                        >
                                            LOS (Línea de Vista)
                                        </button>
                                        <button
                                            className={`toggle-btn ${scenario === 'nlos' ? 'active nlos' : ''}`}
                                            onClick={() => { setScenario('nlos'); setCurrentIndex(0); setPointSummaries([]); }}
                                            disabled={currentIndex > 0}
                                        >
                                            NLOS (Sin Vista)
                                        </button>
                                    </div>
                                    {currentIndex > 0 && (
                                        <p className="hint-text">⚠️ El escenario está bloqueado porque la sesión ya comenzó.</p>
                                    )}
                                </div>

                                {/* Puerto COM + Muestras */}
                                <div className="setup-row">
                                    <div className="setup-group flex-1">
                                        <label>Puerto COM (LoRa Rx)</label>
                                        <div className="port-select-wrapper">
                                            <select
                                                value={selectedPort}
                                                onChange={e => setSelectedPort(e.target.value)}
                                                disabled={ports.length === 0}
                                            >
                                                {ports.length > 0
                                                    ? ports.map(p => <option key={p} value={p}>{p}</option>)
                                                    : <option value="">Sin puertos</option>}
                                            </select>
                                            <button className="btn-refresh" onClick={fetchPorts} title="Actualizar puertos">↻</button>
                                        </div>
                                    </div>
                                    <div className="setup-group flex-1">
                                        <label>Muestras por Punto</label>
                                        <input
                                            type="number"
                                            value={samplesPerPt}
                                            onChange={e => setSamplesPerPt(Math.max(1, parseInt(e.target.value) || 1))}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                {/* Distancia actual (solo informativa) */}
                                <div className="current-distance-display">
                                    <span className="cdd-label">Distancia del Punto Actual</span>
                                    <span className="cdd-value" style={{ color: scenarioCfg.color }}>
                                        {currentDistance} m
                                    </span>
                                    <span className="cdd-hint">Siguiente: {currentDistance + 16} m</span>
                                </div>

                                <button
                                    className="btn-start"
                                    onClick={handleStartCapture}
                                    style={{ background: scenarioCfg.color, boxShadow: `0 4px 12px ${scenarioCfg.color}44` }}
                                >
                                    Iniciar Captura — {currentDistance} m ({samplesPerPt} muestras)
                                </button>

                                {errorMsg && <div className="alert-message error">{errorMsg}</div>}
                            </div>
                        </div>
                    )}

                    {/* ESTADO: CAPTURING */}
                    {wizardState === WS.CAPTURING && (
                        <div className="control-card wizard-card capturing">
                            <div className="card-header">
                                <h2 className="card-title">Capturando Datos…</h2>
                                <div className="pulse-indicator" />
                            </div>

                            <div className="wizard-active">
                                <div className="active-details">
                                    <p className="active-scenario">
                                        Escenario: <strong>{serialStatus.escenario}</strong> — Distancia: <strong style={{ color: scenarioCfg.color }}>{serialStatus.distancia} m</strong>
                                    </p>
                                    <p className="active-port">Puerto: <span>{serialStatus.port}</span></p>
                                </div>

                                <div className="progress-section">
                                    <div className="progress-text">
                                        <span>Muestras capturadas</span>
                                        <span>{serialStatus.samples_captured} / {serialStatus.target_samples}</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${captureProgress}%`,
                                                background: `linear-gradient(90deg, ${scenarioCfg.color} 0%, ${scenarioCfg.color}cc 100%)`
                                            }}
                                        />
                                    </div>
                                    <div className="progress-text" style={{ justifyContent: 'center' }}>
                                        <span style={{ fontSize: 20, fontWeight: 700, color: scenarioCfg.color }}>{captureProgress}%</span>
                                    </div>
                                </div>

                                <p className="capture-instruction">
                                    🔒 Mantén el módulo en posición. La captura se detendrá automáticamente.
                                </p>

                                <button className="btn-stop" onClick={handleCancelCapture}>
                                    Cancelar Captura
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ESTADO: POINT_DONE */}
                    {wizardState === WS.POINT_DONE && (
                        <div className="control-card point-done-card">
                            <div className="card-header">
                                <h2 className="card-title">✅ Punto {currentIndex + 1} Completado</h2>
                                <span className="done-distance" style={{ color: scenarioCfg.color }}>{currentDistance} m</span>
                            </div>

                            {pointStats ? (
                                <div className="summary-grid">
                                    <div className="summary-stat">
                                        <span className="stat-label">Muestras</span>
                                        <span className="stat-val">{pointStats.count}</span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="stat-label">Distancia</span>
                                        <span className="stat-val">{pointStats.distancia} m</span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="stat-label">RSSI Promedio</span>
                                        <span className="stat-val highlighted">{pointStats.rssi_avg} dBm</span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="stat-label">SNR Promedio</span>
                                        <span className="stat-val highlighted">{pointStats.snr_avg} dB</span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="stat-label">σ RSSI (Shadowing)</span>
                                        <span className="stat-val" style={{ color: '#a855f7' }}>{pointStats.rssi_std} dB</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="hint-text">Datos guardados correctamente en la base de datos.</p>
                            )}

                            {currentIndex + 1 < scenarioCfg.totalPoints ? (
                                <div className="next-point-section">
                                    <p className="next-point-instruction">
                                        📍 Avanza <strong>16 metros</strong> hasta el siguiente punto ({currentDistance + 16} m)
                                        y presiona el botón cuando estés listo.
                                    </p>
                                    <button
                                        className="btn-advance-big"
                                        style={{ background: scenarioCfg.color, boxShadow: `0 6px 20px ${scenarioCfg.color}55` }}
                                        onClick={handleNextPoint}
                                    >
                                        ▶ Listo — Siguiente Punto ({currentDistance + 16} m)
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="btn-advance-big"
                                    style={{ background: '#22c55e', boxShadow: '0 6px 20px rgba(34,197,94,0.4)' }}
                                    onClick={handleNextPoint}
                                >
                                    🎉 Finalizar Sesión {scenario.toUpperCase()}
                                </button>
                            )}
                        </div>
                    )}

                    {/* ESTADO: SESSION_COMPLETE */}
                    {wizardState === WS.SESSION_COMPLETE && (
                        <div className="control-card session-complete-card">
                            <div className="card-header">
                                <h2 className="card-title">🎉 Sesión {scenario.toUpperCase()} Completada</h2>
                            </div>

                            <div className="complete-stats">
                                <div className="complete-stat-row">
                                    <span className="stat-label">Puntos medidos</span>
                                    <span className="stat-val" style={{ color: scenarioCfg.color }}>
                                        {scenarioCfg.totalPoints} / {scenarioCfg.totalPoints}
                                    </span>
                                </div>
                                <div className="complete-stat-row">
                                    <span className="stat-label">Distancia total</span>
                                    <span className="stat-val">{scenarioCfg.maxDist} m</span>
                                </div>
                                <div className="complete-stat-row">
                                    <span className="stat-label">Total de muestras</span>
                                    <span className="stat-val">{scenarioCfg.totalPoints * samplesPerPt}</span>
                                </div>
                            </div>

                            {pointSummaries.length > 0 && (
                                <div className="session-table-wrapper">
                                    <table className="session-table">
                                        <thead>
                                            <tr>
                                                <th>Dist. (m)</th>
                                                <th>RSSI avg</th>
                                                <th>SNR avg</th>
                                                <th>σ (dB)</th>
                                                <th>N</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...pointSummaries].sort((a,b) => a.distancia - b.distancia).map(p => (
                                                <tr key={p.distancia}>
                                                    <td>{p.distancia}</td>
                                                    <td style={{ color: scenarioCfg.color }}>{p.rssi_avg}</td>
                                                    <td>{p.snr_avg}</td>
                                                    <td style={{ color: '#a855f7' }}>{p.rssi_std}</td>
                                                    <td>{p.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="complete-actions">
                                <button className="btn-models" onClick={() => navigate('/models')}>
                                    Ver Modelos de Propagación →
                                </button>
                                <button className="btn-new-session" onClick={handleResetSession}>
                                    Nueva Sesión {scenario === 'los' ? 'NLOS' : 'LOS'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── COLUMNA DERECHA: Sensor Panel ────── */}
                <div className="display-column">
                    <SensorPanel
                        latestMeasurement={latestMeasurement}
                        scenario={scenario}
                    />
                </div>
            </div>

            {/* ── GRÁFICOS (siempre visibles si hay datos) ── */}
            {(losData.length > 0 || nlosData.length > 0) && (
                <div className="dashboard-bottom-row">
                    <PropagationChart losData={losData} nlosData={nlosData} />
                </div>
            )}
        </div>
    )
}

export default Dashboard