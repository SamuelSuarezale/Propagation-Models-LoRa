import './ProgressMap.css'

/**
 * Mapa visual de puntos de medición.
 * Cada punto es un círculo: completado (verde), actual (azul pulsando), pendiente (gris).
 */
function ProgressMap({ totalPoints, completedPoints, currentIndex, scenario, pointSummaries }) {
    const color = scenario === 'los' ? '#0ea5e9' : '#f59e0b'
    const points = Array.from({ length: totalPoints }, (_, i) => i)

    // Build a lookup from the summary array for quick access
    const summaryByIndex = {}
    if (pointSummaries) {
        pointSummaries.forEach(p => {
            // distancia = (index + 1) * 16  →  index = distancia/16 - 1
            const idx = p.distancia / 16 - 1
            summaryByIndex[idx] = p
        })
    }

    const getStatus = (i) => {
        if (i < currentIndex) return 'done'
        if (i === currentIndex) return 'active'
        return 'pending'
    }

    return (
        <div className="progress-map">
            <div className="progress-map-header">
                <span className="progress-map-title">Ruta de Medición — {scenario.toUpperCase()}</span>
                <span className="progress-map-count">
                    {currentIndex} / {totalPoints} puntos completados
                </span>
            </div>

            <div className="progress-map-track">
                {/* Línea de fondo */}
                <div className="track-line-bg" />
                {/* Línea de progreso */}
                <div
                    className="track-line-fill"
                    style={{
                        width: `${totalPoints > 1 ? (currentIndex / (totalPoints - 1)) * 100 : 0}%`,
                        backgroundColor: color
                    }}
                />

                {/* Puntos */}
                {points.map(i => {
                    const status = getStatus(i)
                    const dist = (i + 1) * 16
                    const summary = summaryByIndex[i]
                    return (
                        <div key={i} className={`track-point-wrapper`} style={{ left: `${(i / (totalPoints - 1)) * 100}%` }}>
                            <div
                                className={`track-point ${status}`}
                                style={status !== 'pending' ? { borderColor: color, backgroundColor: status === 'done' ? color : 'transparent' } : {}}
                                title={
                                    status === 'done' && summary
                                        ? `${dist}m — RSSI: ${summary.rssi_avg} dBm | SNR: ${summary.snr_avg} dB | σ: ${summary.rssi_std} dB`
                                        : `${dist}m`
                                }
                            >
                                {status === 'done' && <span className="point-check">✓</span>}
                                {status === 'active' && <span className="point-active-dot" style={{ backgroundColor: color }} />}
                            </div>
                            {/* Etiqueta de distancia — mostrar cada 4 puntos para no saturar */}
                            {(i === 0 || i === totalPoints - 1 || i % 4 === 3) && (
                                <span className="track-label">{dist}m</span>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Leyenda compacta de puntos completados */}
            {pointSummaries && pointSummaries.length > 0 && (
                <div className="progress-map-legend">
                    {pointSummaries.slice(-3).map(p => (
                        <div key={p.distancia} className="legend-item" style={{ borderColor: color + '55' }}>
                            <span className="legend-dist" style={{ color }}>{p.distancia}m</span>
                            <span className="legend-stat">{p.rssi_avg} dBm</span>
                            <span className="legend-stat">σ {p.rssi_std} dB</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ProgressMap
