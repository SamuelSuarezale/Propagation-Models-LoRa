import './SensorPanel.css'

function SensorCard({ title, value, unit, color }) {
    return (
        <div className="sensor-card" style={{ borderTop: `3px solid ${color}` }}>
            <p className="sensor-title">{title}</p>
            <p className="sensor-value" style={{ color }}>
                {value !== null && value !== undefined ? value : '---'}
                <span className="sensor-unit"> {unit}</span>
            </p>
        </div>
    )
}

function SensorPanel({ losData, nlosData }) {
    const latest = losData.length > 0 ? losData[losData.length - 1] : null

    return (
        <div className="sensor-panel">
            <h2 className="sensor-panel-title">Última Medición — LOS</h2>
            <div className="sensor-grid">
                <SensorCard
                    title="RSSI"
                    value={latest?.rssi}
                    unit="dBm"
                    color="#0ea5e9"
                />
                <SensorCard
                    title="SNR"
                    value={latest?.snr}
                    unit="dB"
                    color="#22c55e"
                />
                <SensorCard
                    title="Distancia"
                    value={latest?.distancia}
                    unit="m"
                    color="#f59e0b"
                />
                <SensorCard
                    title="Ruido"
                    value={latest?.ruido}
                    unit=""
                    color="#a855f7"
                />
                <SensorCard
                    title="RPM"
                    value={latest?.rpm}
                    unit="rpm"
                    color="#ec4899"
                />
                <SensorCard
                    title="RFID"
                    value={latest?.rfid_uid}
                    unit=""
                    color="#14b8a6"
                />
            </div>
        </div>
    )
}

export default SensorPanel