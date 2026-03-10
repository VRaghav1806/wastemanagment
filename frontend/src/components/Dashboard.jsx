import { useEffect, useState, useRef } from 'react'

function Dashboard({ apiBase }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const chartRef = useRef(null)
    const barChartRef = useRef(null)
    const [aiSuggestions, setAiSuggestions] = useState('')

    useEffect(() => {
        fetchDashboard()
        fetchAiSuggestions()
        const interval = setInterval(() => {
            fetchDashboard()
            fetchAiSuggestions()
        }, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (data) {
            drawBarChart()
            drawDonutChart()
        }
    }, [data])

    const fetchDashboard = async () => {
        try {
            const res = await fetch(`${apiBase}/dashboard`)
            const json = await res.json()
            setData(json)
            setLoading(false)
        } catch (err) {
            console.error('Failed to fetch dashboard:', err)
            setLoading(false)
        }
    }

    const fetchAiSuggestions = async () => {
        try {
            const res = await fetch(`${apiBase}/ai/suggestions`)
            const json = await res.json()
            setAiSuggestions(json.suggestions)
        } catch (err) {
            console.error('Failed to fetch AI suggestions:', err)
        }
    }

    const drawBarChart = () => {
        const canvas = barChartRef.current
        if (!canvas || !data) return
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        const rect = canvas.parentElement.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        canvas.style.width = rect.width + 'px'
        canvas.style.height = rect.height + 'px'
        ctx.scale(dpr, dpr)

        const w = rect.width
        const h = rect.height
        const padding = { top: 20, right: 20, bottom: 40, left: 45 }
        const chartW = w - padding.left - padding.right
        const chartH = h - padding.top - padding.bottom

        ctx.clearRect(0, 0, w, h)

        const { days, collections, wasteKg } = data.weeklyData
        const maxVal = Math.max(...wasteKg) * 1.2

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'
        ctx.lineWidth = 1
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i
            ctx.beginPath()
            ctx.moveTo(padding.left, y)
            ctx.lineTo(w - padding.right, y)
            ctx.stroke()

            ctx.fillStyle = 'rgba(255,255,255,0.3)'
            ctx.font = '11px Inter'
            ctx.textAlign = 'right'
            ctx.fillText(Math.round(maxVal - (maxVal / 4) * i) + ' kg', padding.left - 8, y + 4)
        }

        const barWidth = chartW / days.length * 0.4
        const gap = chartW / days.length

        days.forEach((day, i) => {
            const x = padding.left + gap * i + gap / 2 - barWidth / 2
            const barH = (wasteKg[i] / maxVal) * chartH
            const y = padding.top + chartH - barH

            // Bar gradient
            const grad = ctx.createLinearGradient(x, y, x, y + barH)
            grad.addColorStop(0, '#00e676')
            grad.addColorStop(1, 'rgba(0,230,118,0.3)')
            ctx.fillStyle = grad
            ctx.beginPath()
            ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0])
            ctx.fill()

            // Collection dots (scaled to same maxVal as bars)
            const dotY = padding.top + chartH - (wasteKg[i] * 0.85 / maxVal) * chartH // Baseline
            const actualDotY = padding.top + chartH - (collections[i] / maxVal) * chartH
            ctx.fillStyle = '#00bcd4'
            ctx.beginPath()
            ctx.arc(padding.left + gap * i + gap / 2, actualDotY, 4, 0, Math.PI * 2)
            ctx.fill()

            // Day label
            ctx.fillStyle = 'rgba(255,255,255,0.5)'
            ctx.font = '11px Inter'
            ctx.textAlign = 'center'
            ctx.fillText(day, padding.left + gap * i + gap / 2, h - padding.bottom + 20)
        })

        // Connect dots with line (using same maxVal scale)
        ctx.strokeStyle = 'rgba(0,188,212,0.8)'
        ctx.lineWidth = 2
        ctx.beginPath()
        days.forEach((_, i) => {
            const x = padding.left + gap * i + gap / 2
            const dotY = padding.top + chartH - (data.weeklyData.collections[i] / maxVal) * chartH
            if (i === 0) ctx.moveTo(x, dotY)
            else ctx.lineTo(x, dotY)
        })
        ctx.stroke()
    }

    const drawDonutChart = () => {
        const canvas = chartRef.current
        if (!canvas || !data) return
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        canvas.width = 180 * dpr
        canvas.height = 180 * dpr
        canvas.style.width = '180px'
        canvas.style.height = '180px'
        ctx.scale(dpr, dpr)

        const cx = 90, cy = 90, radius = 65, lineWidth = 14
        const total = data.totalBins
        const segments = [
            { val: data.criticalBins, color: '#ff5252' },
            { val: data.warningBins, color: '#ffc107' },
            { val: total - data.criticalBins - data.warningBins, color: '#00e676' },
        ]

        let startAngle = -Math.PI / 2
        segments.forEach(seg => {
            const sweep = (seg.val / total) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(cx, cy, radius, startAngle, startAngle + sweep)
            ctx.strokeStyle = seg.color
            ctx.lineWidth = lineWidth
            ctx.lineCap = 'round'
            ctx.stroke()
            startAngle += sweep + 0.04
        })

        // Center text
        ctx.fillStyle = '#f1f5f9'
        ctx.font = 'bold 24px Inter'
        ctx.textAlign = 'center'
        ctx.fillText(`${data.collectionEfficiency}%`, cx, cy + 2)
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.font = '11px Inter'
        ctx.fillText('Efficiency', cx, cy + 18)
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
                <h1>📊 Dashboard</h1>
                <p>Real-time overview of the city's waste management system</p>
            </div>

            <div className="dash-stats stagger">
                <div className="glass-card stat-card green">
                    <div className="stat-icon">🗑️</div>
                    <div className="stat-value">{data.totalBins}</div>
                    <div className="stat-label">Total Smart Bins</div>
                    <div className="stat-trend">↑ Active & Monitored</div>
                </div>
                <div className="glass-card stat-card red">
                    <div className="stat-icon">🚨</div>
                    <div className="stat-value">{data.criticalBins}</div>
                    <div className="stat-label">Need Immediate Cleaning</div>
                    <div className="stat-trend">≥ 80% Full</div>
                </div>
                <div className="glass-card stat-card cyan">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-value">{data.collectionEfficiency}%</div>
                    <div className="stat-label">Collection Efficiency</div>
                    <div className="stat-trend">↑ Optimized</div>
                </div>
                <div className="glass-card stat-card amber">
                    <div className="stat-icon">📦</div>
                    <div className="stat-value">{data.wasteCollectedToday}</div>
                    <div className="stat-label">Collected Today</div>
                    <div className="stat-trend">↑ On Track</div>
                </div>
            </div>

            <div className="dash-grid">
                <div className="glass-card">
                    <div className="card-header">
                        <h3>📈 Weekly Waste & Collection Trends</h3>
                        <div className="chart-legend">
                            <span className="legend-item"><i className="bar-icon"></i> Waste Generated (kg)</span>
                            <span className="legend-item"><i className="line-icon"></i> Waste Collected (kg)</span>
                        </div>
                        <span className="card-badge badge-green">Live</span>
                    </div>
                    <div className="chart-container">
                        <canvas ref={barChartRef}></canvas>
                    </div>
                </div>

                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="card-header" style={{ width: '100%' }}>
                        <h3>🎯 Bin Health</h3>
                    </div>
                    <canvas ref={chartRef}></canvas>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '0.75rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5252', display: 'inline-block' }}></span>
                            Critical
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffc107', display: 'inline-block' }}></span>
                            Warning
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#00e676', display: 'inline-block' }}></span>
                            Normal
                        </span>
                    </div>
                </div>
            </div>

            <div className="dash-grid">
                <div className="glass-card">
                    <div className="card-header">
                        <h3>⚠️ Recent Alerts</h3>
                        <span className="card-badge badge-red">{data.alerts.length} Active</span>
                    </div>
                    <div className="stagger">
                        {data.alerts.map((alert, i) => (
                            <div className="alert-item" key={i}>
                                <div className={`alert-dot ${alert.type}`}></div>
                                <div className="alert-content">
                                    <p>{alert.message}</p>
                                    <span>{alert.time}</span>
                                </div>
                            </div>
                        ))}
                        {data.alerts.length === 0 && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '16px 0' }}>
                                ✅ No active alerts — all bins are within capacity.
                            </p>
                        )}
                    </div>
                </div>

                <div className="glass-card">
                    <div className="card-header">
                        <h3>📍 Zone Overview</h3>
                    </div>
                    <div className="zone-grid stagger">
                        {Object.entries(data.zones).map(([zone, info]) => (
                            <div className="zone-card" key={zone}>
                                <h4>{zone}</h4>
                                <div className="zone-fill" style={{
                                    color: info.avgFill >= 65 ? 'var(--accent-red)' :
                                        info.avgFill >= 45 ? 'var(--accent-amber)' : 'var(--accent-green)'
                                }}>
                                    {info.avgFill}%
                                </div>
                                <div className="zone-info">
                                    {info.total} bins • {info.critical} critical
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Predictions Section */}
            {data.predictions && data.predictions.length > 0 && (
                <div className="glass-card" style={{ marginTop: '20px' }}>
                    <div className="card-header">
                        <h3>🧠 AI Waste Generation Predictions</h3>
                        <span className="card-badge badge-cyan">AI Powered</span>
                    </div>
                    <div className="prediction-grid stagger">
                        {data.predictions.map((p, i) => (
                            <div key={i} className="ai-prediction-card">
                                <div className="ai-pred-icon">{p.icon}</div>
                                <div className="ai-pred-content">
                                    <div className="ai-pred-header">
                                        <span className="ai-pred-area">{p.area}</span>
                                        <span className="ai-pred-increase">{p.increase}</span>
                                    </div>
                                    <span className="ai-pred-pattern">{p.pattern}</span>
                                    <p className="ai-pred-detail">{p.detail}</p>
                                    <div className="ai-pred-confidence">
                                        <div className="confidence-bar">
                                            <div className="confidence-fill" style={{ width: `${p.confidence * 100}%` }} />
                                        </div>
                                        <span>{(p.confidence * 100).toFixed(0)}% confidence</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Anomaly Alerts */}
            {data.anomalies && data.anomalies.length > 0 && (
                <div className="glass-card anomaly-section" style={{ marginTop: '20px' }}>
                    <div className="card-header">
                        <h3>⚡ Anomaly Detection</h3>
                        <span className="card-badge badge-red">{data.anomalies.length} Detected</span>
                    </div>
                    <div className="stagger">
                        {data.anomalies.map((a, i) => (
                            <div key={i} className={`anomaly-alert anomaly-${a.severity}`}>
                                <div className="anomaly-indicator">
                                    {a.severity === 'high' ? '🔴' : '🟡'}
                                </div>
                                <div className="anomaly-content">
                                    <p className="anomaly-msg">{a.message}</p>
                                    <span className="anomaly-action">📋 {a.action}</span>
                                </div>
                                <span className={`severity-badge ${a.severity === 'high' ? 'High' : 'Medium'}`}>
                                    {a.severity.toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Dashboard
