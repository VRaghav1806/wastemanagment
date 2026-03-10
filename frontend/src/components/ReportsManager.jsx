import { useState, useEffect } from 'react'

function ReportsManager({ apiBase }) {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // 'all', 'pending', 'resolved'

    useEffect(() => {
        fetchReports()
    }, [])

    const fetchReports = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${apiBase}/admin/reports`)
            const data = await res.json()
            setReports(data.reverse()) // Latest first
        } catch (err) {
            console.error('Failed to fetch reports:', err)
        }
        setLoading(false)
    }

    const resolveReport = async (id) => {
        try {
            const res = await fetch(`${apiBase}/admin/reports/${id}/resolve`, {
                method: 'PATCH'
            })
            if (res.ok) {
                // Update local state
                setReports(prev => prev.map(r =>
                    r.id === id ? { ...r, status: 'resolved', resolved_at: new Date().toISOString() } : r
                ))
            }
        } catch (err) {
            console.error('Failed to resolve report:', err)
        }
    }

    const filteredReports = reports.filter(r => {
        if (filter === 'all') return true
        return r.status === filter
    })

    const getStatusBadge = (status) => {
        switch (status) {
            case 'resolved': return <span className="report-status-badge resolved">✅ Resolved</span>
            case 'pending': return <span className="report-status-badge pending">⏳ Pending</span>
            default: return <span className="report-status-badge pending">{status}</span>
        }
    }

    const getTypeIcon = (type) => {
        switch (type) {
            case 'overflow': return '🗑️'
            case 'damaged': return '🛠️'
            case 'illegal_dump': return '🚫'
            case 'missing': return '❓'
            case 'odor': return '👃'
            default: return '📝'
        }
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>📋 Citizen Reports Management</h1>
                <p>Monitor and resolve issues reported by the Coimbatore community</p>
            </div>

            <div className="reports-controls">
                <div className="glass-card filter-card">
                    <div className="filter-group">
                        <label>Filter by Status:</label>
                        <div className="filter-buttons">
                            <button
                                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                All ({reports.length})
                            </button>
                            <button
                                className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                                onClick={() => setFilter('pending')}
                            >
                                Pending ({reports.filter(r => r.status === 'pending').length})
                            </button>
                            <button
                                className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`}
                                onClick={() => setFilter('resolved')}
                            >
                                Resolved ({reports.filter(r => r.status === 'resolved').length})
                            </button>
                        </div>
                    </div>
                </div>
                <button className="refresh-btn" onClick={fetchReports} disabled={loading}>
                    {loading ? '🔄' : '🔃'} Refresh Data
                </button>
            </div>

            <div className="reports-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading citizen reports...</p>
                    </div>
                ) : filteredReports.length > 0 ? (
                    <div className="reports-grid stagger">
                        {filteredReports.map(report => (
                            <div key={report.id} className={`glass-card report-card-admin ${report.status}`}>
                                <div className="report-card-header">
                                    <div className="report-type-tag">
                                        <span>{getTypeIcon(report.type)}</span>
                                        <span>{report.type.replace('_', ' ').toUpperCase()}</span>
                                    </div>
                                    {getStatusBadge(report.status)}
                                </div>

                                <div className="report-card-body">
                                    <p className="report-desc-text">"{report.description}"</p>
                                    <div className="report-info-grid">
                                        <div className="info-item">
                                            <span className="info-label">📍 Location</span>
                                            <span className="info-value">{report.location}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">👤 Reported by</span>
                                            <span className="info-value">{report.reporter}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">⏰ Reported at</span>
                                            <span className="info-value">
                                                {new Date(report.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        {report.resolved_at && (
                                            <div className="info-item">
                                                <span className="info-label">✨ Resolved at</span>
                                                <span className="info-value resolved-text">
                                                    {new Date(report.resolved_at).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="report-card-footer">
                                    {report.status === 'pending' ? (
                                        <button
                                            className="action-btn resolve-btn"
                                            onClick={() => resolveReport(report.id)}
                                        >
                                            ✅ Mark as Resolved
                                        </button>
                                    ) : (
                                        <div className="resolved-status">
                                            <span>Issue successfully addressed</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state glass-card">
                        <div className="empty-icon">📭</div>
                        <h3>No reports found</h3>
                        <p>Try changing your filter or check back later for new citizen reports.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ReportsManager
