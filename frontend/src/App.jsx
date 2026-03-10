import { useState } from 'react'
import './App.css'
import LoginPage from './components/LoginPage'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import SmartBins from './components/SmartBins'
import WasteRecognition from './components/WasteRecognition'
import RouteOptimization from './components/RouteOptimization'
import WasteHotspots from './components/WasteHotspots'
import CircularEconomy from './components/CircularEconomy'
import CitizenPortal from './components/CitizenPortal'
import DigitalTwin from './components/DigitalTwin'
import CleaningAssistant from './components/CleaningAssistant'
import ReportsManager from './components/ReportsManager'

const API_BASE = 'http://localhost:5000/api'

function App() {
  const [userRole, setUserRole] = useState(null) // 'government' | 'citizen' | null
  const [userName, setUserName] = useState('')
  const [activePage, setActivePage] = useState('dashboard')

  const handleLogin = (role, name) => {
    setUserRole(role)
    setUserName(name)
    // Set default page based on role
    setActivePage(role === 'citizen' ? 'citizen' : 'dashboard')
  }

  const handleLogout = () => {
    setUserRole(null)
    setUserName('')
    setActivePage('dashboard')
  }

  // Show login page if not authenticated
  if (!userRole) {
    return <LoginPage onLogin={handleLogin} />
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard apiBase={API_BASE} />
      case 'bins':
        return userRole === 'government' ? <SmartBins apiBase={API_BASE} /> : <Dashboard apiBase={API_BASE} />
      case 'recognition':
        return userRole === 'government' ? <WasteRecognition apiBase={API_BASE} /> : <Dashboard apiBase={API_BASE} />
      case 'routes':
        return userRole === 'government' ? <RouteOptimization apiBase={API_BASE} /> : <Dashboard apiBase={API_BASE} />
      case 'hotspots':
        return userRole === 'government' ? <WasteHotspots apiBase={API_BASE} /> : <Dashboard apiBase={API_BASE} />
      case 'circular':
        return userRole === 'government' ? <CircularEconomy apiBase={API_BASE} /> : <Dashboard apiBase={API_BASE} />
      case 'reports':
        return userRole === 'government' ? <ReportsManager apiBase={API_BASE} /> : <Dashboard apiBase={API_BASE} />
      case 'citizen':
        return <CitizenPortal apiBase={API_BASE} userName={userName} />
      case 'digital-twin':
        return userRole === 'government' ? <DigitalTwin apiBase={API_BASE} /> : <Dashboard apiBase={API_BASE} />
      case 'assistant':
        return <CleaningAssistant apiBase={API_BASE} />
      default:
        return <Dashboard apiBase={API_BASE} />
    }
  }

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        userRole={userRole}
        userName={userName}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
