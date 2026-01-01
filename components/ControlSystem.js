'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { RotateCcw, Brain, Zap, AlertTriangle, Send, RefreshCw, Thermometer, Flame } from 'lucide-react'
import { useWebSocket } from '../contexts/WebSocketContext'
import HeaterPowerGraph from './HeaterPowerGraph';

export default function ControlSystem({ fullPage = false }) {
  const ref = useRef(null)
  const canvasRef = useRef(null)
  const chatScrollRef = useRef(null)
  const chatEndRef = useRef(null)
  const userHasInteractedRef = useRef(false)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const lastPidRef = useRef(null)
  const lastActionKeyRef = useRef(null)
  const lastLogTimeRef = useRef(0)
  
  const [connected, setConnected] = useState(false)
  const [systemState, setSystemState] = useState({
    temperature: 20,
    setpoint: 200,
    heaterPower: 0,
    error: 0,
    stability: 'STABLE',
    heatLoss: 0.25,
    agent: {
      active: true,
      kp: 0.3,
      ki: 0.01,
      kd: 0.05,
      thinking: 'System starting',
      tags: ['startup']
    }
  })
  const [history, setHistory] = useState({ temp: [], sp: [] })
  const [chatMessages, setChatMessages] = useState([
    { type: 'system', text: 'Tell the AI what setpoint to target, e.g. "stabilize at 75"' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiDecisions, setAiDecisions] = useState([])
  const [expandedChat, setExpandedChat] = useState(new Set())

  // Use shared WebSocket context
  const { connected: wsConnected, controlData, subscribe } = useWebSocket()

  // Update connected state
  useEffect(() => {
    setConnected(wsConnected)
  }, [wsConnected])

  // Handle control messages from WebSocket
  useEffect(() => {
    if (!controlData) return

    setSystemState(controlData)

    setHistory(prev => {
      const newTemp = [...prev.temp, controlData.temperature]
      const newSp = [...prev.sp, controlData.setpoint]
      if (newTemp.length > 300) newTemp.shift()
      if (newSp.length > 300) newSp.shift()
      return { temp: newTemp, sp: newSp }
    })

    // Track AI decisions
    if (controlData.agent) {
      const now = Date.now()
      const kp = controlData.agent.kp ?? 0
      const ki = controlData.agent.ki ?? 0
      const kd = controlData.agent.kd ?? 0
      const currentPid = `${kp.toFixed(3)}-${ki.toFixed(4)}-${kd.toFixed(3)}`

      // Check if PID actually changed
      const pidChanged = lastPidRef.current !== null && lastPidRef.current !== currentPid

      // Get action info
      const action = controlData.agent.lastAction
      const actionKey = action ? `${action.action}-${(action.analysis || '').substring(0, 30)}` : null
      const actionChanged = actionKey && actionKey !== lastActionKeyRef.current

      // Time-based logging (every 15s even if nothing changed)
      const timeSinceLast = now - lastLogTimeRef.current

      // Decide whether to log
      const shouldLog = pidChanged || actionChanged || timeSinceLast > 15000

      if (shouldLog && (pidChanged || action)) {
        lastPidRef.current = currentPid
        if (actionKey) lastActionKeyRef.current = actionKey
        lastLogTimeRef.current = now

        setAiDecisions(prev => {
          const newDecision = {
            id: now,
            time: new Date().toLocaleTimeString(),
            action: pidChanged ? 'TUNE' : (action?.action?.toUpperCase() || 'UPDATE'),
            analysis: pidChanged
              ? `Kp=${kp.toFixed(2)}, Ki=${ki.toFixed(3)}, Kd=${kd.toFixed(2)}`
              : (action?.analysis || 'System update'),
            pidChanged: pidChanged,
            kp, ki, kd,
            error: controlData.error,
            stability: controlData.stability
          }
          const updated = [newDecision, ...prev]
          if (updated.length > 30) updated.pop()
          return updated
        })
      }

      // Initialize lastPid on first message
      if (lastPidRef.current === null) {
        lastPidRef.current = currentPid
      }
    }
  }, [controlData])

  // Auto-scroll chat only after user sends a message (not on mount or WS updates)
  useEffect(() => {
    // Only auto-scroll if user has sent a message
    if (!userHasInteractedRef.current) return
    
    const scroller = chatScrollRef.current
    if (!scroller) return
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    if (distanceFromBottom < 80) {
      scroller.scrollTop = scroller.scrollHeight
    }
  }, [chatMessages, isLoading])

  // Draw chart with HiDPI support
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // HiDPI scaling
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const leftMargin = 50
    const plotWidth = width - leftMargin - 10

    // Temperature range: 0-450°C with nice labels
    const minTemp = 0
    const maxTemp = 450
    const tempLabels = [0, 100, 200, 300, 400]

    // Clear background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    // Draw grid and Y-axis labels
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '11px monospace'
    ctx.textAlign = 'right'

    tempLabels.forEach(temp => {
      const y = height - ((temp - minTemp) / (maxTemp - minTemp)) * height
      ctx.beginPath()
      ctx.moveTo(leftMargin, y)
      ctx.lineTo(width - 10, y)
      ctx.stroke()
      ctx.fillText(`${temp}°C`, leftMargin - 8, y + 4)
    })

    if (history.temp.length < 2) return

    const drawLine = (data, color) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      data.forEach((val, i) => {
        const x = leftMargin + (i / Math.max(data.length - 1, 1)) * plotWidth
        const y = height - ((val - minTemp) / (maxTemp - minTemp)) * height
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    drawLine(history.sp, '#fbbf24')
    drawLine(history.temp, '#00d4ff')
  }, [history])

  const getApiUrl = () => {
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    return process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3101' : '/msg')
  }

  const apiCall = async (endpoint, body = {}) => {
    try {
      const res = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      return await res.json()
    } catch (e) {
      console.error('API error:', e)
      return null
    }
  }

  const addDisturbance = (amount) => apiCall('/user/disturbance', { amount })
  const increaseInstability = () => apiCall('/user/instability', { amount: 0.15 })
  const resetSystem = () => {
    apiCall('/user/reset')
    setHistory({ temp: [], sp: [] })
    setChatMessages([{ type: 'system', text: 'System reset' }])
    setAiDecisions([])
    lastPidRef.current = null
    lastActionKeyRef.current = null
  }
  const resetPID = () => {
    apiCall('/agent/reset-pid')
    lastPidRef.current = null
    setAiDecisions(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      action: 'RESET',
      analysis: 'PID reset to defaults - AI will re-tune',
      pidChanged: true,
      kp: 0.5, ki: 0.02, kd: 0.1
    }, ...prev])
  }
  const toggleAgent = () => apiCall('/agent/toggle', { active: !systemState.agent?.active })

  const sendChat = async () => {
    if (!chatInput.trim() || isLoading) return
    
    userHasInteractedRef.current = true
    const message = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { type: 'user', text: message }])
    setIsLoading(true)

    try {
      await fetch(`${getApiUrl()}/agent/instruct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: message })
      })
      
      const res = await fetch(`${getApiUrl()}/control/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      const data = await res.json()
      
      if (data.response) {
        setChatMessages(prev => [...prev, { type: 'ai', text: data.response }])
      } else if (data.error) {
        setChatMessages(prev => [...prev, { type: 'system', text: `Error: ${data.hint || data.error}` }])
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { type: 'system', text: 'Error communicating with AI' }])
    }
    
    setIsLoading(false)
  }

  const toggleChatExpand = (index) => {
    setExpandedChat(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const getStatusColor = () => {
    switch (systemState.stability) {
      case 'STABLE': return '#10b981'
      case 'MARGINAL': return '#fbbf24'
      case 'UNSTABLE': return '#f97316'
      case 'CRITICAL': return '#ef4444'
      default: return '#888'
    }
  }

  return (
    <section
      id="control-system"
      ref={ref}
      style={{
        padding: fullPage ? '1rem' : '8rem 2rem',
        minHeight: fullPage ? '100vh' : 'auto',
        position: 'relative'
      }}
    >
      <div className={fullPage ? '' : 'container'}>
        {!fullPage && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            style={{ marginBottom: '3rem' }}
          >
            <span className="section-subtitle">Live Demo</span>
            <h2 className="section-title">
              AI <span className="gradient-text">Control System</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>
              Watch an AI agent tune PID parameters in real-time to stabilize an unstable process.
            </p>
          </motion.div>
        )}

        {fullPage && (
          <div style={{ marginBottom: '1rem' }}>
            <a href="/" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontSize: '0.9rem' }}>
              ← Back to Portfolio
            </a>
            <h1 style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>AI Control System Demo</h1>
          </div>
        )}

        <motion.div
          initial={fullPage ? false : { opacity: 0, y: 20 }}
          animate={isInView || fullPage ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.3 }}
          className="glass-card"
          style={{ padding: '1.5rem', maxWidth: fullPage ? '100%' : 1400, margin: '0 auto' }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: connected ? '#10b981' : '#ef4444',
                boxShadow: `0 0 15px ${connected ? '#10b981' : '#ef4444'}`,
                animation: connected ? 'pulse 2s infinite' : 'none'
              }} />
              <span className="mono" style={{ color: connected ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
              <span className="mono" style={{ 
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                background: getStatusColor() + '20',
                color: getStatusColor()
              }}>
                {systemState.stability}
              </span>
            </div>
          </div>

          {/* Main Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 280px 240px',
            gap: '1rem',
            alignItems: 'start'
          }}>
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Chart */}
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>TEMPERATURE TREND (0-450°C)</span>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem' }}>
                    <span style={{ color: '#00d4ff' }}>● Temp</span>
                    <span style={{ color: '#fbbf24' }}>● Setpoint</span>
                  </div>
                </div>
                <canvas ref={canvasRef} style={{ width: '100%', height: '160px', display: 'block', borderRadius: '6px' }} />
              </div>

              {/* Gauges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <GaugeCard label="Temperature" value={systemState.temperature} color="#00d4ff" max={450} unit="°C" />
                <GaugeCard label="Setpoint" value={systemState.setpoint} color="#fbbf24" max={450} unit="°C" />
                <GaugeCard label="Error" value={systemState.error} color="#ef4444" max={50} />
              </div>

              {/* Controls Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.75rem' }}>
                  <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem', marginBottom: '0.5rem' }}>CHAOS CONTROLS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <MiniButton onClick={() => addDisturbance(20)} color="#f97316"><Zap size={10} /> Kick</MiniButton>
                    <MiniButton onClick={() => addDisturbance(50)} color="#ef4444"><AlertTriangle size={10} /> Big</MiniButton>
                    <MiniButton onClick={increaseInstability} color="#a855f7">Unstable</MiniButton>
                    <MiniButton onClick={resetSystem} color="#6b7280"><RotateCcw size={10} /> Reset</MiniButton>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Brain size={14} style={{ color: '#a855f7' }} />
                      <span className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>AI AGENT</span>
                    </div>
                    <motion.button
                      onClick={toggleAgent}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '0.2rem 0.5rem',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.55rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        background: systemState.agent?.active ? '#10b98130' : '#ef444430',
                        color: systemState.agent?.active ? '#10b981' : '#ef4444'
                      }}
                    >
                      {systemState.agent?.active ? 'ON' : 'OFF'}
                    </motion.button>
                  </div>
                  <div className="mono" style={{ fontSize: '0.55rem', color: '#a855f7', marginBottom: '0.3rem' }}>
                    Kp={systemState.agent?.kp?.toFixed(2)} Ki={systemState.agent?.ki?.toFixed(3)} Kd={systemState.agent?.kd?.toFixed(2)}
                  </div>
                  <MiniButton onClick={resetPID} color="#fbbf24" style={{ width: '100%' }}>
                    <RefreshCw size={10} /> Reset PID
                  </MiniButton>
                </div>
              </div>

              {/* Bottom Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.75rem' }}>
                  <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem', marginBottom: '0.4rem' }}>RELIABILITY</div>
                  <RiskGauge 
                    risk={systemState.agent?.hallucination?.risk || 0}
                    level={systemState.agent?.hallucination?.riskLevel || 'NORMAL'}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginTop: '0.4rem', fontSize: '0.55rem' }}>
                    <div><span style={{ color: 'var(--text-tertiary)' }}>Quality: </span><span style={{ color: '#10b981' }}>{systemState.agent?.hallucination?.recentQuality || 100}%</span></div>
                    <div><span style={{ color: 'var(--text-tertiary)' }}>Failovers: </span><span style={{ color: '#fbbf24' }}>{systemState.supervisor?.failoverCount || 0}</span></div>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.75rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.55rem' }}>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: '0.3rem' }}>// OPC-UA TAGS</div>
                  <div style={{ color: '#00d4ff' }}>PV: {systemState.temperature?.toFixed(2)}</div>
                  <div style={{ color: '#fbbf24' }}>SP: {systemState.setpoint}</div>
                  <div style={{ color: '#10b981' }}>OUT: {systemState.heaterPower?.toFixed(2)}</div>
                  <div style={{ color: '#ef4444' }}>ERR: {systemState.error?.toFixed(3)}</div>
                </div>
              </div>
            </div>

            {/* MIDDLE COLUMN - Chat */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '10px',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              height: '420px'
            }}>
              <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem', marginBottom: '0.5rem' }}>
                CHAT WITH AGENT
              </div>
              <div ref={chatScrollRef} style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                marginBottom: '0.5rem',
                fontSize: '0.75rem'
              }}>
                {chatMessages.map((msg, i) => {
                  const isAi = msg.type === 'ai'
                  const isLong = isAi && (msg.text?.length || 0) > 360
                  const expanded = expandedChat.has(i)
                  const displayText = isLong && !expanded ? msg.text.substring(0, 360) + '...' : msg.text

                  return (
                    <div key={i} style={{
                      padding: '0.4rem',
                      marginBottom: '0.4rem',
                      borderRadius: '6px',
                      background: msg.type === 'user' ? 'rgba(0,212,255,0.1)' :
                                  msg.type === 'ai' ? 'rgba(255,255,255,0.05)' :
                                  'rgba(251,191,36,0.1)',
                      color: msg.type === 'system' ? '#fbbf24' : 'var(--text-primary)',
                      wordBreak: 'break-word'
                    }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{displayText}</div>
                      {isLong && (
                        <button
                          onClick={() => toggleChatExpand(i)}
                          style={{
                            marginTop: '0.25rem',
                            background: 'none',
                            border: 'none',
                            color: '#00d4ff',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {expanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  )
                })}
                {isLoading && (
                  <div style={{ padding: '0.4rem', color: 'var(--text-tertiary)' }}>Thinking...</div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChat()}
                  placeholder="stabilize at 75..."
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '0.75rem'
                  }}
                />
                <motion.button
                  onClick={sendChat}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading}
                  style={{
                    padding: '0.4rem 0.6rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#00d4ff',
                    color: '#000',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1
                  }}
                >
                  <Send size={14} />
                </motion.button>
              </div>
            </div>

            {/* RIGHT COLUMN - AI Decision Log */}
            <div style={{
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '10px',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              height: '420px'
            }}>
              <div className="mono" style={{ color: '#a855f7', fontSize: '0.65rem', marginBottom: '0.5rem' }}>
                AI TUNING LOG
              </div>
              <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.65rem' }}>
                {aiDecisions.length === 0 ? (
                  <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                    Waiting for AI decisions...
                  </div>
                ) : (
                  aiDecisions.map((d) => (
                    <div key={d.id} style={{
                      padding: '0.4rem',
                      marginBottom: '0.4rem',
                      borderRadius: '4px',
                      background: d.pidChanged ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                      borderLeft: `3px solid ${d.pidChanged ? '#a855f7' : '#374151'}`,
                      wordBreak: 'break-word'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ color: d.pidChanged ? '#a855f7' : '#888', fontWeight: 'bold' }}>
                          {d.action}
                          {d.pidChanged && ' ✓'}
                        </span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.55rem' }}>{d.time}</span>
                      </div>
                      {d.pidChanged && (
                        <div className="mono" style={{ color: '#10b981', fontSize: '0.55rem', marginBottom: '0.2rem' }}>
                          Kp={d.kp?.toFixed(2)} Ki={d.ki?.toFixed(3)} Kd={d.kd?.toFixed(2)}
                        </div>
                      )}
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.55rem' }}>
                        {d.analysis?.substring(0, 80)}{d.analysis?.length > 80 ? '...' : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
        <HeaterPowerGraph heaterPower={systemState?.heaterPower} />
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </section>
  )
}

function GaugeCard({ label, value, color, max = 100, unit = '' }) {
  const percentage = Math.min(Math.abs(value) / max * 100, 100)

  return (
    <div style={{
      padding: '0.6rem',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color }}>
        {value?.toFixed(1)}{unit}
      </div>
      <div style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', marginBottom: '0.3rem' }}>
        {label}
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.1s'
        }} />
      </div>
    </div>
  )
}

function MiniButton({ onClick, color, children, style = {} }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem',
        padding: '0.3rem 0.5rem',
        border: `1px solid ${color}40`,
        borderRadius: '4px',
        background: `${color}20`,
        color: color,
        fontSize: '0.6rem',
        fontWeight: 500,
        cursor: 'pointer',
        ...style
      }}
    >
      {children}
    </motion.button>
  )
}

function RiskGauge({ risk, level }) {
  const color = level === 'CRITICAL' ? '#ef4444' : level === 'WARNING' ? '#fbbf24' : '#10b981'
  
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '1rem', fontWeight: 'bold', color }}>{risk}%</span>
        <span style={{ 
          fontSize: '0.5rem', 
          fontWeight: 'bold',
          padding: '0.1rem 0.3rem',
          borderRadius: '3px',
          background: `${color}20`,
          color
        }}>
          {level}
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <div style={{
          height: '100%',
          width: `${risk}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.3s'
        }} />
      </div>
    </div>
  )
}