'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, Activity, Brain, Zap, AlertTriangle, Target, Send } from 'lucide-react'

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
    momentum: 0,
    tick: 0,
    agent: { active: true, kp: 2, ki: 0.1, kd: 0.5 }
  })
  const [history, setHistory] = useState({ pv: [], sp: [] })
  const [chatMessages, setChatMessages] = useState([
    { type: 'system', text: 'Tell the AI agent what setpoint to target, e.g., "stabilize at 75"' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // WebSocket connection
  useEffect(() => {
    let ws = null
    let reconnectTimer = null

    const connect = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://192.168.0.70:3101/ws'
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setConnected(true)
      }

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
      if (ws) ws.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const y = (h / 10) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // Setpoint line
    if (history.sp.length > 1) {
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      for (let i = 0; i < history.sp.length; i++) {
        const x = (w / 200) * i
        const y = h - (history.sp[i] / 100) * h
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Process value line
    if (history.pv.length > 1) {
      ctx.strokeStyle = '#00d4ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < history.pv.length; i++) {
        const x = (w / 200) * i
        const y = h - (history.pv[i] / 100) * h
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }, [history])

  const apiCall = async (endpoint, body = {}) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.70:3101'
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
  }
  const toggleAgent = () => apiCall('/agent/toggle', { active: !systemState.agent?.active })

  const sendChat = async () => {
    if (!chatInput.trim() || isLoading) return
    
    const message = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { type: 'user', text: message }])
    setIsLoading(true)

    try {
      // Send instruction to agent
      await apiCall('/agent/instruct', { instruction: message })
      
      // Get chat response
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.70:3101'
      const res = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      const data = await res.json()
      
      if (data.response) {
        setChatMessages(prev => [...prev, { type: 'ai', text: data.response }])
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
        padding: fullPage ? '1rem 2rem' : '8rem 2rem', 
        position: 'relative',
        minHeight: fullPage ? '100vh' : 'auto'
      }}
    >
      <div className="container" style={{ maxWidth: fullPage ? '1400px' : undefined }}>
        {!fullPage && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            style={{ marginBottom: '3rem' }}
          >
            <span className="section-subtitle">AI Control Demo</span>
            <h2 className="section-title">
              Unstable <span className="gradient-text">System</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 600, marginTop: '1rem' }}>
              Watch an AI agent stabilize a naturally chaotic process. Add disturbances and tell the agent what setpoint to target.
            </p>
          </motion.div>
        )}

        {fullPage && (
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AI Control System
            </h1>
            <a href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>
              ← Back to Portfolio
            </a>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView || fullPage ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card"
          style={{ padding: '2rem', maxWidth: fullPage ? '100%' : 1100, margin: '0 auto' }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: connected ? '#10b981' : '#ef4444',
                boxShadow: `0 0 20px ${connected ? '#10b981' : '#ef4444'}`,
                animation: connected ? 'pulse 2s infinite' : 'none'
              }} />
              <span className="mono" style={{ color: connected ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '0.875rem' }}>
                {connected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
              <span className="mono" style={{ 
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                background: getStatusColor() + '20',
                color: getStatusColor()
              }}>
                {systemState.stability}
              </span>
            </div>
          </div>

          {/* Main Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
            {/* Left: Chart and Controls */}
            <div>
              {/* Chart */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>PROCESS VARIABLE</span>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                    <span style={{ color: '#00d4ff' }}>● PV</span>
                    <span style={{ color: '#fbbf24' }}>● SP</span>
                  </div>
                </div>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  style={{ width: '100%', height: '200px', borderRadius: '8px' }}
                />
              </div>

              {/* Gauges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <GaugeCard label="Process Value" value={systemState.processValue} color="#00d4ff" />
                <GaugeCard label="Setpoint" value={systemState.setpoint} color="#fbbf24" />
                <GaugeCard label="Error" value={systemState.error} color="#ef4444" max={50} />
              </div>

              {/* Chaos Controls */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  CHAOS CONTROLS
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <ControlButton onClick={() => addDisturbance(20)} color="#f97316" icon={Zap}>
                    Small Kick
                  </ControlButton>
                  <ControlButton onClick={() => addDisturbance(50)} color="#ef4444" icon={AlertTriangle}>
                    Big Kick
                  </ControlButton>
                  <ControlButton onClick={increaseInstability} color="#a855f7" icon={Activity}>
                    More Unstable
                  </ControlButton>
                  <ControlButton onClick={resetSystem} color="#6b7280" icon={RotateCcw}>
                    Reset
                  </ControlButton>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Instability Rate: <span style={{ color: '#a855f7' }}>{systemState.instabilityRate?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Right: Agent & Chat */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Agent Status */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Brain size={18} style={{ color: '#00d4ff' }} />
                    <span className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>AI AGENT</span>
                  </div>
                  <motion.button
                    onClick={toggleAgent}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: systemState.agent?.active ? '#10b981' : '#374151',
                      color: '#fff',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {systemState.agent?.active ? 'ON' : 'OFF'}
                  </motion.button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: systemState.agent?.active ? '#10b981' : '#ef4444',
                    boxShadow: systemState.agent?.active ? '0 0 10px #10b981' : 'none'
                  }} />
                  <span style={{ fontSize: '0.85rem', color: systemState.agent?.active ? '#10b981' : '#888' }}>
                    {systemState.agent?.active ? 'Actively Stabilizing' : 'Inactive'}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                  PID: Kp={systemState.agent?.kp?.toFixed(1)} Ki={systemState.agent?.ki?.toFixed(2)} Kd={systemState.agent?.kd?.toFixed(1)}
                </div>
                <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  Control Output: <span style={{ color: '#00d4ff' }}>{systemState.controlOutput?.toFixed(1)}</span>
                </div>
              </div>

              {/* Chat */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                padding: '1rem',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  TALK TO AGENT
                </div>
                <div style={{
                  flex: 1,
                  minHeight: '150px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginBottom: '0.75rem',
                  fontSize: '0.8rem'
                }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{
                      padding: '0.5rem',
                      marginBottom: '0.5rem',
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
                    <div style={{ padding: '0.5rem', color: 'var(--text-tertiary)' }}>
                      Thinking...
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChat()}
                    placeholder="stabilize at 30..."
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#fff',
                      fontSize: '0.8rem'
                    }}
                  />
                  <motion.button
                    onClick={sendChat}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isLoading}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#00d4ff',
                      color: '#000',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.5 : 1
                    }}
                  >
                    <Send size={16} />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* OPC-UA Tags */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.7rem'
          }}>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
              // OPC-UA Tag Monitor (opc.tcp://localhost:4840)
            </div>
            <div style={{ color: '#00d4ff' }}>
              ns=1;s=ProcessValue := {systemState.processValue?.toFixed(2)};
            </div>
            <div style={{ color: '#fbbf24' }}>
              ns=1;s=Setpoint := {systemState.setpoint?.toFixed(2)};
            </div>
            <div style={{ color: '#10b981' }}>
              ns=1;s=ControlOutput := {systemState.controlOutput?.toFixed(2)};
            </div>
            <div style={{ color: '#ef4444' }}>
              ns=1;s=Error := {systemState.error?.toFixed(2)};
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
  const percentage = Math.min((value / max) * 100, 100)
  
  return (
    <div style={{
      padding: '1rem',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color }}>
        {value?.toFixed(1)}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
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

function ControlButton({ onClick, color, icon: Icon, children }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 0.75rem',
        border: `1px solid ${color}40`,
        borderRadius: '6px',
        background: `${color}20`,
        color: color,
        fontSize: '0.75rem',
        fontWeight: 500,
        cursor: 'pointer'
      }}
    >
      <Icon size={14} />
      {children}
    </motion.button>
  )
}
