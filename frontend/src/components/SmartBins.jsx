import { useEffect, useState, useRef } from 'react'

function SmartBins({ apiBase }) {
    const [bins, setBins] = useState([])
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)
    const [showUpload, setShowUpload] = useState(null)
    const [showAddBin, setShowAddBin] = useState(false)
    const [uploadPreview, setUploadPreview] = useState(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState(null)
    const [selectedFile, setSelectedFile] = useState(null)
    const [showDetails, setShowDetails] = useState(null)
    const fileInputRef = useRef(null)
    const detailMapRef = useRef(null)
    const detailMapInstanceRef = useRef(null)

    const [newBin, setNewBin] = useState({
        name: '', location: '', wasteType: 'Mixed', zone: 'Zone 1'
    })

    useEffect(() => {
        fetchBins()
    }, [filter])

    const fetchBins = async () => {
        try {
            const url = filter === 'all' ? `${apiBase}/bins` : `${apiBase}/bins?status=${filter}`
            const res = await fetch(url)
            const json = await res.json()
            setBins(json)
            setLoading(false)
        } catch (err) {
            console.error('Failed to fetch bins:', err)
            setLoading(false)
        }
    }

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            setSelectedFile(file)
            const reader = new FileReader()
            reader.onload = (ev) => setUploadPreview(ev.target.result)
            reader.readAsDataURL(file)
            setAnalysisResult(null)
        }
    }

    const handleAnalyze = async () => {
        if (!selectedFile) return
        setAnalyzing(true)

        try {
            const formData = new FormData()
            formData.append('photo', selectedFile)

            const res = await fetch(`${apiBase}/analyze-photo`, {
                method: 'POST',
                body: formData
            })
            const result = await res.json()
            setAnalysisResult(result)

            // Update the bin with analyzed fill level
            if (showUpload) {
                await fetch(`${apiBase}/bins/${showUpload}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fillLevel: result.fillLevel })
                })
                fetchBins()
            }
        } catch (err) {
            console.error('Analysis failed:', err)
        }
        setAnalyzing(false)
    }

    const closeUpload = () => {
        setShowUpload(null)
        setUploadPreview(null)
        setAnalysisResult(null)
        setSelectedFile(null)
        setAnalyzing(false)
    }

    const handleAddBin = async () => {
        try {
            await fetch(`${apiBase}/bins`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBin)
            })
            setShowAddBin(false)
            setNewBin({ name: '', location: '', wasteType: 'Mixed', zone: 'Zone 1' })
            fetchBins()
        } catch (err) {
            console.error('Failed to add bin:', err)
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'critical': return 'var(--accent-red)'
            case 'warning': return 'var(--accent-amber)'
            case 'moderate': return 'var(--accent-cyan)'
            default: return 'var(--accent-green)'
        }
    }

    const handleDeleteBin = async (id) => {
        if (!window.confirm('Are you sure you want to delete this bin? This action cannot be undone.')) return
        try {
            await fetch(`${apiBase}/bins/${id}`, { method: 'DELETE' })
            setShowDetails(null)
            fetchBins()
        } catch (err) {
            console.error('Failed to delete bin:', err)
        }
    }

    useEffect(() => {
        const mainContent = document.querySelector('.main-content')
        if (showDetails || showUpload || showAddBin) {
            document.body.style.overflow = 'hidden'
            if (mainContent) mainContent.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
            if (mainContent) mainContent.style.overflow = 'auto'
        }
        return () => {
            document.body.style.overflow = 'unset'
            if (mainContent) mainContent.style.overflow = 'auto'
        }
    }, [showDetails, showUpload, showAddBin])

    useEffect(() => {
        if (showDetails && detailMapRef.current) {
            if (detailMapInstanceRef.current) {
                detailMapInstanceRef.current.remove()
            }

            const map = L.map(detailMapRef.current, {
                center: [showDetails.lat, showDetails.lng],
                zoom: 15,
                zoomControl: false,
                attributionControl: false
            })

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map)

            const icon = L.divIcon({
                className: 'custom-bin-marker',
                html: `<div class="marker-pin ${showDetails.status}"></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })

            L.marker([showDetails.lat, showDetails.lng], { icon }).addTo(map)
            detailMapInstanceRef.current = map

            setTimeout(() => map.invalidateSize(), 200)
        }
        return () => {
            if (detailMapInstanceRef.current) {
                detailMapInstanceRef.current.remove()
                detailMapInstanceRef.current = null
            }
        }
    }, [showDetails])

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>🗑️ Smart Bins</h1>
                <p>Monitor and manage all waste bins across the city — upload photos to detect fill levels</p>
            </div>

            <div className="bins-toolbar">
                <div className="filter-group">
                    {['all', 'critical', 'warning', 'moderate', 'low'].map(f => (
                        <button
                            key={f}
                            className={`filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? '🔵 All' :
                                f === 'critical' ? '🔴 Critical' :
                                    f === 'warning' ? '🟡 Warning' :
                                        f === 'moderate' ? '🔵 Moderate' : '🟢 Low'}
                        </button>
                    ))}
                </div>
                <button className="add-bin-btn" onClick={() => setShowAddBin(true)}>
                    ➕ Add New Bin
                </button>
            </div>

            <div className="bins-grid stagger">
                {bins.map(bin => (
                    <div className="glass-card bin-card" key={bin.id}>
                        <div className="bin-card-header">
                            <div>
                                <h3>{bin.name}</h3>
                                <div className="bin-location">📍 {bin.location}</div>
                            </div>
                            <span className={`bin-status-badge ${bin.status}`}>
                                {bin.status}
                            </span>
                        </div>

                        <div className="fill-bar-container">
                            <div className="fill-bar-header">
                                <span>Fill Level</span>
                                <strong style={{ color: getStatusColor(bin.status) }}>
                                    {bin.fillLevel}%
                                </strong>
                            </div>
                            <div className="fill-bar">
                                <div
                                    className={`fill-bar-inner ${bin.status}`}
                                    style={{ width: `${bin.fillLevel}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="bin-meta">
                            <span>🏷️ {bin.wasteType}</span>
                            <span>📍 {bin.zone}</span>
                            <span>🕐 {new Date(bin.lastCleaned).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="bin-actions">
                            <button
                                className="bin-action-btn primary"
                                onClick={() => {
                                    setShowUpload(bin.id)
                                    setUploadPreview(null)
                                    setAnalysisResult(null)
                                    setSelectedFile(null)
                                }}
                            >
                                📸 Upload Photo
                            </button>
                            <button
                                className="bin-action-btn"
                                onClick={() => setShowDetails(bin)}
                            >
                                📋 Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bin Details Modal */}
            {showDetails && (
                <div className="photo-upload-overlay" onClick={() => setShowDetails(null)}>
                    <div className="photo-upload-modal bin-details-modal" onClick={e => e.stopPropagation()}>
                        <div className="details-header">
                            <div>
                                <h2>{showDetails.name}</h2>
                                <p className="subtitle">Detailed monitoring & management</p>
                            </div>
                            <span className={`bin-status-badge ${showDetails.status}`}>
                                {showDetails.status.toUpperCase()}
                            </span>
                        </div>

                        <div className="details-body">
                            <div className="details-main-info">
                                <div className="detail-map-box">
                                    <div ref={detailMapRef} className="mini-detail-map"></div>
                                    <div className="map-coords">
                                        <span>Lat: {showDetails.lat.toFixed(4)}</span>
                                        <span>Lng: {showDetails.lng.toFixed(4)}</span>
                                    </div>
                                </div>

                                <div className="details-stats-grid">
                                    <div className="detail-stat-item">
                                        <span className="label">Zone</span>
                                        <span className="value">{showDetails.zone}</span>
                                    </div>
                                    <div className="detail-stat-item">
                                        <span className="label">Waste Type</span>
                                        <span className="value">{showDetails.wasteType}</span>
                                    </div>
                                    <div className="detail-stat-item">
                                        <span className="label">Last Cleaned</span>
                                        <span className="value">
                                            {new Date(showDetails.lastCleaned).toLocaleDateString()} at{' '}
                                            {new Date(showDetails.lastCleaned).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="detail-stat-item">
                                        <span className="label">Fill Level</span>
                                        <span className="value" style={{ color: getStatusColor(showDetails.status) }}>
                                            {showDetails.fillLevel}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions-spaced">
                            <button
                                className="modal-btn delete"
                                onClick={() => handleDeleteBin(showDetails.id)}
                            >
                                🗑️ Delete Bin
                            </button>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="modal-btn cancel" onClick={() => setShowDetails(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Upload Modal */}
            {showUpload && (
                <div className="photo-upload-overlay" onClick={closeUpload}>
                    <div className="photo-upload-modal" onClick={e => e.stopPropagation()}>
                        <h2>📸 Analyze Waste Bin Photo</h2>
                        <p className="subtitle">
                            Upload a photo of the waste bin. Our AI will analyze the fill level and waste composition.
                        </p>

                        {!uploadPreview ? (
                            <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                                <div className="upload-icon">📤</div>
                                <p>Click to upload a photo</p>
                                <p className="upload-hint">Supports JPG, PNG, WEBP — Max 10MB</p>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <img src={uploadPreview} className="preview-image" alt="Bin preview" />
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handlePhotoSelect}
                        />

                        {analyzing && (
                            <div className="analyzing">
                                <div className="spinner"></div>
                                <p>🔬 AI is analyzing the waste bin...</p>
                            </div>
                        )}

                        {analysisResult && !analyzing && (
                            <div className="analysis-result fade-in">
                                <h4>🧠 AI Analysis Result</h4>
                                <div className="analysis-row">
                                    <span className="label">Fill Level</span>
                                    <strong style={{ color: getStatusColor(analysisResult.status) }}>
                                        {analysisResult.fillLevel}%
                                    </strong>
                                </div>
                                <div className="analysis-row">
                                    <span className="label">Status</span>
                                    <span className={`bin-status-badge ${analysisResult.status}`}>
                                        {analysisResult.status}
                                    </span>
                                </div>
                                <div className="analysis-row">
                                    <span className="label">Waste Types</span>
                                    <span>{analysisResult.wasteTypesDetected.join(', ')}</span>
                                </div>
                                <div className="analysis-row">
                                    <span className="label">Confidence</span>
                                    <span>{(analysisResult.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <div className="analysis-row">
                                    <span className="label">Recommendation</span>
                                    <span>{analysisResult.recommendation}</span>
                                </div>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={closeUpload}>Close</button>
                            {uploadPreview && !analysisResult && !analyzing && (
                                <button className="modal-btn confirm" onClick={handleAnalyze}>
                                    🔍 Analyze Photo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Bin Modal */}
            {showAddBin && (
                <div className="photo-upload-overlay" onClick={() => setShowAddBin(false)}>
                    <div className="photo-upload-modal" onClick={e => e.stopPropagation()}>
                        <h2>➕ Add New Smart Bin</h2>
                        <p className="subtitle">Register a new waste bin in the monitoring system.</p>

                        <div className="add-bin-form">
                            <div className="form-group">
                                <label>Bin Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Central Park Bin B"
                                    value={newBin.name}
                                    onChange={e => setNewBin({ ...newBin, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Central Park, Zone 1"
                                    value={newBin.location}
                                    onChange={e => setNewBin({ ...newBin, location: e.target.value })}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Waste Type</label>
                                    <select
                                        value={newBin.wasteType}
                                        onChange={e => setNewBin({ ...newBin, wasteType: e.target.value })}
                                    >
                                        <option>Mixed</option>
                                        <option>Organic</option>
                                        <option>Recyclable</option>
                                        <option>Hazardous</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Zone</label>
                                    <select
                                        value={newBin.zone}
                                        onChange={e => setNewBin({ ...newBin, zone: e.target.value })}
                                    >
                                        <option>Zone 1</option>
                                        <option>Zone 2</option>
                                        <option>Zone 3</option>
                                        <option>Zone 4</option>
                                        <option>Zone 5</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => setShowAddBin(false)}>Cancel</button>
                            <button className="modal-btn confirm" onClick={handleAddBin}>
                                ✅ Add Bin
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SmartBins
