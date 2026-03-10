import { useState, useRef, useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function DigitalTwin({ apiBase }) {
    const [scenario, setScenario] = useState('add_bins')
    const [params, setParams] = useState({ count: 5, zone: 'North Zone', congestion: 'moderate', vehicles: 4 })
    const [result, setResult] = useState(null)
    const [simulating, setSimulating] = useState(false)
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const markersRef = useRef([])

    const scenarios = [
        { id: 'add_bins', icon: '🗑️', label: 'Add Smart Bins', desc: 'Simulate adding new bins to a zone' },
        { id: 'traffic_impact', icon: '🚦', label: 'Traffic Impact', desc: 'Analyze congestion effects' },
        { id: 'vehicle_allocation', icon: '🚛', label: 'Vehicle Allocation', desc: 'Optimize fleet size' },
    ]

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return
        const map = L.map(mapRef.current, {
            center: [11.0012, 76.9780],
            zoom: 13,
            zoomControl: true,
            scrollWheelZoom: true,
        })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map)
        mapInstanceRef.current = map

        // Load initial bins on mount
        fetchAndShowBins(map)

        return () => { map.remove(); mapInstanceRef.current = null }
    }, [])

    const getColor = (fill) => {
        if (fill >= 80) return '#ff5252'
        if (fill >= 60) return '#ffc107'
        if (fill >= 40) return '#00bcd4'
        return '#00e676'
    }

    const fetchAndShowBins = async (map) => {
        try {
            const res = await fetch(`${apiBase}/bins`)
            const bins = await res.json()
            showBinsOnMap(map, bins)
        } catch (err) { console.error(err) }
    }

    const showBinsOnMap = (map, bins) => {
        // Clear old markers
        markersRef.current.forEach(m => map.removeLayer(m))
        markersRef.current = []

        bins.forEach(bin => {
            const color = getColor(bin.fillLevel)
            const marker = L.circleMarker([bin.lat, bin.lng], {
                radius: 8 + (bin.fillLevel / 100) * 8,
                fillColor: color,
                color: '#fff',
                weight: 1.5,
                fillOpacity: 0.85,
            }).addTo(map)

            marker.bindPopup(`
                <div style="font-family:Inter,sans-serif;min-width:180px">
                    <strong style="font-size:14px">${bin.name}</strong><br/>
                    <span style="color:#666;font-size:12px">${bin.location}</span>
                    <hr style="border:none;border-top:1px solid #eee;margin:6px 0"/>
                    <div style="display:flex;justify-content:space-between;font-size:13px">
                        <span>Fill Level</span>
                        <strong style="color:${color}">${bin.fillLevel}%</strong>
                    </div>
                    <div style="height:6px;background:#eee;border-radius:3px;margin:4px 0">
                        <div style="height:100%;width:${bin.fillLevel}%;background:${color};border-radius:3px"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-top:4px">
                        <span>Zone: ${bin.zone}</span>
                        <span>${bin.wasteType}</span>
                    </div>
                    <div style="font-size:11px;color:#888;margin-top:2px">
                        Status: <span style="color:${color};font-weight:600">${bin.status.toUpperCase()}</span>
                    </div>
                </div>
            `)
            markersRef.current.push(marker)
        })

        // Add depot marker
        const depotIcon = L.divIcon({
            html: '<div style="background:#00e676;color:#000;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">D</div>',
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        })
        const depotMarker = L.marker([11.0165, 76.9693], { icon: depotIcon }).addTo(map)
        depotMarker.bindPopup('<strong>🏢 Depot</strong><br/>Coimbatore Corporation Office<br/>Gandhipuram')
        markersRef.current.push(depotMarker)
    }

    const runSimulation = async () => {
        setSimulating(true)
        setResult(null)
        try {
            const res = await fetch(`${apiBase}/digital-twin/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario, params })
            })
            const data = await res.json()
            setResult(data)

            // Update map with grid data
            if (data.gridData && mapInstanceRef.current) {
                const map = mapInstanceRef.current
                showBinsOnMap(map, data.gridData.map(b => ({
                    ...b,
                    name: b.name || `Bin`,
                    location: b.location || b.zone,
                    wasteType: b.wasteType || 'Mixed',
                    status: b.fillLevel >= 80 ? 'critical' : b.fillLevel >= 60 ? 'warning' : b.fillLevel >= 40 ? 'moderate' : 'low',
                })))
            }
        } catch (err) { console.error(err) }
        setSimulating(false)
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>🏙️ Digital Twin — City Waste Simulation</h1>
                <p>Simulate scenarios, predict outcomes, and optimize waste infrastructure</p>
            </div>

            <div className="dt-layout">
                {/* Control Panel */}
                <div className="dt-controls">
                    <div className="glass-card">
                        <div className="card-header"><h3>🎮 Scenario Controls</h3></div>
                        <div className="dt-scenario-tabs">
                            {scenarios.map(s => (
                                <button
                                    key={s.id}
                                    className={`dt-scenario-btn ${scenario === s.id ? 'active' : ''}`}
                                    onClick={() => { setScenario(s.id); setResult(null) }}
                                >
                                    <span className="dt-sc-icon">{s.icon}</span>
                                    <div>
                                        <span className="dt-sc-label">{s.label}</span>
                                        <span className="dt-sc-desc">{s.desc}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Dynamic params */}
                        <div className="dt-params">
                            {scenario === 'add_bins' && (
                                <>
                                    <div className="form-group">
                                        <label>Number of Bins to Add</label>
                                        <input type="range" min="1" max="20" value={params.count}
                                            onChange={e => setParams({ ...params, count: +e.target.value })}
                                            className="dt-slider" />
                                        <span className="dt-slider-val">{params.count} bins</span>
                                    </div>
                                    <div className="form-group">
                                        <label>Target Zone</label>
                                        <select value={params.zone} onChange={e => setParams({ ...params, zone: e.target.value })}>
                                            {['North Zone', 'East Zone', 'Central Zone', 'West Zone', 'South Zone'].map(z =>
                                                <option key={z} value={z}>{z}</option>
                                            )}
                                        </select>
                                    </div>
                                </>
                            )}
                            {scenario === 'traffic_impact' && (
                                <div className="form-group">
                                    <label>Congestion Level</label>
                                    <select value={params.congestion} onChange={e => setParams({ ...params, congestion: e.target.value })}>
                                        <option value="low">Low (Normal flow)</option>
                                        <option value="moderate">Moderate (30% delay)</option>
                                        <option value="high">High (Rush hour)</option>
                                        <option value="severe">Severe (Gridlock)</option>
                                    </select>
                                </div>
                            )}
                            {scenario === 'vehicle_allocation' && (
                                <div className="form-group">
                                    <label>Number of Vehicles</label>
                                    <input type="range" min="1" max="10" value={params.vehicles}
                                        onChange={e => setParams({ ...params, vehicles: +e.target.value })}
                                        className="dt-slider" />
                                    <span className="dt-slider-val">{params.vehicles} vehicles</span>
                                </div>
                            )}
                        </div>

                        <button className="generate-route-btn" onClick={runSimulation} disabled={simulating}
                            style={{ width: '100%', marginTop: '12px' }}>
                            {simulating ? '⚙️ Simulating...' : '▶️ Run Simulation'}
                        </button>
                    </div>

                    {/* Results */}
                    {result && (
                        <div className="glass-card scale-in">
                            <div className="card-header">
                                <h3>📊 Simulation Results</h3>
                                <span className="card-badge badge-cyan">AI Analysis</span>
                            </div>

                            <div className="dt-metrics stagger">
                                {Object.entries(result.metrics).map(([key, val]) => (
                                    <div key={key} className="dt-metric">
                                        <span className="dt-metric-label">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                        </span>
                                        <span className={`dt-metric-value ${String(val).startsWith('+') ? 'positive' : String(val).startsWith('-') ? 'negative' : ''}`}>
                                            {val}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Before/After */}
                            {result.before && result.after && (
                                <div className="dt-comparison">
                                    <div className="dt-comp-col">
                                        <h4>Before</h4>
                                        {Object.entries(result.before).map(([k, v]) => (
                                            <div key={k} className="dt-comp-row">
                                                <span>{k.replace(/([A-Z])/g, ' $1')}</span>
                                                <span>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="dt-comp-divider">→</div>
                                    <div className="dt-comp-col after">
                                        <h4>After</h4>
                                        {Object.entries(result.after).map(([k, v]) => (
                                            <div key={k} className="dt-comp-row">
                                                <span>{k.replace(/([A-Z])/g, ' $1')}</span>
                                                <span>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="dt-recommendation">
                                <span>💡</span>
                                <p>{result.recommendation}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Real Coimbatore Map */}
                <div className="dt-map glass-card">
                    <div className="card-header">
                        <h3>🗺️ Coimbatore Waste Network</h3>
                        <span className="card-badge badge-green">Live Map</span>
                    </div>
                    <div className="leaflet-map-container" ref={mapRef} />
                </div>
            </div>
        </div>
    )
}

export default DigitalTwin
