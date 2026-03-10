import { useState, useRef, useEffect } from 'react'

function CleaningAssistant({ apiBase }) {
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: "👋 Hello! I'm your **Circular Waste Intelligence Assistant**. I can help you with:\n\n• 🗑️ Finding bins that need cleaning\n• 🗺️ Generating optimal collection routes\n• 📊 System status and reports\n• 🔥 Waste hotspot predictions\n• ♻️ Recycling intelligence & circular economy\n• 👥 Citizen eco-points & community stats\n• 🏙️ Digital twin simulations\n• 📍 Zone-wise analysis\n\nJust ask me anything about your waste management system!",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isTyping])

    const quickChips = [
        '🗑️ Which bins need cleaning?',
        '🗺️ Best route today?',
        '📊 System overview',
        '🔥 Hotspot predictions',
        '♻️ Recycling report',
        '👥 Eco-points info',
        '🏙️ Digital twin status',
        '📍 Zone summary',
        '📅 Weekly schedule',
    ]

    const sendMessage = async (text) => {
        if (!text.trim()) return

        const userMsg = {
            type: 'user',
            text: text.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsTyping(true)

        try {
            const res = await fetch(`${apiBase}/ai/assistant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            })
            const data = await res.json()

            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [...prev, {
                    type: 'bot',
                    text: data.response,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }])
            }, 800)
        } catch (err) {
            setIsTyping(false)
            setMessages(prev => [...prev, {
                type: 'bot',
                text: '❌ Sorry, I couldn\'t process your request. Please check if the backend server is running.',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }])
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    const formatText = (text) => {
        if (!text) return ''
        // Convert markdown-like bold to <strong>
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Convert markdown-like italic to <em>
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Convert bullet points (handle both • and *)
        formatted = formatted.replace(/^[•\*] /gm, '• ')
        // Handle code blocks (simple version)
        formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')
        // Convert newlines to <br>
        formatted = formatted.replace(/\n/g, '<br />')
        return formatted
    }

    const clearChat = () => {
        setMessages([{
            type: 'bot',
            text: "🔄 Chat cleared! How can I help you today?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }])
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>🤖 Cleaning Assistant</h1>
                <p>Your intelligent waste management advisor — ask anything!</p>
            </div>

            <div className="assistant-layout">
                <div className="glass-card chat-container">
                    <div className="card-header">
                        <h3>💬 Chat with AI Assistant</h3>
                        <button
                            className="filter-btn"
                            onClick={clearChat}
                            style={{ fontSize: '0.72rem' }}
                        >
                            🗑️ Clear Chat
                        </button>
                    </div>

                    <div className="quick-chips">
                        {quickChips.map((chip, i) => (
                            <button key={i} className="chip" onClick={() => sendMessage(chip)}>
                                {chip}
                            </button>
                        ))}
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg, i) => (
                            <div className={`chat-message ${msg.type}`} key={i}>
                                <div className="msg-avatar">
                                    {msg.type === 'bot' ? '🤖' : '👤'}
                                </div>
                                <div>
                                    <div
                                        className="msg-bubble"
                                        dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                                    />
                                    <span style={{
                                        fontSize: '0.65rem',
                                        color: 'var(--text-muted)',
                                        marginTop: '4px',
                                        display: 'block',
                                        paddingLeft: msg.type === 'user' ? '0' : '4px',
                                        textAlign: msg.type === 'user' ? 'right' : 'left'
                                    }}>
                                        {msg.time}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="chat-message bot">
                                <div className="msg-avatar">🤖</div>
                                <div className="msg-bubble">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area">
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Ask about bins, routes, recycling, eco-points, digital twin..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            className="chat-send-btn"
                            onClick={() => sendMessage(input)}
                        >
                            📤 Send
                        </button>
                    </div>
                </div>

                <div className="assistant-sidebar">
                    <div className="assistant-info-card">
                        <h4>🧠 AI Capabilities</h4>
                        <ul>
                            <li>🗑️ Identify bins needing cleaning</li>
                            <li>🗺️ Generate collection routes</li>
                            <li>📊 Provide system overviews</li>
                            <li>🔥 Predict waste hotspots</li>
                            <li>♻️ Recycling intelligence</li>
                            <li>👥 Citizen eco-points</li>
                            <li>🏙️ Digital twin simulations</li>
                            <li>📍 Zone-based analytics</li>
                        </ul>
                    </div>

                    <div className="assistant-info-card">
                        <h4>💡 Try Asking</h4>
                        <ul>
                            <li>"Which bins are full right now?"</li>
                            <li>"Show recycling report"</li>
                            <li>"Citizen eco-points info"</li>
                            <li>"Run a digital twin scenario"</li>
                            <li>"Show me hotspot predictions"</li>
                        </ul>
                    </div>

                    <div className="assistant-info-card">
                        <h4>📊 Quick Stats</h4>
                        <ul>
                            <li>✅ System Status: Online</li>
                            <li>🗑️ 20 bins monitored</li>
                            <li>⚡ Response time: &lt;1s</li>
                            <li>🔄 Data refreshes: 30s</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CleaningAssistant
