import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function CitizenPortal({ apiBase, userName }) {
    console.log('🚀 CitizenPortal loaded v2');
    const [activeTab, setActiveTab] = useState('report')
    const [ecoData, setEcoData] = useState(null)
    const [nearestBins, setNearestBins] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [reportForm, setReportForm] = useState({
        description: '',
        location: '',
        reporter: userName || '',
        type: 'overflow'
    })
    const [reportSubmitted, setReportSubmitted] = useState(false)
    const [findingBins, setFindingBins] = useState(false)
    const [allBins, setAllBins] = useState([])
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const nearestMapRef = useRef(null)
    const nearestMapInstanceRef = useRef(null)
    const markersRef = useRef([])
    const nearestMarkersRef = useRef([])
    const userMarkerRef = useRef(null)
    const [userLocation, setUserLocation] = useState(null)

    useEffect(() => {
        fetchEcoPoints()
        fetchAllBins()
    }, [])

    useEffect(() => {
        if (activeTab === 'map' && mapRef.current && !mapInstanceRef.current) {
            // Give the browser a moment to render the container and apply CSS
            const timer = setTimeout(() => {
                if (mapRef.current && !mapInstanceRef.current) {
                    initMap()
                }
            }, 100)
            return () => clearTimeout(timer)
        }
        // Cleanup map when switching away from map tab
        if (activeTab !== 'map' && mapInstanceRef.current) {
            mapInstanceRef.current.remove()
            mapInstanceRef.current = null
        }
    }, [activeTab])

    useEffect(() => {
        if (activeTab === 'map' && mapInstanceRef.current && allBins.length > 0) {
            updateMarkers()
        }
    }, [allBins, activeTab])

    useEffect(() => {
        if (activeTab === 'find' && nearestMapRef.current && userLocation && !nearestMapInstanceRef.current) {
            const timer = setTimeout(() => {
                if (nearestMapRef.current && !nearestMapInstanceRef.current) {
                    initNearestMap()
                }
            }, 100)
            return () => clearTimeout(timer)
        }
        if (activeTab !== 'find' && nearestMapInstanceRef.current) {
            nearestMapInstanceRef.current.remove()
            nearestMapInstanceRef.current = null
        }
    }, [activeTab, userLocation, nearestBins])

    useEffect(() => {
        if (activeTab === 'find' && nearestMapInstanceRef.current && nearestBins) {
            updateNearestMarkers()
        }
    }, [nearestBins, activeTab])

    const fetchEcoPoints = async () => {
        try {
            const res = await fetch(`${apiBase}/citizen/eco-points`)
            setEcoData(await res.json())
        } catch (err) { console.error(err) }
    }

    const submitReport = async () => {
        if (!reportForm.description || !reportForm.location) {
            console.warn('❌ Missing description or location');
            return;
        }
        setSubmitting(true);
        try {
            console.log('📤 Submitting report:', reportForm);
            const res = await fetch(`${apiBase}/citizen/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportForm)
            })
            if (res.ok) {
                const data = await res.json()
                console.log('✅ Report submitted:', data);
                setReportSubmitted(true)
                setReportForm({ description: '', location: '', reporter: userName || '', type: 'overflow' })
                fetchEcoPoints()
                setTimeout(() => setReportSubmitted(false), 3000)
            } else {
                const errData = await res.json()
                console.error('❌ Server error:', errData);
                alert(`Failed to submit: ${errData.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('❌ Network error:', err);
            alert('Could not reach backend. Please check if server is running.');
        } finally {
            setSubmitting(false);
        }
    }

    const fetchAllBins = async () => {
        try {
            const res = await fetch(`${apiBase}/bins`)
            setAllBins(await res.json())
        } catch (err) { console.error(err) }
    }

    const initMap = () => {
        if (!mapRef.current) return

        try {
            const map = L.map(mapRef.current, {
                center: [11.0168, 76.9558],
                zoom: 13,
                zoomControl: true,
            })

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
            }).addTo(map)

            mapInstanceRef.current = map

            // Force leaflet to recalculate size after container is definitely visible
            setTimeout(() => {
                map.invalidateSize()
                updateMarkers()
            }, 100)
        } catch (err) {
            console.error('Map initialization failed:', err)
        }
    }

    const updateMarkers = () => {
        const map = mapInstanceRef.current
        if (!map) return

        markersRef.current.forEach(m => map.removeLayer(m))
        markersRef.current = []

        allBins.forEach(bin => {
            const color = bin.fillLevel >= 80 ? '#ff5252' : bin.fillLevel >= 60 ? '#ffc107' : '#00e676'
            const marker = L.circleMarker([bin.lat, bin.lng], {
                radius: 8,
                fillColor: color,
                color: '#fff',
                weight: 2,
                fillOpacity: 0.9,
            }).addTo(map)

            marker.bindPopup(`
                <div class="map-popup">
                    <strong style="color: ${color}">${bin.name}</strong><br/>
                    <span>📍 ${bin.location}</span><br/>
                    <span>📊 Fill Level: <strong>${bin.fillLevel}%</strong></span>
                </div>
            `)
            markersRef.current.push(marker)
        })
    }

    const tabs = [
        { id: 'report', icon: '📝', label: 'Report Bin' },
        { id: 'map', icon: '🗺️', label: 'Bin Map' },
        { id: 'find', icon: '📍', label: 'Find Nearest' },
        { id: 'ecopoints', icon: '🏆', label: 'Eco-Points' },
        { id: 'tips', icon: '💡', label: 'Recycling Tips' },
    ]

    const handleFindNearest = async () => {
        setFindingBins(true)

        const getNearest = async (lat, lng) => {
            try {
                const res = await fetch(`${apiBase}/citizen/nearest?lat=${lat}&lng=${lng}`)
                setNearestBins(await res.json())
            } catch (err) {
                console.error(err)
            } finally {
                setFindingBins(false)
            }
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords
                    setUserLocation({ lat: latitude, lng: longitude })
                    getNearest(latitude, longitude)
                },
                (err) => {
                    console.warn("Geolocation failed, using default:", err.message)
                    setUserLocation({ lat: 11.0168, lng: 76.9558 })
                    getNearest(11.0168, 76.9558)
                }
            )
        } else {
            setUserLocation({ lat: 11.0168, lng: 76.9558 })
            getNearest(11.0168, 76.9558)
        }
    }

    const initNearestMap = () => {
        if (!nearestMapRef.current || !userLocation) return
        try {
            const map = L.map(nearestMapRef.current, {
                center: [userLocation.lat, userLocation.lng],
                zoom: 14,
                zoomControl: true,
            })
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map)

            updateUserMarker(map, userLocation.lat, userLocation.lng)

            nearestMapInstanceRef.current = map

            // Force rendering recalculation
            setTimeout(() => {
                map.invalidateSize()
                updateNearestMarkers()
            }, 100)

            // Second pass for stability
            setTimeout(() => map.invalidateSize(), 500)
        } catch (err) { console.error(err) }
    }

    const updateNearestMarkers = () => {
        const map = nearestMapInstanceRef.current
        if (!map || !nearestBins) return

        // Update user marker first
        if (userLocation) {
            updateUserMarker(map, userLocation.lat, userLocation.lng)
        }

        nearestMarkersRef.current.forEach(m => map.removeLayer(m))
        nearestMarkersRef.current = []

        nearestBins.forEach(bin => {
            const color = bin.fillLevel >= 80 ? '#ff5252' : bin.fillLevel >= 60 ? '#ffc107' : '#00e676'
            const marker = L.circleMarker([bin.lat, bin.lng], {
                radius: 10,
                fillColor: color,
                color: '#fff',
                weight: 2,
                fillOpacity: 0.9,
            }).addTo(map)
            marker.bindPopup(`<b>${bin.name}</b><br>${bin.distance} km away`)
            nearestMarkersRef.current.push(marker)
        })

        // Fit bounds to show user and bins
        const groupElements = []
        if (userMarkerRef.current) groupElements.push(userMarkerRef.current)
        nearestMarkersRef.current.forEach(m => groupElements.push(m))

        if (groupElements.length > 0) {
            const group = new L.featureGroup(groupElements)
            map.fitBounds(group.getBounds().pad(0.1))
        }
    }

    const updateUserMarker = (map, lat, lng) => {
        if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current)
        }

        userMarkerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'user-location-marker',
                html: '<div class="user-pulse-dot"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            }),
            zIndexOffset: 1000 // Ensure it's on top of bins
        }).addTo(map).bindPopup("<b>Your Current Location</b>")
    }

    const getLevelColor = (level) => {
        switch (level) {
            case 'Gold': return 'var(--accent-amber)'
            case 'Silver': return 'var(--text-secondary)'
            case 'Bronze': return '#cd7f32'
            default: return 'var(--accent-green)'
        }
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>👥 Citizen Participation Portal</h1>
                <p>Report issues, find bins, earn eco-points — community-driven waste intelligence</p>
            </div>

            {/* Community Stats Bar */}
            {ecoData && (
                <div className="dash-stats stagger">
                    <div className="glass-card stat-card green">
                        <div className="stat-icon">👥</div>
                        <div className="stat-value">{ecoData.communityStats.activeCitizens}</div>
                        <div className="stat-label">Active Citizens</div>
                    </div>
                    <div className="glass-card stat-card cyan">
                        <div className="stat-icon">📝</div>
                        <div className="stat-value">{ecoData.communityStats.totalReports}</div>
                        <div className="stat-label">Reports Filed</div>
                    </div>
                    <div className="glass-card stat-card amber">
                        <div className="stat-icon">🗑️</div>
                        <div className="stat-value">{ecoData.communityStats.binsCleaned}</div>
                        <div className="stat-label">Bins Cleaned</div>
                    </div>
                    <div className="glass-card stat-card green">
                        <div className="stat-icon">♻️</div>
                        <div className="stat-value">{ecoData.communityStats.recycledKg} kg</div>
                        <div className="stat-label">Community Recycled</div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="citizen-tabs">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={`citizen-tab ${activeTab === t.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Report Tab */}
            {activeTab === 'report' && (
                <div className="citizen-content stagger">
                    <div className="glass-card citizen-report-form">
                        <div className="card-header">
                            <h3>📝 Report Overflowing Bin</h3>
                        </div>
                        {reportSubmitted ? (
                            <div className="report-success scale-in">
                                <div className="success-icon">✅</div>
                                <h4>Report Submitted Successfully!</h4>
                                <p>You earned <strong>+25 eco-points</strong> for this report</p>
                            </div>
                        ) : (
                            <div className="add-bin-form">
                                <div className="form-group">
                                    <label>Your Name</label>
                                    <input
                                        placeholder="Enter your name"
                                        value={reportForm.reporter}
                                        onChange={e => setReportForm({ ...reportForm, reporter: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Issue Type</label>
                                    <select value={reportForm.type} onChange={e => setReportForm({ ...reportForm, type: e.target.value })}>
                                        <option value="overflow">Overflowing Bin</option>
                                        <option value="damaged">Damaged Bin</option>
                                        <option value="illegal_dump">Illegal Dumping</option>
                                        <option value="missing">Missing Bin</option>
                                        <option value="odor">Bad Odor / Hygiene</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Location</label>
                                    <input
                                        placeholder="e.g. Near Central Park, MG Road"
                                        value={reportForm.location}
                                        onChange={e => setReportForm({ ...reportForm, location: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <input
                                        placeholder="Describe the issue..."
                                        value={reportForm.description}
                                        onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                                    />
                                </div>
                                <button className="generate-route-btn" onClick={submitReport} disabled={submitting}>
                                    {submitting ? '⏳ Submitting...' : '📤 Submit Report (+25 pts)'}
                                </button>
                            </div>
                        )}
                    </div>

                    {ecoData && (
                        <div className="glass-card">
                            <div className="card-header">
                                <h3>📋 Recent Community Reports</h3>
                            </div>
                            <div className="reports-feed">
                                {ecoData.recentReports.map((r, i) => (
                                    <div key={i} className="report-item">
                                        <div className={`report-status-dot ${r.status}`} />
                                        <div className="report-content">
                                            <p>{r.description}</p>
                                            <div className="report-meta">
                                                <span>📍 {r.location}</span>
                                                <span>👤 {r.reporter}</span>
                                                <span className={`report-status-badge ${r.status}`}>
                                                    {r.status === 'resolved' ? '✅ Resolved' : r.status === 'in_progress' ? '🔄 In Progress' : '⏳ Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bin Map Tab */}
            {activeTab === 'map' && (
                <div className="citizen-content full-width">
                    <div className="glass-card map-view-card">
                        <div className="card-header">
                            <h3>🗺️ Smart Bin Map — Coimbatore</h3>
                            <div className="map-legend">
                                <span className="legend-item"><i style={{ background: '#00e676' }}></i> Low</span>
                                <span className="legend-item"><i style={{ background: '#ffc107' }}></i> Warning</span>
                                <span className="legend-item"><i style={{ background: '#ff5252' }}></i> Critical</span>
                            </div>
                        </div>
                        <div className="citizen-map-container" ref={mapRef}></div>
                    </div>
                </div>
            )}

            {/* Find Nearest Tab */}
            {activeTab === 'find' && (
                <div className="citizen-content full-width">
                    <div className="glass-card">
                        <div className="card-header">
                            <h3>📍 Find Nearest Smart Bins</h3>
                            <button className="generate-route-btn" onClick={handleFindNearest} disabled={findingBins}>
                                {findingBins ? '🔄 Searching...' : '🔍 Find Nearby Bins'}
                            </button>
                            <small className="location-accuracy-hint">📍 GPS accuracy depends on your device</small>
                        </div>
                        {nearestBins ? (
                            <div className="nearest-view-layout">
                                <div className="nearest-bins-list stagger">
                                    {nearestBins.map((b, i) => (
                                        <div key={b.id} className="nearest-bin-card">
                                            <div className="nearest-rank">#{i + 1}</div>
                                            <div className="nearest-info">
                                                <h4>{b.name}</h4>
                                                <p>{b.location}</p>
                                                <div className="nearest-meta">
                                                    <span className={`bin-status-badge ${b.status}`}>{b.status}</span>
                                                    <span>Fill: {b.fillLevel}%</span>
                                                    <span>📏 {b.distance} km away</span>
                                                </div>
                                            </div>
                                            <div className="nearest-fill">
                                                <div className="nearest-fill-circle" style={{
                                                    background: `conic-gradient(${b.fillLevel >= 80 ? 'var(--accent-red)' : b.fillLevel >= 60 ? 'var(--accent-amber)' : 'var(--accent-green)'} ${b.fillLevel * 3.6}deg, rgba(255,255,255,0.06) 0deg)`
                                                }}>
                                                    <span>{b.fillLevel}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="nearest-map-container" ref={nearestMapRef}></div>
                            </div>
                        ) : (
                            <div className="find-placeholder">
                                <div className="placeholder-icon">📍</div>
                                <p>Click "Find Nearby Bins" to locate the closest smart bins to your location using GPS</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Eco-Points Tab */}
            {activeTab === 'ecopoints' && ecoData && (
                <div className="citizen-content full-width">
                    <div className="glass-card">
                        <div className="card-header">
                            <h3>🏆 Eco-Points Leaderboard</h3>
                            <span className="card-badge badge-amber">Top Citizens</span>
                        </div>
                        <div className="leaderboard stagger">
                            {ecoData.leaderboard.map((user, i) => (
                                <div key={i} className={`leaderboard-row ${i < 3 ? 'top-three' : ''}`}>
                                    <div className="lb-rank">
                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                    </div>
                                    <div className="lb-info">
                                        <span className="lb-name">{user.name}</span>
                                        <span className="lb-level" style={{ color: getLevelColor(user.level) }}>{user.level}</span>
                                    </div>
                                    <div className="lb-stats">
                                        <span>{user.reports} reports</span>
                                        <span>{user.recycled_kg} kg recycled</span>
                                    </div>
                                    <div className="lb-points">{user.points.toLocaleString()} pts</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="glass-card eco-how-it-works">
                        <div className="card-header"><h3>⭐ How to Earn Eco-Points</h3></div>
                        <div className="eco-ways">
                            <div className="eco-way"><span className="eco-way-pts">+25</span><span>Report an overflowing bin</span></div>
                            <div className="eco-way"><span className="eco-way-pts">+50</span><span>Recycling drop-off at smart bin</span></div>
                            <div className="eco-way"><span className="eco-way-pts">+10</span><span>Daily login streak bonus</span></div>
                            <div className="eco-way"><span className="eco-way-pts">+100</span><span>Organize community clean-up</span></div>
                            <div className="eco-way"><span className="eco-way-pts">+15</span><span>Correct waste segregation</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recycling Tips Tab */}
            {activeTab === 'tips' && ecoData && (
                <div className="citizen-content">
                    <div className="recycling-tips-grid stagger">
                        {ecoData.recyclingTips.map((tip, i) => (
                            <div key={i} className="glass-card recycling-tip-card">
                                <div className="tip-icon">{tip.icon}</div>
                                <h4>{tip.type}</h4>
                                <p className="tip-instruction">{tip.tip}</p>
                                <div className="tip-fact">
                                    <span>💡</span>
                                    <span>{tip.fact}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default CitizenPortal
