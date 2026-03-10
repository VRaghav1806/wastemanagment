import { useEffect, useState, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function RouteOptimization({ apiBase }) {
    const [routeData, setRouteData] = useState(null)
    const [threshold, setThreshold] = useState(70)
    const [loading, setLoading] = useState(false)
    const [allBins, setAllBins] = useState([])
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const markersRef = useRef([])
    const routeLayerRef = useRef(null)

    useEffect(() => {
        fetchAllBins()
    }, [])

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return
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
        return () => { map.remove(); mapInstanceRef.current = null }
    }, [])

    useEffect(() => {
        if (allBins.length > 0 && mapInstanceRef.current) {
            showBinsOnMap()
        }
    }, [allBins])

    useEffect(() => {
        if (routeData && mapInstanceRef.current) {
            drawRoute()
        }
    }, [routeData])

    const getColor = (fill) => {
        if (fill >= 80) return '#ff5252'
        if (fill >= 60) return '#ffc107'
        if (fill >= 40) return '#00bcd4'
        return '#00e676'
    }

    const fetchAllBins = async () => {
        try {
            const res = await fetch(`${apiBase}/bins`)
            setAllBins(await res.json())
        } catch (err) { console.error('Failed to fetch bins:', err) }
    }

    const generateRoute = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${apiBase}/routes?threshold=${threshold}`)
            setRouteData(await res.json())
        } catch (err) { console.error('Failed to generate route:', err) }
        setLoading(false)
    }

    const showBinsOnMap = () => {
        const map = mapInstanceRef.current
        markersRef.current.forEach(m => map.removeLayer(m))
        markersRef.current = []

        allBins.forEach(bin => {
            const color = getColor(bin.fillLevel)
            const marker = L.circleMarker([bin.lat, bin.lng], {
                radius: 7,
                fillColor: color,
                color: '#fff',
                weight: 1.5,
                fillOpacity: 0.85,
            }).addTo(map)
            marker.bindPopup(`<strong>${bin.name}</strong><br/>${bin.location}<br/>Fill: <strong style="color:${color}">${bin.fillLevel}%</strong>`)
            markersRef.current.push(marker)
        })
    }

    const drawRoute = () => {
        const map = mapInstanceRef.current
        if (!map || !routeData || routeData.route.length === 0) return

        // Clear old route
        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current)
        markersRef.current.forEach(m => map.removeLayer(m))
        markersRef.current = []

        const depot = routeData.depot || { lat: 11.0165, lng: 76.9693 }
        const routePoints = [
            [depot.lat, depot.lng],
            ...routeData.route.map(b => [b.lat, b.lng]),
            [depot.lat, depot.lng]
        ]

        // Draw route polyline
        const polyline = L.polyline(routePoints, {
            color: '#00e676',
            weight: 4,
            opacity: 0.8,
            dashArray: '12, 6',
        }).addTo(map)
        routeLayerRef.current = polyline

        // Depot marker
        const depotIcon = L.divIcon({
            html: '<div style="background:#b388ff;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">D</div>',
            className: '', iconSize: [28, 28], iconAnchor: [14, 14],
        })
        const dm = L.marker([depot.lat, depot.lng], { icon: depotIcon }).addTo(map)
        dm.bindPopup('<strong>🏢 Depot</strong><br/>Coimbatore Corporation, Gandhipuram')
        markersRef.current.push(dm)

        // Route stop markers with numbers
        routeData.route.forEach((bin, i) => {
            const color = getColor(bin.fillLevel)
            const stopIcon = L.divIcon({
                html: `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${i + 1}</div>`,
                className: '', iconSize: [26, 26], iconAnchor: [13, 13],
            })
            const m = L.marker([bin.lat, bin.lng], { icon: stopIcon }).addTo(map)
            m.bindPopup(`<strong>Stop #${i + 1}: ${bin.name}</strong><br/>${bin.location}<br/>Fill: <strong style="color:${color}">${bin.fillLevel}%</strong>`)
            markersRef.current.push(m)
        })

        // Show all bins that aren't on the route
        allBins.forEach(bin => {
            const isOnRoute = routeData.route.some(r => r.id === bin.id)
            if (!isOnRoute) {
                const color = getColor(bin.fillLevel)
                const marker = L.circleMarker([bin.lat, bin.lng], {
                    radius: 5, fillColor: color, color: '#fff', weight: 1, fillOpacity: 0.5,
                }).addTo(map)
                marker.bindPopup(`<strong>${bin.name}</strong><br/>${bin.fillLevel}% (below threshold)`)
                markersRef.current.push(marker)
            }
        })

        // Fit map to route
        map.fitBounds(polyline.getBounds().pad(0.1))
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>🗺️ Route Optimization</h1>
                <p>Generate the most efficient collection route for waste trucks</p>
            </div>

            <div className="route-layout">
                <div className="route-map-container">
                    <div className="leaflet-map-container" ref={mapRef} />
                </div>

                <div className="route-panel">
                    <div className="glass-card">
                        <div className="card-header">
                            <h3>⚙️ Route Settings</h3>
                        </div>

                        <div className="threshold-control">
                            <label>Fill Threshold:</label>
                            <input type="range" min="40" max="95" value={threshold}
                                onChange={e => setThreshold(Number(e.target.value))} />
                            <span className="threshold-value">{threshold}%</span>
                        </div>

                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '10px 0' }}>
                            Only bins above {threshold}% fill level will be included in the route.
                        </p>

                        <button className="generate-route-btn" onClick={generateRoute}
                            disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
                            {loading ? '⏳ Generating...' : '🚀 Generate Optimal Route'}
                        </button>
                    </div>

                    {routeData && (
                        <>
                            <div className="route-stats stagger">
                                <div className="route-stat">
                                    <div className="stat-val">{routeData.binsToCollect}</div>
                                    <div className="stat-lbl">Bins to Collect</div>
                                </div>
                                <div className="route-stat">
                                    <div className="stat-val">{routeData.totalDistance}</div>
                                    <div className="stat-lbl">Total Distance</div>
                                </div>
                                <div className="route-stat">
                                    <div className="stat-val">{routeData.estimatedTime}</div>
                                    <div className="stat-lbl">Est. Time</div>
                                </div>
                                <div className="route-stat">
                                    <div className="stat-val" style={{ color: 'var(--accent-cyan)' }}>{routeData.fuelSaved}</div>
                                    <div className="stat-lbl">Fuel Saved</div>
                                </div>
                            </div>

                            <div className="glass-card">
                                <div className="card-header">
                                    <h3>📋 Collection Order</h3>
                                    <span className="card-badge badge-green">{routeData.route.length} stops</span>
                                </div>

                                {routeData.ai_insights && (
                                    <div className="ai-insights-box" style={{
                                        background: 'rgba(179, 136, 255, 0.1)',
                                        border: '1px solid rgba(179, 136, 255, 0.3)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        marginBottom: '16px',
                                        fontSize: '0.88rem',
                                        color: '#b388ff',
                                        lineHeight: '1.5'
                                    }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>🧠 AI Routing Insights</span>
                                        </div>
                                        {routeData.ai_insights}
                                    </div>
                                )}

                                <div className="route-stops stagger">
                                    {routeData.route.map((bin, i) => (
                                        <div className="route-stop" key={bin.id}>
                                            <div className="stop-number">{i + 1}</div>
                                            <div className="stop-info">
                                                <h4>{bin.name}</h4>
                                                <p>{bin.location} — {bin.fillLevel}% full</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {!routeData && (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '30px' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🚛</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                Set your fill threshold and click <strong>Generate Route</strong> to calculate the optimal collection path.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default RouteOptimization
