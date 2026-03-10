import { useState, useRef } from 'react'

function WasteRecognition({ apiBase }) {
    const [photo, setPhoto] = useState(null)
    const [preview, setPreview] = useState(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [result, setResult] = useState(null)
    const fileRef = useRef()
    const canvasRef = useRef()

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            setPhoto(file)
            setPreview(URL.createObjectURL(file))
            setResult(null)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) {
            setPhoto(file)
            setPreview(URL.createObjectURL(file))
            setResult(null)
        }
    }

    const analyzeWaste = async () => {
        if (!photo) return
        setAnalyzing(true)
        const formData = new FormData()
        formData.append('photo', photo)
        try {
            const res = await fetch(`${apiBase}/ai/waste-recognition`, { method: 'POST', body: formData })
            const data = await res.json()
            setResult(data)
            drawCompositionChart(data.composition)
        } catch (err) {
            console.error(err)
        }
        setAnalyzing(false)
    }

    const drawCompositionChart = (composition) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const w = canvas.width = 280
        const h = canvas.height = 280
        ctx.clearRect(0, 0, w, h)

        const colors = {
            'Plastic': '#00e676', 'Organic': '#ffc107', 'Paper': '#00bcd4',
            'Metal': '#b388ff', 'Glass': '#ff5252'
        }
        const cx = w / 2, cy = h / 2, r = 100
        let startAngle = -Math.PI / 2
        const entries = Object.entries(composition)

        entries.forEach(([type, pct]) => {
            const sliceAngle = (pct / 100) * Math.PI * 2
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle)
            ctx.closePath()
            ctx.fillStyle = colors[type] || '#666'
            ctx.fill()

            // Inner cutout for donut
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.arc(cx, cy, r * 0.55, startAngle, startAngle + sliceAngle)
            ctx.closePath()
            ctx.fillStyle = '#111827'
            ctx.fill()

            // Label
            const midAngle = startAngle + sliceAngle / 2
            const lx = cx + Math.cos(midAngle) * (r * 0.8)
            const ly = cy + Math.sin(midAngle) * (r * 0.8)
            ctx.fillStyle = '#f1f5f9'
            ctx.font = 'bold 11px Inter'
            ctx.textAlign = 'center'
            ctx.fillText(`${pct}%`, lx, ly)

            startAngle += sliceAngle
        })

        // Center text
        ctx.fillStyle = '#f1f5f9'
        ctx.font = 'bold 14px Inter'
        ctx.textAlign = 'center'
        ctx.fillText('Waste', cx, cy - 6)
        ctx.font = '11px Inter'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText('Composition', cx, cy + 12)
    }

    const resetAnalysis = () => {
        setPhoto(null)
        setPreview(null)
        setResult(null)
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>📸 AI Waste Type Recognition</h1>
                <p>Smart sorting powered by AI — detect waste types, get recycling instructions</p>
            </div>

            <div className="recognition-layout">
                <div className="recognition-upload-section glass-card">
                    <div className="card-header">
                        <h3>📷 Upload Waste Image</h3>
                        {result && <button className="reset-btn" onClick={resetAnalysis}>🔄 New Analysis</button>}
                    </div>

                    {!preview ? (
                        <div
                            className="upload-zone recognition-dropzone"
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                            onClick={() => fileRef.current.click()}
                        >
                            <input type="file" accept="image/*" ref={fileRef} onChange={handlePhotoSelect} hidden />
                            <div className="upload-icon">📸</div>
                            <p>Drop an image of waste here or click to upload</p>
                            <span className="upload-hint">AI will detect and classify waste types automatically</span>
                        </div>
                    ) : (
                        <div className="recognition-preview">
                            <img src={preview} alt="Waste" className="preview-image recognition-img" />
                            {!analyzing && !result && (
                                <button className="generate-route-btn" onClick={analyzeWaste}>
                                    🧠 Analyze with AI
                                </button>
                            )}
                            {analyzing && (
                                <div className="analyzing">
                                    <div className="spinner" />
                                    <p>AI scanning waste composition...</p>
                                    <div className="ai-scan-progress">
                                        <div className="scan-bar" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {result && (
                    <>
                        <div className="recognition-chart-section glass-card scale-in">
                            <div className="card-header">
                                <h3>🔬 Composition Breakdown</h3>
                                <span className="card-badge badge-green">{result.confidence * 100}% Confidence</span>
                            </div>
                            <div className="chart-center">
                                <canvas ref={canvasRef} />
                            </div>
                            <div className="composition-legend">
                                {Object.entries(result.composition).map(([type, pct]) => (
                                    <div key={type} className="legend-item">
                                        <span className={`legend-dot legend-${type.toLowerCase()}`} />
                                        <span className="legend-label">{type}</span>
                                        <span className="legend-value">{pct}%</span>
                                    </div>
                                ))}
                            </div>
                            <div className="recognition-summary-row">
                                <div className="rec-sum-item">
                                    <span className="rec-sum-label">Total Weight</span>
                                    <span className="rec-sum-value">{result.totalWeight}</span>
                                </div>
                                <div className="rec-sum-item">
                                    <span className="rec-sum-label">Est. Value</span>
                                    <span className="rec-sum-value green">{result.estimatedValue}</span>
                                </div>
                                <div className="rec-sum-item">
                                    <span className="rec-sum-label">Recyclability</span>
                                    <span className="rec-sum-value cyan">{result.overallRecyclability}%</span>
                                </div>
                                <div className="rec-sum-item">
                                    <span className="rec-sum-label">CE Score</span>
                                    <span className="rec-sum-value amber">{result.circularEconomyScore}</span>
                                </div>
                            </div>
                        </div>

                        <div className="recognition-instructions glass-card scale-in">
                            <div className="card-header">
                                <h3>♻️ Recycling Instructions</h3>
                            </div>
                            <div className="instruction-cards stagger">
                                {Object.entries(result.recyclingInstructions).map(([type, info]) => (
                                    <div key={type} className={`instruction-card instruction-${type.toLowerCase()}`}>
                                        <div className="inst-header">
                                            <span className="inst-type">{type}</span>
                                            <span className="inst-value">₹{info.value_per_kg}/kg</span>
                                        </div>
                                        <p className="inst-text">{info.instruction}</p>
                                        <div className="inst-dest">
                                            <span>📍</span>
                                            <span>{info.destination}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {!result && (
                <div className="recognition-benefits stagger">
                    <div className="glass-card benefit-card">
                        <div className="benefit-icon">🧴</div>
                        <h4>Plastic Detection</h4>
                        <p>AI identifies PET, HDPE, PVC, and other plastic types for targeted recycling</p>
                    </div>
                    <div className="glass-card benefit-card">
                        <div className="benefit-icon">🍌</div>
                        <h4>Organic Waste</h4>
                        <p>Detects food waste, garden waste, and biodegradable materials for composting</p>
                    </div>
                    <div className="glass-card benefit-card">
                        <div className="benefit-icon">🥫</div>
                        <h4>Metal Recognition</h4>
                        <p>Identifies aluminum, steel, and copper materials for scrap recovery</p>
                    </div>
                    <div className="glass-card benefit-card">
                        <div className="benefit-icon">📄</div>
                        <h4>Paper & Cardboard</h4>
                        <p>Separates recyclable paper from contaminated waste for mill processing</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default WasteRecognition
