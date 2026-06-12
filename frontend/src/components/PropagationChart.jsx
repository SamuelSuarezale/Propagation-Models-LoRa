import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './PropagationChart.css'

function PropagationChart({ losData, nlosData }) {
    const processData = (data) => {
        const grouped = {}
        data.forEach(item => {
            if (!grouped[item.distancia]) {
                grouped[item.distancia] = { rssi: [], snr: [] }
            }
            grouped[item.distancia].rssi.push(item.rssi)
            grouped[item.distancia].snr.push(item.snr)
        })
        return Object.keys(grouped).map(dist => ({
            distancia: parseInt(dist),
            rssi: parseFloat((grouped[dist].rssi.reduce((a, b) => a + b, 0) / grouped[dist].rssi.length).toFixed(2)),
            snr: parseFloat((grouped[dist].snr.reduce((a, b) => a + b, 0) / grouped[dist].snr.length).toFixed(2)),
        })).sort((a, b) => a.distancia - b.distancia)
    }

    const losProcessed = processData(losData)
    const nlosProcessed = processData(nlosData)

    const mergedData = {}
    losProcessed.forEach(item => {
        mergedData[item.distancia] = {
            distancia: item.distancia,
            rssi_los: item.rssi,
            snr_los: item.snr
        }
    })
    nlosProcessed.forEach(item => {
        if (!mergedData[item.distancia]) mergedData[item.distancia] = { distancia: item.distancia }
        mergedData[item.distancia].rssi_nlos = item.rssi
        mergedData[item.distancia].snr_nlos = item.snr
    })

    const chartData = Object.values(mergedData).sort((a, b) => a.distancia - b.distancia)

    return (
        <div className="charts-container">
            <div className="propagation-chart">
                <h2 className="chart-title">RSSI vs Distancia</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 15, right: 15, left: 15, bottom: 25 }}>
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
                        <Tooltip contentStyle={{ backgroundColor: '#111c2e', border: '1px solid #1e3a5f', borderRadius: '8px' }}
                            labelStyle={{ color: '#f1f5f9' }} />
                        <Legend />
                        <Line type="monotone" dataKey="rssi_los" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} name="LOS" />
                        <Line type="monotone" dataKey="rssi_nlos" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="NLOS" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="propagation-chart">
                <h2 className="chart-title">SNR vs Distancia</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 15, right: 15, left: 15, bottom: 25 }}>
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
                            label={{ value: 'SNR (dB)', angle: -90, position: 'insideLeft', offset: -10, style: { textAnchor: 'middle' }, fill: '#94a3b8', fontSize: 13, fontWeight: 500 }} 
                        />
                        <Tooltip contentStyle={{ backgroundColor: '#111c2e', border: '1px solid #1e3a5f', borderRadius: '8px' }}
                            labelStyle={{ color: '#f1f5f9' }} />
                        <Legend />
                        <Line type="monotone" dataKey="snr_los" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="LOS" />
                        <Line type="monotone" dataKey="snr_nlos" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} name="NLOS" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default PropagationChart