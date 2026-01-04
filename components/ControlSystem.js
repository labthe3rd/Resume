'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { 
  RotateCcw, Brain, Zap, AlertTriangle, Send, Thermometer, Flame,
  Database, Eye, EyeOff
} from 'lucide-react'
import { useWebSocket } from '../contexts/WebSocketContext'
import DataHistorian from './DataHistorian'

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
  
  // Multi-tag history for unified graph
  const [history, setHistory] = useState({
    temperature: [],
    setpoint: [],
    heaterPower: []
  })
  
  // Visible tags state
  const [visibleTags, setVisibleTags] = useState({
    temperature: true,
    setpoint: true,
    heaterPower: true
  })
  
  const [chatMessages, setChatMessages] = useState([
    { type: 'system', text: 'Tell the AI what setpoint to target, e.g. "stabilize at 75"' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiDecisions, setAiDecisions] = useState([])
  const [expandedChat, setExpandedChat] = useState(new Set())
  
  const [showHistorian, setShowHistorian] = useState(false)
  const [historianPaused, setHistorianPaused] = useState(false)

  const { connected: wsConnected, controlData } = useWebSocket()

  useEffect(() => {
    setConnected(wsConnected)
  }, [wsConnected])

  // Handle control messages from WebSocket
  useEffect(() => {
    if (!controlData) return

    setSystemState(controlData)

    setHistory(prev => {
      const newHistory = { ...prev }
      newHistory.temperature = [...prev.temperature, controlData.temperature].slice(-300)
      newHistory.setpoint = [...prev.setpoint, controlData.setpoint].slice(-300)
      newHistory.heaterPower = [...prev.heaterPower, controlData.heaterPower].slice(-300)
      return newHistory
    })

    // Track AI decisions
    if (controlData.agent) {
      const now = Date.now()
      const kp = controlData.agent.kp ?? 0
      const ki = controlData.agent.ki ?? 0
      const kd = controlData.agent.kd ?? 0
      const currentPid = `${kp.toFixed(3)}-${ki.toFixed(4)}-${kd.toFixed(3)}`

      const pidChanged = lastPidRef.current !== null && lastPidRef.current !== currentPid
      const action = controlData.agent.lastAction
      const actionKey = action ? `${action.action}-${(action.analysis || '').substring(0, 30)}` : null
      const actionChanged = actionKey && actionKey !== lastActionKeyRef.current
      const timeSinceLast = now - lastLogTimeRef.current
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

      if (lastPidRef.current === null) {
        lastPidRef.current = currentPid
      }
    }
  }, [controlData])

  // Auto-scroll chat
  useEffect(() => {
    if (!userHasInteractedRef.current) return
    
    const scroller = chatScrollRef.current
    if (!scroller) return
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    if (distanceFromBottom < 80) {
      scroller.scrollTop = scroller.scrollHeight
    }
  }, [chatMessages, isLoading])

  // Draw unified multi-tag chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const leftMargin = 55
    const rightMargin = 55
    const plotWidth = width - leftMargin - rightMargin

    // Clear background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    // Define metrics with their own scales
    const metrics = [
      { 
        key: 'temperature', 
        color: '#00d4ff', 
        min: 0, 
        max: 450,
        label: 'Temp °C',
        side: 'left'
      },
      { 
        key: 'setpoint', 
        color: '#fbbf24', 
        min: 0, 
        max: 450,
        label: 'Setpoint °C',
        side: 'left'
      },
      { 
        key: 'heaterPower', 
        color: '#ef4444', 
        min: 0, 
        max: 100,
        label: 'Power %',
        side: 'right'
      }
    ]

    // Draw grid for temperature (left axis)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    const tempLabels = [0, 100, 200, 300, 400]
    
    tempLabels.forEach(temp => {
      const y = height - ((temp - 0) / 450) * height
      ctx.beginPath()
      ctx.moveTo(leftMargin, y)
      ctx.lineTo(width - rightMargin, y)
      ctx.stroke()
    })

    // Left Y-axis labels (Temperature)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    tempLabels.forEach(temp => {
      const y = height - ((temp - 0) / 450) * height
      ctx.fillText(`${temp}°C`, leftMargin - 5, y + 3)
    })

    // Right Y-axis labels (Power)
    ctx.textAlign = 'left'
    const powerLabels = [0, 25, 50, 75, 100]
    powerLabels.forEach(power => {
      const y = height - ((power - 0) / 100) * height
      ctx.fillText(`${power}%`, width - rightMargin + 5, y + 3)
    })

    if (history.temperature.length < 2) return

    // Draw each visible metric
    metrics.forEach(metric => {
      if (!visibleTags[metric.key]) return
      
      const data = history[metric.key]
      if (!data || data.length < 2) return

      ctx.strokeStyle = metric.color
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()

      data.forEach((val, i) => {
        const x = leftMargin + (i / Math.max(data.length - 1, 1)) * plotWidth
        const y = height - ((val - metric.min) / (metric.max - metric.min)) * height
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    })
  }, [history, visibleTags])

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
    setChatMessages([{ type: 'system', text: 'System reset. Ready for new setpoint.' }])
    setAiDecisions([])
  }

  const sendChat = async () => {
    if (!chatInput.trim() || isLoading) return
    
    userHasInteractedRef.current = true
    const message = chatInput.trim()
    setChatMessages(prev => [...prev, { type: 'user', text: message }])
    setChatInput('')
    setIsLoading(true)

    const data = await apiCall('/control/chat', { message });
    console.log(data)
    
    if (data?.response) {
      setChatMessages(prev => [...prev, { type: 'ai', text: data.response }])
    } else {
      setChatMessages(prev => [...prev, { type: 'system', text: 'No response from AI' }])
    }
    
    setIsLoading(false)
  }

  const toggleChatExpand = (index) => {
    setExpandedChat(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) newSet.delete(index)
      else newSet.add(index)
      return newSet
    })
  }

  const toggleTag = (tag) => {
    setVisibleTags(prev => ({ ...prev, [tag]: !prev[tag] }))
  }

  return (
    <section
      ref={ref}
      id="control-system"
      style={{
        minHeight: fullPage ? '100vh' : 'auto',
        padding: fullPage ? '6rem 2rem' : '4rem 2rem',
        background: 'linear-gradient(180deg, #05050800 0%, #0a0a0f00 100%)',
        position: 'relative'
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '2rem' }}
        >
          <h2 className="gradient-text" style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            marginBottom: '1rem'
          }}>
            AI PID Control System
          </h2>
          <p style={{
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            color: 'var(--text-secondary)',
            maxWidth: 700,
            margin: '0 auto'
          }}>
            Real-time AI-powered thermal control with adaptive PID tuning
          </p>
        </motion.div>

        {/* Connection Status */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          color: connected ? '#10b981' : '#ef4444'
        }}>
          {connected ? '● CONNECTED' : '● DISCONNECTED'}
        </div>

        {/* Main Control Panel - REDUCED WIDTH */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: 800,  // REDUCED from full width
            margin: '0 auto'
          }}
        >
          {/* System Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <GaugeCard label="TEMPERATURE" value={systemState.temperature} color="#00d4ff" max={450} unit="°C" />
            <GaugeCard label="SETPOINT" value={systemState.setpoint} color="#fbbf24" max={450} unit="°C" />
            <GaugeCard label="HEATER POWER" value={systemState.heaterPower} color="#ef4444" max={100} unit="%" />
            <GaugeCard label="ERROR" value={systemState.error} color="#8b5cf6" max={100} unit="°C" />
          </div>

          {/* Unified Graph with Tag Toggles */}
          <div style={{
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            {/* Tag Toggle Controls */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <TagToggle
                label="Temperature"
                color="#00d4ff"
                active={visibleTags.temperature}
                onClick={() => toggleTag('temperature')}
              />
              <TagToggle
                label="Setpoint"
                color="#fbbf24"
                active={visibleTags.setpoint}
                onClick={() => toggleTag('setpoint')}
              />
              <TagToggle
                label="Heater Power"
                color="#ef4444"
                active={visibleTags.heaterPower}
                onClick={() => toggleTag('heaterPower')}
              />
            </div>

            {/* Canvas Graph - prevent scroll on click */}
            <div style={{ 
              position: 'relative',
              pointerEvents: 'none'  // Prevents click events from bubbling
            }}>
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: '8px',
                  display: 'block'
                }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <MiniButton onClick={() => addDisturbance(-20)} color="#00d4ff">
              <Thermometer size={14} /> -20°C
            </MiniButton>
            <MiniButton onClick={() => addDisturbance(20)} color="#ef4444">
              <Flame size={14} /> +20°C
            </MiniButton>
            <MiniButton onClick={increaseInstability} color="#fbbf24">
              <AlertTriangle size={14} /> Instability
            </MiniButton>
            <MiniButton onClick={resetSystem} color="#8b5cf6">
              <RotateCcw size={14} /> Reset
            </MiniButton>
            <MiniButton onClick={() => setShowHistorian(true)} color="#10b981">
              <Database size={14} /> Historian
            </MiniButton>
          </div>

          {/* Chat and AI Log */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }}>
            {/* AI Chat */}
            <div style={{
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.3)',
              borderRadius: '10px',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              height: '380px'
            }}>
              <div className="mono" style={{ color: '#00d4ff', fontSize: '0.65rem', marginBottom: '0.5rem' }}>
                AI CHAT
              </div>
              <div ref={chatScrollRef} style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: '0.5rem',
                fontSize: '0.65rem'
              }}>
                {chatMessages.map((msg, i) => {
                  const isLong = msg.text.length > 360
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

            {/* AI Decision Log */}
            <div style={{
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '10px',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              height: '380px'
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
      </div>

      {/* Data Historian Modal */}
      <DataHistorian
        isOpen={showHistorian}
        onClose={() => setShowHistorian(false)}
        systemState={systemState}
        isPaused={historianPaused}
      />
    </section>
  )
}

function TagToggle({ label, color, active, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.75rem',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.2)'}`,
        borderRadius: '6px',
        background: active ? `${color}20` : 'rgba(0,0,0,0.3)',
        color: active ? color : 'rgba(255,255,255,0.5)',
        fontSize: '0.7rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      {active ? <Eye size={14} /> : <EyeOff size={14} />}
      {label}
    </motion.button>
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