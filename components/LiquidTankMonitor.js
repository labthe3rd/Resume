'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect, useCallback } from 'react'
import { useWebSocket } from '../contexts/WebSocketContext'
import {
  AlertTriangle, 
  Bell, 
  BellOff, 
  Mail, 
  Phone, 
  RotateCcw, 
  Volume2, 
  VolumeX,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Activity,
  Eye,
  EyeOff,
  Minus,
  RefreshCw,
  Brain,
  Shield,
  Zap,
  TrendingUp
} from 'lucide-react'

export default function LiquidTankMonitor({ fullPage = false }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const synthRef = useRef(null)
  
  const [connected, setConnected] = useState(false)
  const [tankState, setTankState] = useState({
    liquidFilling: false,
    liquidLevel: 0,
    liquidLow: false,
    liquidHigh: false,
    direction: 'up',
    anomalies: [],
    timestamp: Date.now()
  })
  
  const [faults, setFaults] = useState({
    highSensorDisabled: false,
    lowSensorDisabled: false,
    highSensorForcedOn: false,
    lowSensorForcedOn: false,
    levelForceNegative: false,
    levelForceZero: false,
    levelLocked: false,
    fillingPaused: false
  })
  
  const [alarmState, setAlarmState] = useState({
    anomalyDetected: false,
    anomalyStartTime: null,
    escalationLevel: 0, // 0=none, 1=HMI, 2=email, 3=phone
    alarmDisabled: false,
    triggeredLevels: new Set() // Track which levels have been triggered
  })
  
  const [volumeEnabled, setVolumeEnabled] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [chatMessages, setChatMessages] = useState([
    { type: 'system', text: 'AI Monitor initialized. Watching for unusual activity...' }
  ])
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [hallucination, setHallucination] = useState(null)
  const [supervisorStatus, setSupervisorStatus] = useState(null)
  
  const [notificationSettings, setNotificationSettings] = useState({
  phoneNumber: '',
  ttsEnabled: false,
  smsEnabled: false,
  callsEnabled: false,
  registered: false,
  termsAccepted: false
})
const [signalwireStatus, setSignalwireStatus] = useState({
  enabled: false,
  registeredPhones: []
})
  const toggleVolume = () => {
    const newValue = !volumeEnabled
    setVolumeEnabled(newValue)
    // Sync with notification settings
    if (notificationSettings.registered) {
      setNotificationSettings(prev => ({
        ...prev,
        ttsEnabled: newValue
      }))
    }
  }
  
  const triggeredLevelsRef = useRef(new Set())

  const volumeEnabledRef = useRef(false)
  const volumeRef = useRef(0.8)
  const selectedVoiceRef = useRef(null)

  useEffect(() => { volumeEnabledRef.current = volumeEnabled }, [volumeEnabled])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { selectedVoiceRef.current = selectedVoice }, [selectedVoice])
  const instanceIdRef = useRef(Math.random().toString(36).slice(2, 8))

  useEffect(() => {
    console.log("[TankMonitor mount]", instanceIdRef.current)
    return () => console.log("[TankMonitor unmount]", instanceIdRef.current)
  }, [])

  useEffect(() => {
    console.log("[volumeEnabled changed]", instanceIdRef.current, volumeEnabled)
  }, [volumeEnabled])


  // Initialize speech synthesis and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
      
      const loadVoices = () => {
        const availableVoices = synthRef.current.getVoices()
        setVoices(availableVoices)
        
        // Prefer natural sounding voices
        const preferredVoices = [
          'Google US English',
          'Google UK English Female',
          'Google UK English Male',
          'Microsoft Zira',
          'Microsoft David',
          'Samantha',
          'Karen',
          'Daniel',
          'Alex'
        ]
        
        let voice = null
        for (const preferred of preferredVoices) {
          voice = availableVoices.find(v => v.name.includes(preferred))
          if (voice) break
        }
        
        // Fallback to first English voice
        if (!voice) {
          voice = availableVoices.find(v => v.lang.startsWith('en'))
        }
        
        if (voice && !selectedVoice) {
          setSelectedVoice(voice)
        }
      }
      
      loadVoices()
      synthRef.current.onvoiceschanged = loadVoices
    }
  }, [])

  const speak = useCallback((text) => {
  const enabled = volumeEnabledRef.current
  console.log("speak() called", instanceIdRef.current, "volumeEnabled:", volumeEnabled)

  console.log("speak() called", { enabled, hasSynth: !!synthRef.current })

  if (!synthRef.current) {
    console.warn("TTS: speechSynthesis not available")
    return
  }

  if (!enabled) {
    console.log("TTS: volume disabled, skipping")
    return
  }

  synthRef.current.cancel()

  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = volumeRef.current

    const voice = selectedVoiceRef.current
    if (voice) utterance.voice = voice

    utterance.onend = () => console.log("TTS finished speaking")
    utterance.onerror = (e) => console.error("TTS error:", e?.error || e)

    if (synthRef.current.paused) synthRef.current.resume()

    synthRef.current.speak(utterance)
  }, 150)
}, [])


  // Get API URL
  const getApiUrl = () => {
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    return process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3101' : '/msg')
  }

  // API call helper
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

  // Use shared WebSocket context
  const { connected: wsConnected, tankData } = useWebSocket()

  // Update connection status from context
  useEffect(() => {
    setConnected(wsConnected)
    if (wsConnected) {
      setChatMessages(prev => [...prev, { type: 'system', text: 'Connected to tank monitoring system.' }])
    }
  }, [wsConnected])

 // Fetch SignalWire status on mount
  useEffect(() => {
    const fetchSignalWireStatus = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/signalwire/status`)
        if (res.ok) {
          const data = await res.json()
          setSignalwireStatus(data)
        }
      } catch (e) {
        console.error('Failed to fetch SignalWire status:', e)
      }
    }
    fetchSignalWireStatus()
  }, [])

  // Handle tank data updates from context
  useEffect(() => {
    if (!tankData) return

    const tankStateData = tankData.tank || tankData
    setTankState(tankStateData)


    if (tankData.aiAnalysis) {
      setAiAnalysis(tankData.aiAnalysis)
    }

    if (tankData.hallucination) {
      setHallucination(tankData.hallucination)
    }

    if (tankData.supervisor) {
      setSupervisorStatus(tankData.supervisor)
    }

    if (tankData.anomalyState) {
      const anomalyState = tankData.anomalyState
      const currentAiAnalysis = tankData.aiAnalysis

      if (alarmState.alarmDisabled) {
        return
      }

      const now = Date.now()

      if (anomalyState.hasAnomaly) {
        setAlarmState(prev => {
          const startTime = prev.anomalyStartTime || now
          const duration = (now - startTime) / 1000

          let newLevel = 0
          if (duration >= 15) newLevel = 3
          else if (duration >= 10) newLevel = 2
          else if (duration >= 5) newLevel = 1

          if (newLevel > prev.escalationLevel && !triggeredLevelsRef.current.has(newLevel)) {
            console.log('Triggering escalation level:', newLevel)
            triggeredLevelsRef.current.add(newLevel)

            if (newLevel === 1) {
              setChatMessages(msgs => [...msgs, {
                type: 'alert',
                text: '⚠️ HMI ALERT: Unusual activity detected! Displaying warning on operator screen.'
              }])
            } else if (newLevel === 2) {
              setChatMessages(msgs => [...msgs, {
                type: 'alert',
                text: '📧 EMAIL/SMS SENT: Notifying maintenance team of persistent anomaly.'
              }])
            } else if (newLevel === 3) {
              setChatMessages(msgs => [...msgs, {
                type: 'alert',
                text: '📞 PHONE CALL INITIATED: Critical situation - calling supervisor.'
              }])

              let ttsMessage = 'Critical alert! Unusual activity detected in liquid tank system.'
              if (currentAiAnalysis?.reasoning && currentAiAnalysis.reasoning !== 'Analysis unavailable') {
                let cleanReasoning = currentAiAnalysis.reasoning
                cleanReasoning = cleanReasoning.replace(/<think>[\s\S]*?<\/think>/gim, '')
                cleanReasoning = cleanReasoning.replace(/<think>[\s\S]*/gim, '')
                cleanReasoning = cleanReasoning.replace(/<\/think>/gi, '')
                cleanReasoning = cleanReasoning.replace(/<[^>]*>/g, '')
                cleanReasoning = cleanReasoning.replace(/^(Analysis:|Response:|Answer:|Output:|Assessment:)\s*/i, '')
                cleanReasoning = cleanReasoning.replace(/\s+/g, ' ').trim()
                if (cleanReasoning && cleanReasoning.length > 5) {
                  ttsMessage += ` ${cleanReasoning}`
                }
              }
              ttsMessage += ' Supervisor notification initiated.'
              speak(ttsMessage)
            }
          }

          return {
            ...prev,
            anomalyDetected: true,
            anomalyStartTime: startTime,
            escalationLevel: newLevel
          }
        })
      } else {
        setAlarmState(prev => {
          if (prev.anomalyDetected) {
            console.log('Anomaly resolved, clearing escalation')
            triggeredLevelsRef.current.clear()
            return {
              ...prev,
              anomalyDetected: false,
              anomalyStartTime: null,
              escalationLevel: 0
            }
          }
          return prev
        })
      }
    }
  }, [tankData, alarmState.alarmDisabled, speak])

  // Handle anomaly updates and escalation
  const handleAnomalyUpdate = useCallback((anomalyState, currentAiAnalysis) => {
    if (alarmState.alarmDisabled) {
      console.log('Alarm disabled, skipping escalation')
      return
    }

    const now = Date.now()

    if (anomalyState.hasAnomaly) {
      setAlarmState(prev => {
        const startTime = prev.anomalyStartTime || now
        const duration = (now - startTime) / 1000

        let newLevel = 0
        if (duration >= 15) newLevel = 3
        else if (duration >= 10) newLevel = 2
        else if (duration >= 5) newLevel = 1

        console.log('Escalation check:', {
          duration: duration.toFixed(1),
          newLevel,
          prevLevel: prev.escalationLevel,
          triggered: Array.from(triggeredLevelsRef.current)
        })

        if (newLevel > prev.escalationLevel && !triggeredLevelsRef.current.has(newLevel)) {
          console.log('Triggering escalation level:', newLevel)
          triggeredLevelsRef.current.add(newLevel)

          if (newLevel === 1) {
            setChatMessages(msgs => [...msgs, {
              type: 'alert',
              text: '⚠️ HMI ALERT: Unusual activity detected! Displaying warning on operator screen.'
            }])
          } else if (newLevel === 2) {
            setChatMessages(msgs => [...msgs, {
              type: 'alert',
              text: '📧 EMAIL/SMS SENT: Notifying maintenance team of persistent anomaly.'
            }])
          } else if (newLevel === 3) {
            setChatMessages(msgs => [...msgs, {
              type: 'alert',
              text: '📞 PHONE CALL INITIATED: Critical situation - calling supervisor.'
            }])

            let ttsMessage = 'Critical alert! Unusual activity detected in liquid tank system.'
            if (currentAiAnalysis?.reasoning && currentAiAnalysis.reasoning !== 'Analysis unavailable') {
              let cleanReasoning = currentAiAnalysis.reasoning
              cleanReasoning = cleanReasoning.replace(/<think>[\s\S]*?<\/think>/gim, '')
              cleanReasoning = cleanReasoning.replace(/<think>[\s\S]*/gim, '')
              cleanReasoning = cleanReasoning.replace(/<\/think>/gi, '')
              cleanReasoning = cleanReasoning.replace(/<[^>]*>/g, '')
              cleanReasoning = cleanReasoning.replace(/^(Analysis:|Response:|Answer:|Output:|Assessment:)\s*/i, '')
              cleanReasoning = cleanReasoning.replace(/\s+/g, ' ').trim()
              if (cleanReasoning && cleanReasoning.length > 5) {
                ttsMessage += ` ${cleanReasoning}`
              }
            }
            ttsMessage += ' Supervisor notification initiated.'
            speak(tttsMessage)
          }
        }

        return {
          ...prev,
          anomalyDetected: true,
          anomalyStartTime: startTime,
          escalationLevel: newLevel
        }
      })
    } else {
      setAlarmState(prev => {
        if (prev.anomalyDetected) {
          console.log('Anomaly resolved, clearing escalation')
          triggeredLevelsRef.current.clear()
          return {
            ...prev,
            anomalyDetected: false,
            anomalyStartTime: null,
            escalationLevel: 0
          }
        }
        return prev
      })
    }
  }, [alarmState.alarmDisabled, speak])

    const handlePhoneNumberChange = (e) => {
    setNotificationSettings(prev => ({
      ...prev,
      phoneNumber: e.target.value
    }))
  }

  const handleTermsChange = (e) => {
    setNotificationSettings(prev => ({
      ...prev,
      termsAccepted: e.target.checked
    }))
  }

  const handleTTSEnabledChange = (e) => {
    setNotificationSettings(prev => ({
      ...prev,
      ttsEnabled: e.target.checked
    }))
  }

  const handleSMSEnabledChange = (e) => {
    setNotificationSettings(prev => ({
      ...prev,
      smsEnabled: e.target.checked
    }))
  }

  const handleCallsEnabledChange = (e) => {
    setNotificationSettings(prev => ({
      ...prev,
      callsEnabled: e.target.checked
    }))
  }

  const handleRegisterPhone = async () => {
    if (!notificationSettings.termsAccepted) {
      setChatMessages(prev => [...prev, { 
        type: 'alert', 
        text: 'Please accept the terms and conditions to register your phone number.' 
      }])
      return
    }

    if (!notificationSettings.phoneNumber) {
      setChatMessages(prev => [...prev, { 
        type: 'alert', 
        text: 'Please enter a phone number in E.164 format (+1234567890).' 
      }])
      return
    }

    try {
      const res = await apiCall('/signalwire/register', {
        phoneNumber: notificationSettings.phoneNumber,
        ttsEnabled: notificationSettings.ttsEnabled,
        smsEnabled: notificationSettings.smsEnabled,
        callsEnabled: notificationSettings.callsEnabled
      })

      if (res && res.success) {
        setNotificationSettings(prev => ({
          ...prev,
          registered: true
        }))
        setChatMessages(prev => [...prev, { 
          type: 'system', 
          text: `Phone number ${res.phoneNumber} registered for notifications.` 
        }])
        
        // Refresh status
        const statusRes = await fetch(`${getApiUrl()}/signalwire/status`)
        if (statusRes.ok) {
          const data = await statusRes.json()
          setSignalwireStatus(data)
        }
      } else {
        setChatMessages(prev => [...prev, { 
          type: 'alert', 
          text: `Registration failed: ${res?.error || 'Unknown error'}` 
        }])
      }
    } catch (e) {
      console.error('Phone registration error:', e)
      setChatMessages(prev => [...prev, { 
        type: 'alert', 
        text: 'Failed to register phone number. Please check your connection.' 
      }])
    }
  }

  const handleUnregisterPhone = async () => {
    try {
      const res = await apiCall('/signalwire/unregister', {
        phoneNumber: notificationSettings.phoneNumber
      })

      if (res && res.success) {
        setNotificationSettings({
          phoneNumber: '',
          ttsEnabled: false,
          smsEnabled: false,
          callsEnabled: false,
          registered: false,
          termsAccepted: false
        })
        setChatMessages(prev => [...prev, { 
          type: 'system', 
          text: 'Phone number unregistered successfully.' 
        }])
        
        // Refresh status
        const statusRes = await fetch(`${getApiUrl()}/signalwire/status`)
        if (statusRes.ok) {
          const data = await statusRes.json()
          setSignalwireStatus(data)
        }
      } else {
        setChatMessages(prev => [...prev, { 
          type: 'alert', 
          text: `Unregistration failed: ${res?.error || 'Unknown error'}` 
        }])
      }
    } catch (e) {
      console.error('Phone unregistration error:', e)
      setChatMessages(prev => [...prev, { 
        type: 'alert', 
        text: 'Failed to unregister phone number. Please check your connection.' 
      }])
    }
  }


   // Fault injection handlers
  const toggleHighSensorDisabled = () => {
    const newVal = !faults.highSensorDisabled
    setFaults(prev => ({ ...prev, highSensorDisabled: newVal }))
    apiCall('/tank/fault', { type: 'highSensorDisabled', value: newVal })
  }

  const toggleLowSensorDisabled = () => {
    const newVal = !faults.lowSensorDisabled
    setFaults(prev => ({ ...prev, lowSensorDisabled: newVal }))
    apiCall('/tank/fault', { type: 'lowSensorDisabled', value: newVal })
  }

  const toggleHighSensorForced = () => {
    const newVal = !faults.highSensorForcedOn
    setFaults(prev => ({ ...prev, highSensorForcedOn: newVal }))
    apiCall('/tank/fault', { type: 'highSensorForcedOn', value: newVal })
  }

  const toggleLowSensorForced = () => {
    const newVal = !faults.lowSensorForcedOn
    setFaults(prev => ({ ...prev, lowSensorForcedOn: newVal }))
    apiCall('/tank/fault', { type: 'lowSensorForcedOn', value: newVal })
  }

  const toggleLevelNegative = () => {
    const newVal = !faults.levelForceNegative
    setFaults(prev => ({ ...prev, levelForceNegative: newVal }))
    apiCall('/tank/fault', { type: 'levelForceNegative', value: newVal })
  }

  const toggleLevelZero = () => {
    const newVal = !faults.levelForceZero
    setFaults(prev => ({ ...prev, levelForceZero: newVal }))
    apiCall('/tank/fault', { type: 'levelForceZero', value: newVal })
  }

  const toggleLevelLocked = () => {
    const newVal = !faults.levelLocked
    setFaults(prev => ({ ...prev, levelLocked: newVal }))
    apiCall('/tank/fault', { type: 'levelLocked', value: newVal })
  }

  const toggleFillingPaused = () => {
    const newVal = !faults.fillingPaused
    setFaults(prev => ({ ...prev, fillingPaused: newVal }))
    apiCall('/tank/fault', { type: 'fillingPaused', value: newVal })
  }

  const resetSystem = () => {
    setFaults({
      highSensorDisabled: false,
      lowSensorDisabled: false,
      highSensorForcedOn: false,
      lowSensorForcedOn: false,
      levelForceNegative: false,
      levelForceZero: false,
      levelLocked: false,
      fillingPaused: false
    })
    setAlarmState({
      anomalyDetected: false,
      anomalyStartTime: null,
      escalationLevel: 0,
      alarmDisabled: false,
      triggeredLevels: new Set()
    })
    triggeredLevelsRef.current.clear()
    setChatMessages([{ type: 'system', text: 'System reset. AI Monitor reinitialized.' }])
    apiCall('/tank/reset')
  }

  const toggleAlarm = () => {
    setAlarmState(prev => ({ ...prev, alarmDisabled: !prev.alarmDisabled }))
  }

  // Calculate tank fill percentage for visualization
  const fillPercentage = Math.max(0, Math.min(100, tankState.liquidLevel))

  const containerStyle = fullPage ? {
    minHeight: '100vh',
    padding: '6rem 1rem 2rem'
  } : {}

  return (
    <section 
      id="tank-monitor"
      ref={ref}
      style={{
        padding: fullPage ? 0 : 'clamp(3rem, 8vw, 6rem) clamp(1rem, 5vw, 4rem)',
        position: 'relative',
        ...containerStyle
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <h2 className="gradient-text" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.5rem' }}>
                  AI Anomaly Detection
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  OPC-UA Liquid Tank Monitoring with AI-Powered Fault Detection
                </p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: connected ? '#10b981' : '#ef4444',
                  boxShadow: connected ? '0 0 10px #10b981' : '0 0 10px #ef4444',
                  animation: connected ? 'pulse 2s infinite' : 'none'
                }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                  {connected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
            
            {/* Problem & Value Description */}
            <div style={{
              background: 'rgba(168,85,247,0.05)',
              border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '0.5rem'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: '#a855f7' }}>Problem:</strong> Industrial control systems are vulnerable to cyber attacks that manipulate sensor data, causing operators to miss critical events like tank overflows or equipment failures. Traditional alarms only trigger on threshold violations, missing sophisticated attacks that disable sensors or spoof readings.
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '0.5rem' }}>
                <strong style={{ color: '#10b981' }}>Solution:</strong> AI continuously monitors sensor relationships (e.g., high sensor should activate when level ≥90%). When inconsistencies are detected, the system escalates through HMI alerts → maintenance notifications → supervisor phone calls.
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '0.5rem' }}>
                <strong style={{ color: '#fbbf24' }}>Business Value:</strong> Prevents costly spills, equipment damage, and safety incidents. Industrial anomaly detection is a growing market as OT security becomes critical infrastructure. Reduces unplanned downtime by catching failures before they cascade.
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {/* Tank Visualization */}
            <div style={{
              background: 'rgba(0,212,255,0.05)',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div className="mono" style={{ color: '#00d4ff', fontSize: '0.7rem', marginBottom: '1rem' }}>
                LIQUID TANK STATUS
              </div>
              
              {/* Tank SVG */}
              <div style={{ position: 'relative', width: 180, height: 240 }}>
                <svg viewBox="0 0 100 140" style={{ width: '100%', height: '100%' }}>
                  {/* Tank outline */}
                  <rect x="10" y="10" width="80" height="120" rx="5" 
                    fill="rgba(0,0,0,0.3)" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="2"
                  />
                  
                  {/* Liquid fill */}
                  <defs>
                    <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.8"/>
                      <stop offset="100%" stopColor="#0066ff" stopOpacity="0.9"/>
                    </linearGradient>
                    <clipPath id="tankClip">
                      <rect x="12" y="12" width="76" height="116" rx="3"/>
                    </clipPath>
                  </defs>
                  
                  <rect 
                    x="12" 
                    y={12 + (116 * (1 - fillPercentage / 100))} 
                    width="76" 
                    height={116 * (fillPercentage / 100)}
                    fill="url(#liquidGradient)"
                    clipPath="url(#tankClip)"
                  >
                    <animate 
                      attributeName="y" 
                      dur="0.5s" 
                      fill="freeze"
                    />
                  </rect>
                  
                  {/* Wave effect */}
                  {tankState.liquidFilling && (
                    <path
                      d={`M 12 ${12 + (116 * (1 - fillPercentage / 100))} 
                          Q 30 ${8 + (116 * (1 - fillPercentage / 100))} 50 ${12 + (116 * (1 - fillPercentage / 100))}
                          T 88 ${12 + (116 * (1 - fillPercentage / 100))}`}
                      fill="none"
                      stroke="#00d4ff"
                      strokeWidth="2"
                      opacity="0.5"
                    >
                      <animate
                        attributeName="d"
                        dur="1s"
                        repeatCount="indefinite"
                        values={`
                          M 12 ${12 + (116 * (1 - fillPercentage / 100))} Q 30 ${8 + (116 * (1 - fillPercentage / 100))} 50 ${12 + (116 * (1 - fillPercentage / 100))} T 88 ${12 + (116 * (1 - fillPercentage / 100))};
                          M 12 ${12 + (116 * (1 - fillPercentage / 100))} Q 30 ${16 + (116 * (1 - fillPercentage / 100))} 50 ${12 + (116 * (1 - fillPercentage / 100))} T 88 ${12 + (116 * (1 - fillPercentage / 100))};
                          M 12 ${12 + (116 * (1 - fillPercentage / 100))} Q 30 ${8 + (116 * (1 - fillPercentage / 100))} 50 ${12 + (116 * (1 - fillPercentage / 100))} T 88 ${12 + (116 * (1 - fillPercentage / 100))}
                        `}
                      />
                    </path>
                  )}
                  
                  {/* High sensor indicator */}
                  <circle 
                    cx="95" 
                    cy="24" 
                    r="5" 
                    fill={tankState.liquidHigh ? '#ef4444' : '#374151'}
                    stroke={faults.highSensorDisabled ? '#fbbf24' : 'none'}
                    strokeWidth="2"
                    strokeDasharray={faults.highSensorDisabled ? '2,2' : 'none'}
                  />
                  <text x="95" y="38" textAnchor="middle" fill="#888" fontSize="6">HIGH</text>
                  
                  {/* Low sensor indicator */}
                  <circle 
                    cx="95" 
                    cy="116" 
                    r="5" 
                    fill={tankState.liquidLow ? '#fbbf24' : '#374151'}
                    stroke={faults.lowSensorDisabled ? '#fbbf24' : 'none'}
                    strokeWidth="2"
                    strokeDasharray={faults.lowSensorDisabled ? '2,2' : 'none'}
                  />
                  <text x="95" y="130" textAnchor="middle" fill="#888" fontSize="6">LOW</text>
                  
                  {/* Level markers */}
                  <line x1="5" y1="24" x2="10" y2="24" stroke="#888" strokeWidth="1"/>
                  <text x="3" y="26" textAnchor="end" fill="#666" fontSize="5">90</text>
                  <line x1="5" y1="104" x2="10" y2="104" stroke="#888" strokeWidth="1"/>
                  <text x="3" y="106" textAnchor="end" fill="#666" fontSize="5">20</text>
                </svg>
                
                {/* Direction indicator */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: -30,
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  {tankState.direction === 'up' ? (
                    <ArrowUp size={20} color="#10b981" />
                  ) : (
                    <ArrowDown size={20} color="#3b82f6" />
                  )}
                  <span style={{ fontSize: '0.5rem', color: '#888' }}>
                    {tankState.direction === 'up' ? 'FILL' : 'DRAIN'}
                  </span>
                </div>
              </div>
              
              {/* Level readout */}
              <div style={{ 
                marginTop: '1rem', 
                textAlign: 'center',
                padding: '0.5rem 1rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px'
              }}>
                <div className="mono" style={{ 
                  fontSize: '2rem', 
                  fontWeight: 'bold',
                  color: tankState.liquidLevel < 0 ? '#ef4444' : '#00d4ff'
                }}>
                  {tankState.liquidLevel.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.6rem', color: '#888' }}>LIQUID LEVEL</div>
              </div>
              
              {/* OPC-UA Tags */}
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.6rem'
              }}>
                <div style={{ color: '#888', marginBottom: '0.25rem' }}>// OPC-UA TAGS</div>
                <div style={{ color: '#00d4ff' }}>LiquidLevel: {tankState.liquidLevel?.toFixed(1)}%</div>
                <div style={{ color: tankState.liquidFilling ? '#10b981' : '#888' }}>LiquidFilling: {tankState.liquidFilling ? 'TRUE' : 'FALSE'}</div>
                <div style={{ color: tankState.liquidHigh ? '#ef4444' : '#888' }}>LiquidHigh: {tankState.liquidHigh ? 'TRUE' : 'FALSE'}</div>
                <div style={{ color: tankState.liquidLow ? '#fbbf24' : '#888' }}>LiquidLow: {tankState.liquidLow ? 'TRUE' : 'FALSE'}</div>
              </div>
              
              {/* Start/Stop Button */}
              {/* <button
                onClick={toggleFillingPaused}
                style={{
                  marginTop: '0.75rem',
                  width: '100%',
                  padding: '0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: faults.fillingPaused ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  border: `1px solid ${faults.fillingPaused ? '#10b981' : '#ef4444'}`,
                  borderRadius: '8px',
                  color: faults.fillingPaused ? '#10b981' : '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {faults.fillingPaused ? (
                  <>▶ Start Filling</>
                ) : (
                  <>⏸ Stop Filling</>
                )}
              </button> */}
              
              {/* Status indicators */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1rem',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                <StatusBadge 
                  label="FILLING" 
                  active={tankState.liquidFilling} 
                  color="#10b981"
                />
                <StatusBadge 
                  label="HIGH" 
                  active={tankState.liquidHigh} 
                  color="#ef4444"
                  warning={faults.highSensorDisabled || faults.highSensorForcedOn}
                />
                <StatusBadge 
                  label="LOW" 
                  active={tankState.liquidLow} 
                  color="#fbbf24"
                  warning={faults.lowSensorDisabled || faults.lowSensorForcedOn}
                />
              </div>
            </div>

            {/* Fault Injection Panel */}
            <div style={{
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '12px',
              padding: '1rem'
            }}>
              <div className="mono" style={{ color: '#ef4444', fontSize: '0.7rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={14} />
                FAULT INJECTION (ATTACK SIMULATION)
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <FaultButton 
                  active={faults.highSensorDisabled}
                  onClick={toggleHighSensorDisabled}
                  icon={<EyeOff size={12} />}
                  label="Disable High Sensor"
                  description="Mask high level alarm"
                />
                <FaultButton 
                  active={faults.lowSensorDisabled}
                  onClick={toggleLowSensorDisabled}
                  icon={<EyeOff size={12} />}
                  label="Disable Low Sensor"
                  description="Mask low level alarm"
                />
                <FaultButton 
                  active={faults.highSensorForcedOn}
                  onClick={toggleHighSensorForced}
                  icon={<Eye size={12} />}
                  label="Force High On (Out of Range)"
                  description="Enable high when level < 90"
                />
                <FaultButton 
                  active={faults.lowSensorForcedOn}
                  onClick={toggleLowSensorForced}
                  icon={<Eye size={12} />}
                  label="Force Low On (Out of Range)"
                  description="Enable low when level > 20"
                />
                <FaultButton 
                  active={faults.levelForceNegative}
                  onClick={toggleLevelNegative}
                  icon={<Minus size={12} />}
                  label="Force Level Negative"
                  description="Inject -10% reading"
                />
                <FaultButton 
                  active={faults.levelForceZero}
                  onClick={toggleLevelZero}
                  icon={<Activity size={12} />}
                  label="Force Level to Zero"
                  description="Stuck at 0% reading"
                />
                <FaultButton 
                  active={faults.levelLocked}
                  onClick={toggleLevelLocked}
                  icon={<Lock size={12} />}
                  label="Lock Level Value"
                  description="Freeze current reading"
                />
              </div>
            </div>

            {/* Escalation Status Panel */}
            <div style={{
              background: 'rgba(251,191,36,0.05)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: '12px',
              padding: '1rem'
            }}>
              <div className="mono" style={{ color: '#fbbf24', fontSize: '0.7rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={14} />
                ESCALATION STATUS
              </div>
              
              {/* Escalation timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <EscalationLevel 
                  level={1}
                  currentLevel={alarmState.escalationLevel}
                  icon={<AlertTriangle size={16} />}
                  label="HMI Alert"
                  description="5 seconds - Display warning"
                  disabled={alarmState.alarmDisabled}
                />
                <EscalationLevel 
                  level={2}
                  currentLevel={alarmState.escalationLevel}
                  icon={<Mail size={16} />}
                  label="Email/SMS"
                  description="10 seconds - Notify maintenance"
                  disabled={alarmState.alarmDisabled}
                />
                <EscalationLevel 
                  level={3}
                  currentLevel={alarmState.escalationLevel}
                  icon={<Phone size={16} />}
                  label="Phone Call"
                  description="15 seconds - Call supervisor"
                  disabled={alarmState.alarmDisabled}
                />
              </div>
                        {/* Notification Settings Panel - SignalWire */}
          {signalwireStatus.signalwireEnabled && (
            <div style={{
              background: 'rgba(59,130,246,0.05)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '12px',
              padding: '1rem'
            }}>
              <div className="mono" style={{ color: '#3b82f6', fontSize: '0.7rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={14} />
                NOTIFICATION SETTINGS (SignalWire)
              </div>
              
              {!notificationSettings.registered ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Phone Number Input */}
                  <div>
                    <label style={{ fontSize: '0.65rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>
                      Phone Number (E.164 format)
                    </label>
                    <input
                      type="tel"
                      value={notificationSettings.phoneNumber}
                      onChange={handlePhoneNumberChange}
                      placeholder="+12345678900"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  {/* TTS Checkbox */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px'
                  }}>
                    <input
                      type="checkbox"
                      id="tts-enabled"
                      checked={notificationSettings.ttsEnabled}
                      onChange={handleTTSEnabledChange}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="tts-enabled" style={{ fontSize: '0.65rem', color: '#fff', cursor: 'pointer', flex: 1 }}>
                      Enable Text-to-Speech Alerts (Browser)
                    </label>
                  </div>

                  {/* SMS Checkbox */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px'
                  }}>
                    <input
                      type="checkbox"
                      id="sms-enabled"
                      checked={notificationSettings.smsEnabled}
                      onChange={handleSMSEnabledChange}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="sms-enabled" style={{ fontSize: '0.65rem', color: '#fff', cursor: 'pointer', flex: 1 }}>
                      Enable SMS Notifications (Level 2)
                    </label>
                  </div>

                  {/* Calls Checkbox */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px'
                  }}>
                    <input
                      type="checkbox"
                      id="calls-enabled"
                      checked={notificationSettings.callsEnabled}
                      onChange={handleCallsEnabledChange}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="calls-enabled" style={{ fontSize: '0.65rem', color: '#fff', cursor: 'pointer', flex: 1 }}>
                      Enable Phone Calls (Level 3)
                    </label>
                  </div>

                  {/* Terms Checkbox */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px dashed rgba(239,68,68,0.3)',
                    borderRadius: '6px'
                  }}>
                    <input
                      type="checkbox"
                      id="terms-accepted"
                      checked={notificationSettings.termsAccepted}
                      onChange={handleTermsChange}
                      style={{ cursor: 'pointer', marginTop: '0.15rem' }}
                    />
                    <label htmlFor="terms-accepted" style={{ fontSize: '0.6rem', color: '#fbbf24', cursor: 'pointer', flex: 1, lineHeight: '1.3' }}>
                      I agree to receive SMS and/or phone call notifications for this simulation. Standard messaging and data rates may apply.
                    </label>
                  </div>

                  {/* Register Button */}
                  <motion.button
                    onClick={handleRegisterPhone}
                    whileTap={{ scale: 0.98 }}
                    disabled={!notificationSettings.termsAccepted || !notificationSettings.phoneNumber}
                    style={{
                      padding: '0.6rem',
                      background: (notificationSettings.termsAccepted && notificationSettings.phoneNumber) ? 
                        'linear-gradient(135deg, #3b82f6, #2563eb)' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      cursor: (notificationSettings.termsAccepted && notificationSettings.phoneNumber) ? 
                        'pointer' : 'not-allowed',
                      opacity: (notificationSettings.termsAccepted && notificationSettings.phoneNumber) ? 1 : 0.5
                    }}
                  >
                    Register Phone Number
                  </motion.button>

                  {/* Status Info */}
                  {signalwireStatus.registeredPhones && signalwireStatus.registeredPhones.length > 0 && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: '6px',
                      fontSize: '0.6rem',
                      color: '#10b981'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        Registered Phones: {signalwireStatus.registeredPhones.length}
                      </div>
                      {signalwireStatus.registeredPhones.map((p, i) => (
                        <div key={i} style={{ color: '#888' }}>
                          {p.phone} - SMS: {p.smsEnabled ? 'Yes' : 'No'}, Calls: {p.callsEnabled ? 'Yes' : 'No'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
                      ✓ Phone Registered
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#888' }}>
                      {notificationSettings.phoneNumber}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '0.5rem' }}>
                      • TTS: {notificationSettings.ttsEnabled ? 'Enabled' : 'Disabled'}<br/>
                      • SMS (Level 2): {notificationSettings.smsEnabled ? 'Enabled' : 'Disabled'}<br/>
                      • Calls (Level 3): {notificationSettings.callsEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>

                  <motion.button
                    onClick={handleUnregisterPhone}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: '0.6rem',
                      background: 'rgba(239,68,68,0.2)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '6px',
                      color: '#ef4444',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      cursor: 'pointer'
                    }}
                  >
                    Unregister Phone
                  </motion.button>
                </div>
              )}
            </div>
          )}
              
              {/* Control buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginTop: '1rem',
                flexWrap: 'wrap'
              }}>
                <ControlButton 
                  onClick={toggleAlarm}
                  icon={alarmState.alarmDisabled ? <BellOff size={14} /> : <Bell size={14} />}
                  label={alarmState.alarmDisabled ? 'Enable Alarm' : 'Disable Alarm'}
                  color={alarmState.alarmDisabled ? '#ef4444' : '#10b981'}
                />
                <ControlButton 
                  onClick={resetSystem}
                  icon={<RotateCcw size={14} />}
                  label="Reset System"
                  color="#a855f7"
                />
              </div>
              
              {/* TTS Controls */}
              <div style={{ 
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: '8px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <Volume2 size={14} color="#00d4ff" />
                  <span style={{ fontSize: '0.7rem', color: '#00d4ff', fontWeight: 600 }}>TTS CONTROLS</span>
                </div>
                
                {/* Enable/Disable Toggle */}
                <button
                  onClick={() => toggleVolume()}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    background: volumeEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                    border: `1px solid ${volumeEnabled ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`,
                    borderRadius: '6px',
                    color: volumeEnabled ? '#10b981' : '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {volumeEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {volumeEnabled ? 'TTS Enabled' : 'TTS Disabled'}
                </button>
                
                {volumeEnabled && (
                  <>
                    {/* Voice Selection */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.6rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>
                        Voice
                      </label>
                      <select
                        value={selectedVoice?.name || ''}
                        onChange={(e) => {
                          const voice = voices.find(v => v.name === e.target.value)
                          if (voice) setSelectedVoice(voice)
                        }}
                        style={{
                          width: '100%',
                          padding: '0.4rem',
                          fontSize: '0.65rem',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        {voices.filter(v => v.lang.startsWith('en')).map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Volume Slider */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.25rem'
                      }}>
                        <label style={{ fontSize: '0.6rem', color: '#888' }}>Volume</label>
                        <span style={{ fontSize: '0.6rem', color: '#00d4ff' }}>{Math.round(volume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume * 100}
                        onChange={(e) => setVolume(e.target.value / 100)}
                        style={{
                          width: '100%',
                          height: '4px',
                          cursor: 'pointer',
                          accentColor: '#00d4ff'
                        }}
                      />
                    </div>
                    
                    {/* Test Button */}
                    <button
                      onClick={() => speak('Testing text to speech. Volume ' + Math.round(volume * 100) + ' percent.')}
                      style={{
                        marginTop: '0.5rem',
                        width: '100%',
                        padding: '0.5rem',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        background: 'rgba(0,212,255,0.1)',
                        border: '1px solid rgba(0,212,255,0.3)',
                        borderRadius: '6px',
                        color: '#00d4ff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Volume2 size={12} />
                      Test TTS
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* AI Monitor Log */}
            <div style={{
              background: 'rgba(168,85,247,0.05)',
              border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: '12px',
              padding: '1rem',
              gridColumn: 'span 1',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '400px'
            }}>
              <div className="mono" style={{ color: '#a855f7', fontSize: '0.7rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={14} />
                AI MONITOR LOG
              </div>
              
              <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                fontSize: '0.7rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                {chatMessages.slice(-20).reverse().map((msg, i) => (
                  <div key={i} style={{
                    padding: '0.4rem',
                    borderRadius: '4px',
                    background: msg.type === 'alert' ? 'rgba(239,68,68,0.1)' :
                                msg.type === 'warning' ? 'rgba(251,191,36,0.1)' :
                                'rgba(255,255,255,0.03)',
                    color: msg.type === 'alert' ? '#ef4444' :
                           msg.type === 'warning' ? '#fbbf24' :
                           'var(--text-secondary)',
                    borderLeft: `2px solid ${
                      msg.type === 'alert' ? '#ef4444' :
                      msg.type === 'warning' ? '#fbbf24' :
                      '#374151'
                    }`
                  }}>
                    {msg.text}
                  </div>
                ))}
              </div>
              
              {/* AI Analysis */}
              {aiAnalysis && aiAnalysis.status === 'ANOMALY' && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '6px',
                  fontSize: '0.65rem'
                }}>
                  <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertTriangle size={12} />
                    ANOMALY DETECTED
                  </div>
                  {/* Show detected issues */}
                  {aiAnalysis.anomalies?.length > 0 && (
                    <div style={{ marginBottom: '0.25rem' }}>
                      {aiAnalysis.anomalies.map((a, i) => (
                        <div key={i} style={{ color: '#fbbf24', fontSize: '0.6rem' }}>
                          • {a.message}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Show AI reasoning (cleaned) */}
                  {aiAnalysis.reasoning && aiAnalysis.reasoning !== 'Analysis unavailable' && (
                    <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      {(() => {
                        // Clean up reasoning text
                        let text = aiAnalysis.reasoning || ''
                        // Remove closed think tags (multiline)
                        text = text.replace(/<think>[\s\S]*?<\/think>/gim, '')
                        // Remove unclosed think tags (everything after <think>)
                        text = text.replace(/<think>[\s\S]*/gim, '')
                        // Remove orphaned </think>
                        text = text.replace(/<\/think>/gi, '')
                        // Remove any other HTML/XML tags
                        text = text.replace(/<[^>]*>/g, '')
                        // Remove common prefixes
                        text = text.replace(/^(Analysis:|Response:|Answer:|Output:|Assessment:)\s*/i, '')
                        // Normalize whitespace
                        text = text.replace(/\s+/g, ' ').trim()
                        if (!text || text.length < 5) return null
                        return text.length > 150 ? text.substring(0, 150) + '...' : text
                      })()}
                    </div>
                  )}
                </div>
              )}
              
              {/* Normal status */}
              {aiAnalysis && aiAnalysis.status === 'NORMAL' && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '6px',
                  fontSize: '0.65rem'
                }}>
                  <div style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ✓ System Normal
                  </div>
                </div>
              )}
            </div>

            {/* Hallucination Detection Panel */}
            <div style={{
              background: 'rgba(251,191,36,0.05)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: '12px',
              padding: '1rem',
              maxWidth: '400px'
            }}>
              <div className="mono" style={{ color: '#fbbf24', fontSize: '0.7rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Brain size={14} />
                LLM RELIABILITY MONITOR
              </div>
              
              {hallucination ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Risk Level Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    background: hallucination.riskLevel === 'CRITICAL' ? 'rgba(239,68,68,0.15)' :
                               hallucination.riskLevel === 'WARNING' ? 'rgba(251,191,36,0.15)' :
                               'rgba(16,185,129,0.15)',
                    border: `1px solid ${
                      hallucination.riskLevel === 'CRITICAL' ? '#ef4444' :
                      hallucination.riskLevel === 'WARNING' ? '#fbbf24' :
                      '#10b981'
                    }`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Shield size={16} style={{ 
                        color: hallucination.riskLevel === 'CRITICAL' ? '#ef4444' :
                               hallucination.riskLevel === 'WARNING' ? '#fbbf24' : '#10b981'
                      }} />
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        color: hallucination.riskLevel === 'CRITICAL' ? '#ef4444' :
                               hallucination.riskLevel === 'WARNING' ? '#fbbf24' : '#10b981'
                      }}>
                        {hallucination.riskLevel}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 'bold',
                      color: hallucination.riskLevel === 'CRITICAL' ? '#ef4444' :
                             hallucination.riskLevel === 'WARNING' ? '#fbbf24' : '#10b981'
                    }}>
                      {hallucination.risk}%
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '0.5rem'
                  }}>
                    <MetricBox 
                      label="Perplexity" 
                      value={hallucination.perplexity?.toFixed(2) || '0.00'}
                      threshold="< 25.0"
                      isWarning={hallucination.perplexity > 25}
                      icon={<Zap size={12} />}
                    />
                    <MetricBox 
                      label="Entropy" 
                      value={`${hallucination.entropy?.toFixed(3) || '0.000'} bits`}
                      threshold="< 1.5"
                      isWarning={hallucination.entropy > 1.5}
                      icon={<Activity size={12} />}
                    />
                    <MetricBox 
                      label="Z-Score" 
                      value={hallucination.zScore?.toFixed(2) || '0.00'}
                      threshold="< 3.0"
                      isWarning={Math.abs(hallucination.zScore || 0) >= 3}
                      icon={<TrendingUp size={12} />}
                    />
                    <MetricBox 
                      label="Smoothness" 
                      value={`${hallucination.smoothness || 0}%`}
                      threshold="> 50%"
                      isWarning={hallucination.smoothness < 50}
                      icon={<Activity size={12} />}
                    />
                  </div>

                  {/* Baseline Status */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    background: hallucination.baselineCalibrated ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)',
                    border: `1px solid ${hallucination.baselineCalibrated ? '#10b981' : '#fbbf24'}`,
                    fontSize: '0.6rem'
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: hallucination.baselineCalibrated ? '#10b981' : '#fbbf24',
                      animation: !hallucination.baselineCalibrated ? 'pulse 1s infinite' : 'none'
                    }} />
                    <span style={{ color: hallucination.baselineCalibrated ? '#10b981' : '#fbbf24' }}>
                      {hallucination.baselineCalibrated ? 'Baseline Calibrated' : 'Calibrating Baseline...'}
                    </span>
                    <span style={{ marginLeft: 'auto', color: '#888' }}>
                      {hallucination.totalDecisions || 0} decisions
                    </span>
                  </div>

                  {/* Migration Warning */}
                  {hallucination.shouldFailover && (
                    <div style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px dashed #ef4444',
                      fontSize: '0.65rem',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertTriangle size={14} />
                      <div>
                        <div style={{ fontWeight: 'bold' }}>Migration Triggered</div>
                        <div style={{ color: '#f87171' }}>{hallucination.migrationReason}</div>
                      </div>
                    </div>
                  )}

                  {/* Supervisor Status */}
                  {supervisorStatus && (
                    <div style={{
                      marginTop: '0.25rem',
                      padding: '0.4rem',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                      fontSize: '0.55rem',
                      color: '#888'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span>Tank Instance: #{supervisorStatus.tankInstance}</span>
                        <span style={{ 
                          color: supervisorStatus.tankEnvironment === 'blue' ? '#3b82f6' : '#10b981'
                        }}>
                          {supervisorStatus.tankEnvironment?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <span>Failovers: {supervisorStatus.failoverCount || 0}</span>
                        <span>Cross-Swaps: {supervisorStatus.crossSwapCount || 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ 
                  color: '#666', 
                  fontSize: '0.7rem', 
                  textAlign: 'center',
                  padding: '2rem'
                }}>
                  Waiting for hallucination data...
                </div>
              )}
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
function MetricBox({ label, value, threshold, isWarning, icon }) {
  return (
    <div style={{
      padding: '0.5rem',
      borderRadius: '6px',
      background: isWarning ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isWarning ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.3rem',
        marginBottom: '0.25rem'
      }}>
        <span style={{ color: isWarning ? '#ef4444' : '#888' }}>{icon}</span>
        <span style={{ fontSize: '0.55rem', color: '#888', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ 
        fontSize: '0.85rem', 
        fontWeight: 'bold',
        color: isWarning ? '#ef4444' : '#fff'
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.5rem', color: '#666', marginTop: '0.15rem' }}>
        Threshold: {threshold}
      </div>
    </div>
  )
}

function StatusBadge({ label, active, color, warning = false }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      background: active ? `${color}20` : 'rgba(55,65,81,0.3)',
      borderWidth: 1,
      borderStyle: warning ? 'dashed' : 'solid',
      borderColor: warning ? '#fbbf24' : (active ? color : '#374151'),
    }}>
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: active ? color : '#374151'
      }} />
      <span style={{ 
        fontSize: '0.6rem', 
        fontWeight: 'bold',
        color: active ? color : '#888'
      }}>
        {label}
      </span>
    </div>
  )
}

function FaultButton({ active, onClick, icon, label, description }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        border: `1px solid ${active ? '#ef4444' : 'rgba(239,68,68,0.3)'}`,
        borderRadius: '6px',
        background: active ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.2)',
        color: active ? '#ef4444' : '#888',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%'
      }}
    >
      {icon}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{label}</div>
        <div style={{ fontSize: '0.55rem', color: '#666' }}>{description}</div>
      </div>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: active ? '#ef4444' : '#374151'
      }} />
    </motion.button>
  )
}

function EscalationLevel({ level, currentLevel, icon, label, description, disabled }) {
  const isActive = currentLevel >= level
  const isPending = currentLevel === level - 1 && !disabled
  
  const getColor = () => {
    if (disabled) return '#374151'
    if (isActive) return level === 3 ? '#ef4444' : level === 2 ? '#fbbf24' : '#10b981'
    return '#374151'
  }
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem',
      borderRadius: '6px',
      background: isActive ? `${getColor()}15` : 'rgba(0,0,0,0.2)',
      border: `1px solid ${isActive ? getColor() : 'transparent'}`,
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isActive ? `${getColor()}30` : 'rgba(55,65,81,0.3)',
        color: getColor(),
        animation: isPending ? 'pulse 1s infinite' : 'none'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: '0.75rem', 
          fontWeight: 'bold',
          color: isActive ? getColor() : '#888'
        }}>
          {label}
        </div>
        <div style={{ fontSize: '0.6rem', color: '#666' }}>{description}</div>
      </div>
      {isActive && (
        <div style={{
          padding: '0.2rem 0.4rem',
          borderRadius: '3px',
          background: getColor(),
          color: '#000',
          fontSize: '0.5rem',
          fontWeight: 'bold'
        }}>
          ACTIVE
        </div>
      )}
    </div>
  )
}

function ControlButton({ onClick, icon, label, color }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.6rem',
        border: `1px solid ${color}40`,
        borderRadius: '6px',
        background: `${color}15`,
        color: color,
        cursor: 'pointer',
        fontSize: '0.65rem',
        fontWeight: 500
      }}
    >
      {icon}
      {label}
    </motion.button>
  )
}