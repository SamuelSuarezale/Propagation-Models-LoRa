import { useState, useEffect } from 'react'
import { getSensorsLatest } from '../services/api'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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

    // Agrupa y promedia el RSSI por cada distancia
    const getAveragedData = () => {
        const grouped = {}
        currentData.forEach(item => {
            if (!grouped[item.distancia]) grouped[item.distancia] = []
            grouped[item.distancia].push(item.rssi)
        })
        return Object.keys(grouped).map(dist => ({
            distancia: parseInt(dist),
            rssi: parseFloat((grouped[dist].reduce((a, b) => a + b, 0) / grouped[dist].length).toFixed(2))
        })).sort((a, b) => a.distancia - b.distancia)
    }

    const averagedData = getAveragedData()

    // Color del bar chart según calidad de señal
    const getBarColor = (rssi) => {
        if (rssi >= -80) return '#22c55e'   // Excelente (Verde)
        if (rssi >= -100) return '#f59e0b'  // Moderada (Naranja)
        return '#ef4444'                    // Deficiente (Rojo)
    }

    // Exportar datos a CSV
    const exportToCSV = () => {
        if (currentData.length === 0) return
        const headers = ['#', 'Distancia (m)', 'RSSI (dBm)', 'SNR (dB)', 'Ruido', 'RPM', 'RFID', 'Timestamp']
        const rows = currentData.map((item, index) => [
            index + 1,
            item.distancia,
            item.rssi,
            item.snr,
            item.ruido,
            item.rpm,
            item.rfid_uid || '',
            new Date(item.timestamp).toLocaleString()
        ])
        
        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.map(val => `"${val}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `mediciones_lora_${activeTab}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

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
                <>
                    {/* Barra de Acciones */}
                    <div className="measurements-actions">
                        <button className="btn-export" onClick={exportToCSV} disabled={currentData.length === 0}>
                            📥 Exportar a CSV (Excel)
                        </button>
                        <div className="actions-summary">
                            <span>Puntos medidos: <strong>{averagedData.length}</strong></span>
                            <span>Muestras totales: <strong>{currentData.length}</strong></span>
                        </div>
                    </div>

                    {/* Gráfico de Barras Promediado */}
                    {averagedData.length > 0 && (
                        <div className="measurements-chart-card">
                            <h3 className="chart-card-title">Promedio de RSSI por Distancia ({activeTab.toUpperCase()})</h3>
                            <p className="chart-card-subtitle">
                                Código de colores de señal: <span style={{color:'#22c55e'}}>Excelente (≥ -80 dBm)</span> | <span style={{color:'#f59e0b'}}>Moderada (-80 a -100 dBm)</span> | <span style={{color:'#ef4444'}}>Deficiente (&lt; -100 dBm)</span>
                            </p>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={averagedData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 95, 0.3)" />
                                        <XAxis 
                                            dataKey="distancia" 
                                            stroke="#64748b"
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            label={{ value: 'Distancia (m)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }} 
                                        />
                                        <YAxis 
                                            domain={[-120, -40]} 
                                            stroke="#64748b"
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            label={{ value: 'RSSI Promedio (dBm)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle' }, fill: '#94a3b8', fontSize: 12 }} 
                                        />
                                        <Tooltip
                                            formatter={(value) => [`${value} dBm`, 'RSSI Promedio']}
                                            labelFormatter={(label) => `Distancia: ${label} m`}
                                            contentStyle={{ backgroundColor: '#111c2e', border: '1px solid #1e3a5f', borderRadius: '8px' }}
                                            labelStyle={{ color: '#f1f5f9' }}
                                        />
                                        <Bar dataKey="rssi" radius={[4, 4, 0, 0]}>
                                            {averagedData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={getBarColor(entry.rssi)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
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
            </>
            )}
        </div>
    )
}

export default Measurements