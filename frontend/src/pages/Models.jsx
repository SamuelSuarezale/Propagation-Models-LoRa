import { useState, useEffect } from 'react'
import { getSensorsLatest } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './Models.css'

const FREQUENCY_MHZ = 915

function logDistance(d, n = 2.5, pl0 = 40) {
    if (d <= 0) return 0
    return pl0 + 10 * n * Math.log10(d)
}

function fspl(d) {
    if (d <= 0) return 0
    return 32.45 + 20 * Math.log10(FREQUENCY_MHZ) + 20 * Math.log10(d / 1000)
}

function ModelChart({ title, measuredData, theoreticalLines, color }) {
    return (
        <div className="models-chart">
            <h2 className="chart-title" style={{ color }}>{title}</h2>
            <ResponsiveContainer width="100%" height={350}>
                <LineChart data={measuredData} margin={{ top: 15, right: 15, left: 15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 95, 0.4)" />
                    <XAxis 
                        dataKey="distancia" 
                        stroke="#64748b"
                        height={45}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        label={{ value: 'Distancia (m)', position: 'insideBottom', offset: 0, fill: '#94a3b8', fontSize: 13, fontWeight: 500 }} 
                    />
                    <YAxis 
                        stroke="#64748b"
                        width={55}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        label={{ value: 'RSSI (dBm)', angle: -90, position: 'insideLeft', offset: -10, style: { textAnchor: 'middle' }, fill: '#94a3b8', fontSize: 13, fontWeight: 500 }} 
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#111c2e', border: '1px solid #1e3a5f', borderRadius: '8px' }}
                        labelStyle={{ color: '#f1f5f9' }} />
                    <Legend />
                    <Line type="monotone" dataKey="medido" stroke={color} strokeWidth={2}
                        dot={{ r: 4 }} name="Medido" />
                    {theoreticalLines.map(line => (
                        <Line key={line.key} type="monotone" dataKey={line.key}
                            stroke={line.color} strokeWidth={1} strokeDasharray="5 5"
                            dot={false} name={line.name} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

function Models() {
    const [losData, setLosData] = useState([])
    const [nlosData, setNlosData] = useState([])
    const [nLOS, setNLOS] = useState(2.5)
    const [nNLOS, setNNLOS] = useState(3.5)
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        try {
            const [los, nlos] = await Promise.all([
                getSensorsLatest('los'),
                getSensorsLatest('nlos')
            ])
            setLosData(los)
            setNlosData(nlos)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const processData = (data) => {
        const grouped = {}
        data.forEach(item => {
            if (!grouped[item.distancia]) grouped[item.distancia] = []
            grouped[item.distancia].push(item.rssi)
        })
        return Object.keys(grouped).map(dist => ({
            distancia: parseInt(dist),
            medido: parseFloat((grouped[dist].reduce((a, b) => a + b, 0) / grouped[dist].length).toFixed(2))
        })).sort((a, b) => a.distancia - b.distancia)
    }

    const addTheoretical = (processedData, n, maxDist) => {
        const teorMap = {}
        for (let d = 16; d <= maxDist; d += 16) {
            teorMap[d] = {
                log_distance: parseFloat((-logDistance(d, n)).toFixed(2)),
                fspl: parseFloat((-fspl(d)).toFixed(2))
            }
        }
        return processedData.map(p => ({
            ...p,
            log_distance: teorMap[p.distancia]?.log_distance ?? null,
            fspl: teorMap[p.distancia]?.fspl ?? null
        }))
    }

    const losProcessed  = processData(losData)
    const nlosProcessed = processData(nlosData)

    // maxDist dinámico según los datos reales capturados
    const losMaxDist  = losProcessed.length  > 0 ? losProcessed[losProcessed.length - 1].distancia  : 400
    const nlosMaxDist = nlosProcessed.length > 0 ? nlosProcessed[nlosProcessed.length - 1].distancia : 208

    const losChart  = addTheoretical(losProcessed,  nLOS,  Math.max(losMaxDist,  400))
    const nlosChart = addTheoretical(nlosProcessed, nNLOS, Math.max(nlosMaxDist, 208))

    const theoreticalLines = [
        { key: 'log_distance', color: '#a855f7', name: 'Log-Distance' },
        { key: 'fspl',         color: '#22c55e', name: 'FSPL' },
    ]

    return (
        <div className="models">
            <div className="models-header">
                <h1 className="models-title">Modelos de Propagación</h1>
            </div>

            <div className="models-controls">
                <div className="control-card">
                    <label>Exponente n — LOS: <strong>{nLOS}</strong></label>
                    <input type="range" min="1.5" max="4" step="0.1"
                        value={nLOS} onChange={e => setNLOS(parseFloat(e.target.value))} />
                    <p className="control-hint">Espacio libre = 2.0 · Urbano típico = 2.5–3.0</p>
                </div>
                <div className="control-card">
                    <label>Exponente n — NLOS: <strong>{nNLOS}</strong></label>
                    <input type="range" min="2" max="5" step="0.1"
                        value={nNLOS} onChange={e => setNNLOS(parseFloat(e.target.value))} />
                    <p className="control-hint">Urbano NLOS típico = 3.5–4.5</p>
                </div>
            </div>

            {loading ? (
                <p className="models-loading">Cargando datos...</p>
            ) : losData.length === 0 && nlosData.length === 0 ? (
                <div className="models-empty">
                    <p className="models-empty-icon">📡</p>
                    <p className="models-empty-title">Sin datos de medición aún</p>
                    <p className="models-empty-sub">Realiza las capturas en el Dashboard para que los modelos de propagación aparezcan aquí automáticamente.</p>
                </div>
            ) : (
                <div className="models-charts-grid">
                    {losData.length > 0 && (
                        <ModelChart
                            title="LOS — Línea de Visión Directa"
                            measuredData={losChart}
                            theoreticalLines={theoreticalLines}
                            color="#0ea5e9"
                        />
                    )}
                    {nlosData.length > 0 && (
                        <ModelChart
                            title="NLOS — Sin Línea de Visión"
                            measuredData={nlosChart}
                            theoreticalLines={theoreticalLines}
                            color="#f59e0b"
                        />
                    )}
                </div>
            )}
        </div>
    )
}

export default Models