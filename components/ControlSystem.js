'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { RotateCcw, Brain, Zap, AlertTriangle, Send, RefreshCw } from 'lucide-react'

export default function ControlSystem({ fullPage = false }) {
  const ref = useRef(null)
  const canvasRef = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  
  const [connected, setConnected] = useState(false)
  const [systemState, setSystemState] = useState({
    processValue: 50,
    setpoint: 50,
    controlOutput: 50,
    error: 0,
    stability: 'STABLE',
    instabilityRate: 0.1,
    agent: { active: true, kp: 0.5, ki: 0.02, kd: 0.1 }
  })
  const [history, setHistory] = useState({ pv: [], sp: [] })
  const [chatMessages, setChatMessages] = useState([
    { type: 'system', text: 'Tell the AI what setpoint to target, e.g. "stabilize at 75"' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiDecisions, setAiDecisions] = useState([])

  // WebSocket connection
  useEffect(() => {
    let ws = null
    let reconnectTimer = null
    let lastAction = null

    const connect = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.louisbersine.com/ws'
      ws = new WebSocket(wsUrl)

      ws.onopen = () => setConnected(true)

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setSystemState(data)
          
          setHistory(prev => {
            const newPv = [...prev.pv, data.processValue]
            const newSp = [...prev.sp, data.setpoint]
            if (newPv.length > 200) newPv.shift()
            if (newSp.length > 200) newSp.shift()
            return { pv: newPv, sp: newSp }
          })
          
          // Track AI decisions
          if (data.agent?.lastAction) {
            const action = data.agent.lastAction
            const actionKey = `${action.action}-${data.agent.kp}-${data.agent.ki}-${data.agent.kd}`
            
            if (actionKey !== lastAction) {
              lastAction = actionKey
              setAiDecisions(prev => {
                const newDecision = {
                  id: Date.now(),
                  time: new Date().toLocaleTimeString(),
                  action: action.action,
                  analysis: action.analysis,
                  pidChanged: action.pidChanged,
                  confidence: action.confidence,
                  kp: data.agent.kp,
                  ki: data.agent.ki,
                  kd: data.agent.kd,
                  error: data.error,
                  stability: data.stability
                }
                const updated = [newDecision, ...prev]
                if (updated.length > 30) updated.pop()
                return updated
              })
            }
          }
        } catch (e) {}
      }

      ws.onclose = () => {
        setConnected(false)
        reconnectTimer = setTimeout(connect, 2000)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }, [])

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = (canvas.height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    
    if (history.pv.length < 2) return
    
    const drawLine = (data, color) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * canvas.width
        const y = canvas.height - (val / 100) * canvas.height
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
    
    drawLine(history.sp, '#fbbf24')
    drawLine(history.pv, '#00d4ff')
  }, [history])

  const apiCall = async (endpoint, body = {}) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/msg'
    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
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
    setHistory({ pv: [], sp: [] })
    setChatMessages([{ type: 'system', text: 'System reset' }])
    setAiDecisions([])
  }
  const resetPID = () => {
    apiCall('/agent/reset-pid')
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
    
    const message = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { type: 'user', text: message }])
    setIsLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/msg'
      
      await fetch(`${apiUrl}/agent/instruct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: message })
      })
      
      const res = await fetch(`${apiUrl}/control/chat`, {
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
          initial={{ opacity: 0, y: 20 }}
          animate={isInView || fullPage ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card"
          style={{
                  padding: '1.5rem',
                  maxWidth: fullPage ? '100%' : 1400,
                  margin: '0 auto',

                  // NEW: make the card a height-constrained flex column
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,

                  // Pick a real height constraint:
                  // Full page: fill viewport (minus the section padding/header area)
                  height: fullPage ? 'calc(100vh - 2rem)' : undefined,
                  // Embedded: cap the demo so the panels can scroll
                  maxHeight: fullPage ? undefined : '75vh',
                }}
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

          {/* Main Layout: Left (controls) | Middle (chat) | Right (AI log) */}
          <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 280px 240px',
                  gap: '1rem',

                  // FIX typo
                  overflow: 'hidden',   // you had 'hi'

                  // NEW: let this row take remaining height in the card
                  flex: 1,
                  minHeight: 0,
                  alignItems: 'stretch',
                }}
              >
                          
            {/* LEFT COLUMN - All Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Chart */}
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>PROCESS VARIABLE</span>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem' }}>
                    <span style={{ color: '#00d4ff' }}>● PV</span>
                    <span style={{ color: '#fbbf24' }}>● SP</span>
                  </div>
                </div>
                <canvas ref={canvasRef} width={500} height={140} style={{ width: '100%', height: '140px', borderRadius: '6px' }} />
              </div>

              {/* Gauges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <GaugeCard label="Process Value" value={systemState.processValue} color="#00d4ff" />
                <GaugeCard label="Setpoint" value={systemState.setpoint} color="#fbbf24" />
                <GaugeCard label="Error" value={systemState.error} color="#ef4444" max={50} />
              </div>

              {/* Controls Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {/* Chaos Controls */}
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.75rem' }}>
                  <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem', marginBottom: '0.5rem' }}>CHAOS CONTROLS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <MiniButton onClick={() => addDisturbance(20)} color="#f97316"><Zap size={10} /> Kick</MiniButton>
                    <MiniButton onClick={() => addDisturbance(50)} color="#ef4444"><AlertTriangle size={10} /> Big</MiniButton>
                    <MiniButton onClick={increaseInstability} color="#a855f7">Unstable</MiniButton>
                    <MiniButton onClick={resetSystem} color="#6b7280"><RotateCcw size={10} /> Reset</MiniButton>
                  </div>
                </div>

                {/* Agent Status */}
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Brain size={14} style={{ color: '#00d4ff' }} />
                      <span className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>AI #{systemState.agent?.instanceId || 1}</span>
                    </div>
                    <motion.button
                      onClick={toggleAgent}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        border: 'none',
                        background: systemState.agent?.active ? '#10b981' : '#374151',
                        color: '#fff',
                        fontSize: '0.6rem',
                        cursor: 'pointer'
                      }}
                    >
                      {systemState.agent?.active ? 'ON' : 'OFF'}
                    </motion.button>
                  </div>
                  <div className="mono" style={{ fontSize: '0.55rem', color: '#a855f7', marginBottom: '0.3rem' }}>
                    Kp={systemState.agent?.kp?.toFixed(2)} Ki={systemState.agent?.ki?.toFixed(3)} Kd={systemState.agent?.kd?.toFixed(2)}
                  </div>
                  <MiniButton onClick={resetPID} color="#fbbf24" style={{ width: '100%' }}>
                    <RefreshCw size={10} /> Reset PID (Keep Learning)
                  </MiniButton>
                </div>
              </div>

              {/* Reliability + OPC-UA Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {/* Reliability Monitor */}
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

                {/* OPC-UA Tags */}
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.75rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.55rem' }}>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: '0.3rem' }}>// OPC-UA TAGS</div>
                  <div style={{ color: '#00d4ff' }}>PV: {systemState.processValue?.toFixed(1)}</div>
                  <div style={{ color: '#fbbf24' }}>SP: {systemState.setpoint?.toFixed(1)}</div>
                  <div style={{ color: '#10b981' }}>OUT: {systemState.controlOutput?.toFixed(1)}</div>
                  <div style={{ color: '#ef4444' }}>ERR: {systemState.error?.toFixed(2)}</div>
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
              // height: '100%',
              // minHeight: '420px',
              // Critical: allow internal child to shrink + scroll
              minHeight: 0,
              minWidth: 0,

              // Pick ONE: either a fixed height, or a parent with definite height
              height: '100%',

              // Do not scroll the whole panel
              overflow: 'hidden'
            }}>
              <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem', marginBottom: '0.5rem' }}>
                CHAT WITH AGENT
              </div>
              <div style={{
                flex: 1,
                minHeight: 0,          // Critical
                overflowY: 'auto',
                overflowX: 'hidden',
                marginBottom: '0.5rem',
                fontSize: '0.75rem',

                // Prevent long strings from widening the column and “pushing” layout
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{
                    padding: '0.4rem',
                    marginBottom: '0.4rem',
                    borderRadius: '6px',
                    background: msg.type === 'user' ? 'rgba(0,212,255,0.1)' :
                                msg.type === 'ai' ? 'rgba(255,255,255,0.05)' :
                                'rgba(251,191,36,0.1)',
                    color: msg.type === 'system' ? '#fbbf24' : 'var(--text-primary)'
                  }}>
                    {msg.text}
                  </div>
                ))}
                {isLoading && (
                  <div style={{ padding: '0.4rem', color: 'var(--text-tertiary)' }}>Thinking...</div>
                )}
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
              // height: '100%',
              // minHeight: '420px',
              // Critical: allow internal child to shrink + scroll
              minHeight: 0,
              minWidth: 0,

              // Pick ONE: either a fixed height, or a parent with definite height
              height: '100%',

              // Do not scroll the whole panel
              overflow: 'hidden'
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
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ color: '#a855f7', fontWeight: 'bold' }}>
                          {d.action?.toUpperCase()}
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

function GaugeCard({ label, value, color, max = 100 }) {
  const percentage = Math.min(Math.abs(value) / max * 100, 100)
  
  return (
    <div style={{
      padding: '0.6rem',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color }}>
        {value?.toFixed(1)}
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
