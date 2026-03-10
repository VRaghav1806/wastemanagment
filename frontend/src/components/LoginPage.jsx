import { useState } from 'react'

function LoginPage({ onLogin }) {
    const [selectedPortal, setSelectedPortal] = useState(null)
    const [isRegister, setIsRegister] = useState(false)
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleAction = async (e) => {
        e.preventDefault()
        if (!selectedPortal) { setError('Please select a portal'); return }

        if (isRegister) {
            if (!username.trim() || !password.trim() || !email.trim()) { setError('Fill all fields'); return }
            if (password !== confirmPassword) { setError('Passwords do not match'); return }

            setLoading(true); setError('')
            try {
                const response = await fetch('http://localhost:5000/api/citizen/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username.trim(), email: email.trim() })
                })
                const data = await response.json()
                if (response.ok) {
                    onLogin('citizen', data.username)
                } else {
                    setError(data.error || 'Registration failed')
                }
            } catch (err) {
                setError('Connection error')
            } finally {
                setLoading(false)
            }
        } else {
            if (!username.trim() || !password.trim()) { setError('Enter username & password'); return }
            setLoading(true); setError('')
            // Simulate login
            setTimeout(() => {
                onLogin(selectedPortal, username.trim())
                setLoading(false)
            }, 600)
        }
    }

    return (
        <div className="login-page">
            <div className="login-bg-orb orb-1"></div>
            <div className="login-bg-orb orb-2"></div>

            <div className="login-container fade-in">
                {/* Compact Header */}
                <div className="login-header">
                    <span className="login-brand-icon">♻️</span>
                    <h1>CircularWaste Intelligence</h1>
                    <p>Coimbatore Smart Waste Management Platform</p>
                </div>

                {/* Main content: portals + form in a row-like layout */}
                <div className="login-body">
                    {/* Portal Cards */}
                    <div className="portal-cards">
                        <div
                            className={`portal-card ${selectedPortal === 'government' ? 'selected govt' : ''}`}
                            onClick={() => { setSelectedPortal('government'); setError('') }}
                        >
                            <div className="portal-card-top">
                                <span className="portal-icon">🏛️</span>
                                <div>
                                    <h3>Government Portal</h3>
                                    <span className="portal-subtitle">Municipal Administration</span>
                                </div>
                            </div>
                            <div className="portal-features">
                                {['Dashboard', 'Smart Bins', 'Routes', 'Hotspots', 'Digital Twin', 'AI'].map(f =>
                                    <span key={f} className="ptag">✓ {f}</span>
                                )}
                            </div>
                            {selectedPortal === 'government' && <div className="portal-check">✓</div>}
                        </div>

                        <div
                            className={`portal-card ${selectedPortal === 'citizen' ? 'selected ctzn' : ''}`}
                            onClick={() => { setSelectedPortal('citizen'); setError('') }}
                        >
                            <div className="portal-card-top">
                                <span className="portal-icon">👥</span>
                                <div>
                                    <h3>Citizen Portal</h3>
                                    <span className="portal-subtitle">Public Community Access</span>
                                </div>
                            </div>
                            <div className="portal-features">
                                {['Report Issues', 'Find Bins', 'Eco-Points', 'Recycling Tips', 'AI Assistant'].map(f =>
                                    <span key={f} className="ptag">✓ {f}</span>
                                )}
                            </div>
                            {selectedPortal === 'citizen' && <div className="portal-check">✓</div>}
                        </div>
                    </div>

                    {/* Login/Register Form */}
                    <form className="login-form" onSubmit={handleAction}>
                        <div className="login-input-group">
                            <label>👤 Username</label>
                            <input type="text" placeholder={selectedPortal === 'government' ? 'Officer ID' : 'Citizen name'}
                                value={username} onChange={e => setUsername(e.target.value)} className="login-input" />
                        </div>
                        {isRegister && (
                            <div className="login-input-group">
                                <label>📧 Email Address</label>
                                <input type="email" placeholder="citizen@example.com"
                                    value={email} onChange={e => setEmail(e.target.value)} className="login-input" />
                            </div>
                        )}
                        <div className="login-input-group">
                            <label>🔒 Password</label>
                            <input type="password" placeholder="Password"
                                value={password} onChange={e => setPassword(e.target.value)} className="login-input" />
                        </div>
                        {isRegister && (
                            <div className="login-input-group">
                                <label>🔒 Confirm Password</label>
                                <input type="password" placeholder="Confirm Password"
                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="login-input" />
                            </div>
                        )}
                        {error && <div className="login-error">{error}</div>}
                        <button type="submit" className="login-btn" disabled={loading || !selectedPortal}
                            style={{
                                background: selectedPortal === 'government' ? '#00e676' : selectedPortal === 'citizen' ? '#bb86fc' : 'rgba(255,255,255,0.08)',
                                color: selectedPortal ? '#000' : 'var(--text-muted)',
                            }}>
                            {loading ? (isRegister ? '⏳ Registering...' : '⏳ Signing in...') :
                                selectedPortal ? (isRegister ? '✨ Create Account' : '🚀 Enter Platform') : 'Select a portal'}
                        </button>

                        {selectedPortal === 'citizen' && (
                            <div className="login-toggle" style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>
                                    {isRegister ? 'Already have an account? ' : 'Need an account? '}
                                </span>
                                <button type="button" onClick={() => { setIsRegister(!isRegister); setError('') }}
                                    style={{ background: 'none', border: 'none', color: '#bb86fc', cursor: 'pointer', fontWeight: 'bold' }}>
                                    {isRegister ? 'Login' : 'Register'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                <p className="login-footer-text">🏙️ Coimbatore Corporation • Smart City Initiative</p>
            </div>
        </div>
    )
}

export default LoginPage
