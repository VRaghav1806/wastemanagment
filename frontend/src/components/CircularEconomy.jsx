import { useState, useEffect, useRef } from 'react'

function CircularEconomy({ apiBase }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const trendCanvasRef = useRef()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const res = await fetch(`${apiBase}/circular-economy`)
            const d = await res.json()
            setData(d)
            setLoading(false)
            setTimeout(() => drawTrendChart(d.monthlyTrend), 100)
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
    }

    const drawTrendChart = (trend) => {
        const canvas = trendCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const w = canvas.width = canvas.offsetWidth * 2
        const h = canvas.height = 320
        ctx.scale(2, 2)
        const cw = w / 2, ch = h / 2

        ctx.clearRect(0, 0, cw, ch)
        const pad = { top: 30, right: 20, bottom: 40, left: 50 }
        const plotW = cw - pad.left - pad.right
        const plotH = ch - pad.top - pad.bottom

        const allValues = [...trend.recycled, ...trend.composted, ...trend.landfill]
        const maxVal = Math.max(...allValues) * 1.15

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth = 0.5
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (plotH / 4) * i
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(cw - pad.right, y); ctx.stroke()
            ctx.fillStyle = '#64748b'
            ctx.font = '10px Inter'
            ctx.textAlign = 'right'
            ctx.fillText(Math.round(maxVal - (maxVal / 4) * i) + ' kg', pad.left - 8, y + 4)
        }

        // X labels
        const numMonths = trend.months.length
        const xStep = numMonths > 1 ? plotW / (numMonths - 1) : plotW
        trend.months.forEach((m, i) => {
            const x = pad.left + xStep * i
            ctx.fillStyle = '#64748b'
            ctx.font = '10px Inter'
            ctx.textAlign = 'center'
            ctx.fillText(m, x, ch - pad.bottom + 18)
        })

        // Draw stacked bars
        const barW = numMonths > 1 ? (plotW / numMonths) * 0.6 : 30
        trend.months.forEach((_, i) => {
            const x = pad.left + xStep * i - barW / 2
            const recycledH = (trend.recycled[i] / maxVal) * plotH
            const compostH = (trend.composted[i] / maxVal) * plotH
            const landfillH = (trend.landfill[i] / maxVal) * plotH
            let y = pad.top + plotH

            // Landfill
            ctx.fillStyle = 'rgba(255,82,82,0.7)'
            y -= landfillH
            ctx.beginPath()
            ctx.roundRect(x, y, barW, landfillH, [3, 3, 0, 0])
            ctx.fill()

            // Composted
            ctx.fillStyle = 'rgba(255,193,7,0.7)'
            y -= compostH
            ctx.beginPath()
            ctx.roundRect(x, y, barW, compostH, [3, 3, 0, 0])
            ctx.fill()

            // Recycled
            ctx.fillStyle = 'rgba(0,230,118,0.7)'
            y -= recycledH
            ctx.beginPath()
            ctx.roundRect(x, y, barW, recycledH, [3, 3, 0, 0])
            ctx.fill()
        })

        // Legend
        const legends = [
            { label: 'Recycled', color: 'rgba(0,230,118,0.7)' },
            { label: 'Composted', color: 'rgba(255,193,7,0.7)' },
            { label: 'Landfill', color: 'rgba(255,82,82,0.7)' },
        ]
        legends.forEach((l, i) => {
            const lx = pad.left + i * 100
            ctx.fillStyle = l.color
            ctx.fillRect(lx, ch - 12, 10, 10)
            ctx.fillStyle = '#94a3b8'
            ctx.font = '10px Inter'
            ctx.textAlign = 'left'
            ctx.fillText(l.label, lx + 14, ch - 3)
        })
    }

    if (loading) {
        return (
            <div className="fade-in">
                <div className="page-header">
                    <h1>♻️ Circular Economy Intelligence</h1>
                    <p>Loading resource recovery data...</p>
                </div>
                <div className="analyzing"><div className="spinner" /><p>Fetching circular economy analytics...</p></div>
            </div>
        )
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>♻️ Circular Economy Intelligence Engine</h1>
                <p>Track resource recovery, material flows, and recycling revenue</p>
            </div>

            {/* Summary Stats */}
            <div className="dash-stats stagger">
                <div className="glass-card stat-card green">
                    <div className="stat-icon">♻️</div>
                    <div className="stat-value">{data.totalRecycled} kg</div>
                    <div className="stat-label">Total Recycled</div>
                    <div className="stat-trend">↑ {data.recyclingRate}% rate</div>
                </div>
                <div className="glass-card stat-card amber">
                    <div className="stat-icon">🌱</div>
                    <div className="stat-value">{data.recovery.organic.composted_kg} kg</div>
                    <div className="stat-label">Composted</div>
                    <div className="stat-trend">↑ {data.recovery.organic.recovery_rate}% rate</div>
                </div>
                <div className="glass-card stat-card cyan">
                    <div className="stat-icon">💰</div>
                    <div className="stat-value">₹{data.totalRevenue.toLocaleString()}</div>
                    <div className="stat-label">Material Revenue</div>
                    <div className="stat-trend">↑ Growing</div>
                </div>
                <div className="glass-card stat-card green">
                    <div className="stat-icon">🌍</div>
                    <div className="stat-value">{data.totalCO2Saved} kg</div>
                    <div className="stat-label">CO₂ Saved</div>
                    <div className="stat-trend">↑ Eco Impact</div>
                </div>
            </div>

            {/* Recovery Breakdown + Trend Chart */}
            <div className="ce-grid">
                <div className="glass-card">
                    <div className="card-header">
                        <h3>📊 Monthly Recovery Trend</h3>
                        <span className="card-badge badge-green">6 Months</span>
                    </div>
                    <div className="ce-chart-container">
                        <canvas ref={trendCanvasRef} style={{ width: '100%', height: '160px' }} />
                    </div>
                </div>

                <div className="glass-card">
                    <div className="card-header">
                        <h3>📦 Material Recovery Rates</h3>
                    </div>
                    <div className="recovery-list">
                        {Object.entries(data.recovery).map(([type, info]) => (
                            <div key={type} className="recovery-item">
                                <div className="recovery-header">
                                    <span className="recovery-type">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                    <span className="recovery-rate">{info.recovery_rate}%</span>
                                </div>
                                <div className="fill-bar">
                                    <div
                                        className={`fill-bar-inner ${info.recovery_rate >= 80 ? 'low' : info.recovery_rate >= 60 ? 'moderate' : 'warning'}`}
                                        style={{ width: `${info.recovery_rate}%` }}
                                    />
                                </div>
                                <div className="recovery-meta">
                                    <span>{info.recycled_kg || info.composted_kg} kg recovered</span>
                                    <span>₹{info.revenue?.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Routing Suggestions */}
            <div className="glass-card ce-suggestions">
                <div className="card-header">
                    <h3>🤖 AI Routing Suggestions</h3>
                    <span className="card-badge badge-cyan">AI Powered</span>
                </div>
                <div className="suggestion-grid stagger">
                    {data.aiSuggestions.map((s, i) => (
                        <div key={i} className={`suggestion-card urgency-${s.urgency}`}>
                            <div className="sug-header">
                                <span className="sug-material">{s.material}</span>
                                <span className={`sug-urgency urgency-badge-${s.urgency}`}>
                                    {s.urgency.toUpperCase()}
                                </span>
                            </div>
                            <p className="sug-action">{s.action}</p>
                            <div className="sug-meta">
                                <span>📦 {s.quantity}</span>
                                <span>💡 {s.reason}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Destination Table */}
            <div className="glass-card">
                <div className="card-header">
                    <h3>🏭 Recycling Plant Allocation</h3>
                </div>
                <table className="hotspot-table">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Collected</th>
                            <th>Recovered</th>
                            <th>Rate</th>
                            <th>Destination</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(data.recovery).map(([type, info]) => (
                            <tr key={type}>
                                <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{type}</td>
                                <td>{info.collected_kg} kg</td>
                                <td>{info.recycled_kg || info.composted_kg} kg</td>
                                <td>
                                    <span className={`severity-badge ${info.recovery_rate >= 80 ? 'Low' : info.recovery_rate >= 60 ? 'Medium' : 'High'}`}>
                                        {info.recovery_rate}%
                                    </span>
                                </td>
                                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{info.destination}</td>
                                <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{info.revenue?.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default CircularEconomy
