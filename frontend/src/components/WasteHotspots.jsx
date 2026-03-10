import { useEffect, useState, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function WasteHotspots({ apiBase }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const trendRef = useRef(null)

    useEffect(() => {
        fetchHotspots()
    }, [])

    useEffect(() => {
        if (data) {
            initMap()
            drawTrendChart()
        }
    }, [data])

    const fetchHotspots = async () => {
        try {
            const res = await fetch(`${apiBase}/hotspots`)
            setData(await res.json())
            setLoading(false)
        } catch (err) {
            console.error('Failed to fetch hotspots:', err)
            setLoading(false)
        }
    }

    const initMap = () => {
        if (!mapRef.current) return
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove()
            mapInstanceRef.current = null
        }
        const map = L.map(mapRef.current, {
            center: [11.0012, 76.9780],
            zoom: 13,
            zoomControl: true,
        })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map)
        mapInstanceRef.current = map

        // Fetch bins and create heatmap-style visualization
        fetch(`${apiBase}/bins`)
            .then(r => r.json())
            .then(bins => {
                bins.forEach(bin => {
                    const intensity = bin.fillLevel / 100
                    const color = intensity > 0.65 ? '#ff5252'
                        : intensity > 0.45 ? '#ffc107'
                            : '#00e676'
                    const radius = 20 + intensity * 40

                    // Heatmap glow circle
                    L.circle([bin.lat, bin.lng], {
                        radius: radius * 8,
                        fillColor: color,
                        color: 'transparent',
                        fillOpacity: 0.15 + intensity * 0.1,
                    }).addTo(map)

                    // Bin marker
                    const marker = L.circleMarker([bin.lat, bin.lng], {
                        radius: 6 + intensity * 6,
                        fillColor: color,
                        color: '#fff',
                        weight: 1.5,
                        fillOpacity: 0.9,
                    }).addTo(map)

                    marker.bindPopup(`
                        <div style="font-family:Inter,sans-serif;min-width:160px">
                            <strong>${bin.name}</strong><br/>
                            <span style="color:#666;font-size:12px">${bin.location}</span>
                            <hr style="border:none;border-top:1px solid #eee;margin:6px 0"/>
                            <div style="display:flex;justify-content:space-between;font-size:13px">
                                <span>Fill Level</span>
                                <strong style="color:${color}">${bin.fillLevel}%</strong>
                            </div>
                            <div style="height:6px;background:#eee;border-radius:3px;margin:4px 0">
                                <div style="height:100%;width:${bin.fillLevel}%;background:${color};border-radius:3px"></div>
                            </div>
                            <div style="font-size:11px;color:#888;margin-top:4px">Zone: ${bin.zone}</div>
                        </div>
                    `)
                })

                // Zone labels as markers
                const zoneCoords = {
                    'North Zone': [11.030, 76.975],
                    'East Zone': [11.008, 77.020],
                    'Central Zone': [10.998, 76.960],
                    'West Zone': [11.040, 76.945],
                    'South Zone': [10.950, 76.960],
                }
                Object.entries(zoneCoords).forEach(([zone, coords]) => {
                    const label = L.divIcon({
                        html: `<div style="background:rgba(0,0,0,0.7);color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;font-family:Inter,sans-serif">${zone}</div>`,
                        className: '', iconAnchor: [30, 10],
                    })
                    L.marker(coords, { icon: label, interactive: false }).addTo(map)
                })
            })
    }

    const drawTrendChart = () => {
        const canvas = trendRef.current
        if (!canvas || !data) return
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        const rect = canvas.parentElement.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = 200 * dpr
        canvas.style.width = rect.width + 'px'
        canvas.style.height = '200px'
        ctx.scale(dpr, dpr)

        const w = rect.width
        const h = 200
        const padding = { top: 20, right: 20, bottom: 30, left: 40 }
        const chartW = w - padding.left - padding.right
        const chartH = h - padding.top - padding.bottom

        ctx.clearRect(0, 0, w, h)

        const { days, avgFill } = data.historical
        const maxVal = 100

        ctx.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 1
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i
            ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke()
            ctx.fillStyle = 'rgba(255,255,255,0.3)'
            ctx.font = '10px Inter'
            ctx.textAlign = 'right'
            ctx.fillText(`${100 - 25 * i}%`, padding.left - 6, y + 3)
        }

        const gap = chartW / (days.length - 1)
        ctx.beginPath()
        ctx.moveTo(padding.left, padding.top + chartH)
        days.forEach((_, i) => {
            const x = padding.left + gap * i
            const y = padding.top + chartH - (avgFill[i] / maxVal) * chartH
            ctx.lineTo(x, y)
        })
        ctx.lineTo(padding.left + gap * (days.length - 1), padding.top + chartH)
        ctx.closePath()
        const areaGrad = ctx.createLinearGradient(0, padding.top, 0, h)
        areaGrad.addColorStop(0, 'rgba(255,193,7,0.2)')
        areaGrad.addColorStop(1, 'rgba(255,193,7,0)')
        ctx.fillStyle = areaGrad
        ctx.fill()

        ctx.strokeStyle = '#ffc107'
        ctx.lineWidth = 2.5
        ctx.lineJoin = 'round'
        ctx.beginPath()
        days.forEach((_, i) => {
            const x = padding.left + gap * i
            const y = padding.top + chartH - (avgFill[i] / maxVal) * chartH
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
        })
        ctx.stroke()

        days.forEach((day, i) => {
            const x = padding.left + gap * i
            const y = padding.top + chartH - (avgFill[i] / maxVal) * chartH
            ctx.fillStyle = '#ffc107'
            ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
            ctx.fillStyle = 'rgba(255,255,255,0.5)'
            ctx.font = '10px Inter'
            ctx.textAlign = 'center'
            ctx.fillText(day, x, h - padding.bottom + 18)
        })
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div className="spinner"></div>
            </div>
        )
    }

    if (!data) return null

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>🔥 Waste Hotspots</h1>
                <p>Identify high-waste areas and predict future hotspot patterns</p>
            </div>

            <div className="hotspot-layout">
                <div className="glass-card heatmap-container">
                    <div className="card-header">
                        <h3>🗺️ Coimbatore Waste Heatmap</h3>
                        <span className="card-badge badge-red">Live</span>
                    </div>
                    <div className="leaflet-map-container" ref={mapRef} />
                </div>

                <div className="glass-card">
                    <div className="card-header">
                        <h3>🔮 Predictions</h3>
                        <span className="card-badge badge-amber">Next 24h</span>
                    </div>
                    <div className="stagger">
                        {data.predictions.map((pred, i) => (
                            <div className="prediction-card" key={i}>
                                <div className="pred-area">📍 {pred.area}</div>
                                <div className="pred-details">
                                    <span>📊 {pred.predictedFill}</span>
                                    <span>⏱️ {pred.timeframe}</span>
                                </div>
                                <div className="pred-reason">💡 {pred.reason}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                    <h3>📈 Weekly Fill Level Trend</h3>
                    <span className="card-badge badge-cyan">7-day avg</span>
                </div>
                <div>
                    <canvas ref={trendRef}></canvas>
                </div>
            </div>

            <div className="glass-card">
                <div className="card-header">
                    <h3>📊 Zone-wise Hotspot Analysis</h3>
                </div>
                <table className="hotspot-table">
                    <thead>
                        <tr>
                            <th>Zone</th>
                            <th>Bins</th>
                            <th>Avg Fill</th>
                            <th>Max Fill</th>
                            <th>Critical</th>
                            <th>Severity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.hotspots.map((h, i) => (
                            <tr key={i}>
                                <td><strong>{h.zone}</strong></td>
                                <td>{h.bins}</td>
                                <td>{h.avgFill}%</td>
                                <td>{h.maxFill}%</td>
                                <td>{h.criticalCount}</td>
                                <td>
                                    <span className={`severity-badge ${h.severity}`}>{h.severity}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data.suggestions && (
                <div className="glass-card" style={{ marginTop: '20px' }}>
                    <div className="card-header">
                        <h3>🤖 AI Recommendations</h3>
                        <span className="card-badge badge-cyan">Smart Suggestions</span>
                    </div>
                    <div className="suggestion-grid stagger">
                        {data.suggestions.map((s, i) => (
                            <div key={i} className={`suggestion-card urgency-${s.priority}`}>
                                <div className="sug-header">
                                    <span className="sug-material">{s.icon} {s.title}</span>
                                    <span className={`sug-urgency urgency-badge-${s.priority}`}>
                                        {s.priority.toUpperCase()}
                                    </span>
                                </div>
                                <p className="sug-action">📍 {s.location}</p>
                                <div className="sug-meta"><span>💡 {s.reason}</span></div>
                                <p className="sug-action-detail">✅ {s.action}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.seasonal && (
                <div className="glass-card" style={{ marginTop: '20px' }}>
                    <div className="card-header">
                        <h3>🌦️ Seasonal Waste Patterns</h3>
                        <span className="card-badge badge-amber">Annual Data</span>
                    </div>
                    <div className="seasonal-grid stagger">
                        {data.seasonal.map((s, i) => (
                            <div key={i} className="seasonal-card">
                                <div className="seasonal-header">
                                    <span className="seasonal-name">{s.season}</span>
                                    <span className={`seasonal-trend trend-${s.trend}`}>
                                        {s.trend === 'up' ? '📈' : '📉'} {s.trend.toUpperCase()}
                                    </span>
                                </div>
                                <p className="seasonal-pattern">{s.pattern}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default WasteHotspots
