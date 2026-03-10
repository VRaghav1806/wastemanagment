function Sidebar({ activePage, onNavigate, userRole, userName, onLogout }) {
    const allNavItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard', roles: ['government', 'citizen'] },
        { id: 'bins', icon: '🗑️', label: 'Smart Bins', roles: ['government'] },
        { id: 'recognition', icon: '📸', label: 'Waste Recognition', roles: ['government'] },
        { id: 'routes', icon: '🗺️', label: 'Route Optimization', roles: ['government'] },
        { id: 'hotspots', icon: '🔥', label: 'Waste Hotspots', roles: ['government'] },
        { id: 'circular', icon: '♻️', label: 'Circular Economy', roles: ['government'] },
        { id: 'reports', icon: '📋', label: 'Reports Management', roles: ['government'] },
        { id: 'citizen', icon: '👥', label: 'Citizen Portal', roles: ['citizen'] },
        { id: 'digital-twin', icon: '🏙️', label: 'Digital Twin', roles: ['government'] },
        { id: 'assistant', icon: '🤖', label: 'AI Assistant', roles: ['government', 'citizen'] },
    ]

    const navItems = allNavItems.filter(item => item.roles.includes(userRole))

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-icon">♻️</div>
                <div className="brand-text">
                    <h2>CircularWaste</h2>
                    <span>Intelligence Platform</span>
                </div>
            </div>

            {/* User info badge */}
            <div className="sidebar-user-badge">
                <div className="user-avatar" style={{
                    background: userRole === 'government'
                        ? 'linear-gradient(135deg, #00e676, #00bcd4)'
                        : 'linear-gradient(135deg, #bb86fc, #9c27b0)'
                }}>
                    {userRole === 'government' ? '🏛️' : '👤'}
                </div>
                <div className="user-info">
                    <span className="user-name">{userName}</span>
                    <span className="user-role">
                        {userRole === 'government' ? 'Government Officer' : 'Citizen'}
                    </span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <div
                        key={item.id}
                        className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="system-status">
                    <div className="status-dot"></div>
                    <span>System Online • AI Active</span>
                </div>
                <button className="logout-btn" onClick={onLogout}>
                    🚪 Logout
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
