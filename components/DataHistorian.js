'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ZoomIn, ZoomOut, Download, Calendar, Clock, Database,
  TrendingUp, Activity, ChevronLeft, ChevronRight, Maximize2,
  Minimize2, RotateCcw
} from 'lucide-react'

const STORAGE_KEY = 'opc_historian_data'
const MAX_DATA_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours
const SAMPLE_INTERVAL_MS = 1000 // 1 second

export default function DataHistorian({ isOpen, onClose, systemState, isPaused }) {
  const [historianData, setHistorianData] = useState([])
  const [selectedVariable, setSelectedVariable] = useState('temperature')
  const [timeRange, setTimeRange] = useState('1h') // 1h, 4h, 8h, 24h, custom
  const [customRange, setCustomRange] = useState({ start: null, end: null })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const canvasRef = useRef(null)
  const lastSampleTime = useRef(0)

  // Variables to track
  const variables = {
    temperature: { label: 'Temperature', unit: '°C', color: '#00d4ff', min: 0, max: 500 },
    setpoint: { label: 'Setpoint', unit: '°C', color: '#fbbf24', min: 0, max: 500 },
    heaterPower: { label: 'Heater Power', unit: '%', color: '#f97316', min: 0, max: 100 },
    error: { label: 'Error', unit: '°C', color: '#ef4444', min: 0, max: 100 },
    kp: { label: 'Kp (Proportional)', unit: '', color: '#10b981', min: 0, max: 10 },
    ki: { label: 'Ki (Integral)', unit: '', color: '#8b5cf6', min: 0, max: 1 },
    kd: { label: 'Kd (Derivative)', unit: '', color: '#ec4899', min: 0, max: 5 }
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save original body overflow
      const originalOverflow = document.body.style.overflow
      const originalPaddingRight = document.body.style.paddingRight
      
      // Get scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      
      // Lock scroll
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
      
      // Cleanup on unmount or when modal closes
      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
      }
    }
  }, [isOpen])

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Filter out data older than 24 hours
        const now = Date.now()
        const filtered = parsed.filter(d => now - d.timestamp < MAX_DATA_AGE_MS)
        setHistorianData(filtered)
      }
    } catch (e) {
      console.error('Error loading historian data:', e)
    }
  }, [])

  // Record data at regular intervals
  useEffect(() => {
    if (!systemState || isPaused) return

    const now = Date.now()
    if (now - lastSampleTime.current < SAMPLE_INTERVAL_MS) return
    lastSampleTime.current = now

    const dataPoint = {
      timestamp: now,
      temperature: systemState.temperature,
      setpoint: systemState.setpoint,
      heaterPower: systemState.heaterPower,
      error: systemState.error,
      kp: systemState.agent?.kp || 0,
      ki: systemState.agent?.ki || 0,
      kd: systemState.agent?.kd || 0,
      stability: systemState.stability
    }

    setHistorianData(prev => {
      const updated = [...prev, dataPoint]
      
      // Remove data older than 24 hours
      const cutoff = now - MAX_DATA_AGE_MS
      const filtered = updated.filter(d => d.timestamp >= cutoff)
      
      // Save to localStorage (limit to last 10000 points to avoid storage issues)
      const toSave = filtered.slice(-10000)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
      } catch (e) {
        console.error('Error saving historian data:', e)
      }
      
      return filtered
    })
  }, [systemState, isPaused])

  // Get filtered data based on time range
  const getFilteredData = () => {
    if (historianData.length === 0) return []

    const now = Date.now()
    let startTime = now

    if (timeRange === 'custom' && customRange.start) {
      startTime = customRange.start
    } else {
      const ranges = {
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '8h': 8 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
      }
      startTime = now - (ranges[timeRange] || ranges['1h'])
    }

    const endTime = timeRange === 'custom' && customRange.end ? customRange.end : now

    return historianData.filter(d => d.timestamp >= startTime && d.timestamp <= endTime)
  }

  // Draw chart
  useEffect(() => {
    if (!isOpen) return
    
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
    const padding = { top: 40, right: 20, bottom: 60, left: 70 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    // Clear
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    const filteredData = getFilteredData()
    if (filteredData.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No data available', width / 2, height / 2)
      return
    }

    const variable = variables[selectedVariable]
    const data = filteredData.map(d => d[selectedVariable])
    
    // Apply zoom and pan
    const visibleCount = Math.floor(data.length / zoomLevel)
    const startIdx = Math.max(0, Math.min(data.length - visibleCount, Math.floor(panOffset * (data.length - visibleCount))))
    const endIdx = Math.min(data.length, startIdx + visibleCount)
    const visibleData = data.slice(startIdx, endIdx)
    const visibleTimestamps = filteredData.slice(startIdx, endIdx).map(d => d.timestamp)

    if (visibleData.length === 0) return

    // Calculate value range
    const minVal = Math.min(...visibleData, variable.min)
    const maxVal = Math.max(...visibleData, variable.max)
    const range = maxVal - minVal || 1

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    
    // Horizontal grid lines
    const yTicks = 5
    for (let i = 0; i <= yTicks; i++) {
      const y = padding.top + (i / yTicks) * plotHeight
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + plotWidth, y)
      ctx.stroke()
      
      // Y-axis labels
      const value = maxVal - (i / yTicks) * range
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '11px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(value.toFixed(1) + variable.unit, padding.left - 8, y + 4)
    }

    // Vertical grid lines (time)
    const xTicks = 6
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    
    for (let i = 0; i <= xTicks; i++) {
      const x = padding.left + (i / xTicks) * plotWidth
      const idx = Math.floor((i / xTicks) * (visibleTimestamps.length - 1))
      const timestamp = visibleTimestamps[idx]
      
      if (timestamp) {
        ctx.beginPath()
        ctx.moveTo(x, padding.top)
        ctx.lineTo(x, padding.top + plotHeight)
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'
        ctx.stroke()
        
        // Time label
        const date = new Date(timestamp)
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        ctx.fillText(timeStr, x, padding.top + plotHeight + 20)
        
        // Date label
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.fillText(dateStr, x, padding.top + plotHeight + 35)
      }
    }

    // Draw data line
    ctx.strokeStyle = variable.color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    visibleData.forEach((val, i) => {
      const x = padding.left + (i / Math.max(visibleData.length - 1, 1)) * plotWidth
      const y = padding.top + plotHeight - ((val - minVal) / range) * plotHeight
      
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    
    ctx.stroke()

    // Draw title
    ctx.fillStyle = variable.color
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(variable.label, padding.left, 25)
    
    // Draw current value
    if (visibleData.length > 0) {
      const currentVal = visibleData[visibleData.length - 1]
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 16px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(currentVal.toFixed(2) + variable.unit, width - padding.right, 25)
    }
  }, [historianData, selectedVariable, timeRange, customRange, zoomLevel, panOffset, isOpen])

  const exportData = () => {
    const filteredData = getFilteredData()
    if (filteredData.length === 0) {
      alert('No data to export')
      return
    }

    const csv = [
      ['Timestamp', 'Temperature', 'Setpoint', 'Heater Power', 'Error', 'Kp', 'Ki', 'Kd', 'Stability'].join(','),
      ...filteredData.map(d => [
        new Date(d.timestamp).toISOString(),
        d.temperature,
        d.setpoint,
        d.heaterPower,
        d.error,
        d.kp,
        d.ki,
        d.kd,
        d.stability
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historian-data-${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearHistorianData = () => {
    if (confirm('Clear all historian data? This cannot be undone.')) {
      setHistorianData([])
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const dataStats = {
    totalPoints: historianData.length,
    timeSpan:
      historianData.length > 0
        ? (historianData[historianData.length - 1].timestamp - historianData[0].timestamp) / (1000 * 60 * 60)
        : 0,
    sizeKB: (JSON.stringify(historianData).length / 1024).toFixed(2)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            overflow: 'hidden'  // CRITICAL FIX: Changed from 'auto' to 'hidden'
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              width: isFullscreen ? '95vw' : '90vw',
              height: isFullscreen ? '95vh' : '85vh',
              maxWidth: isFullscreen ? 'none' : '1400px',
              maxHeight: '95vh',  // ADDED: Prevent overflow
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0  // ADDED: Prevent header from shrinking
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Database size={24} color="#00d4ff" />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    Process Data Historian
                  </h2>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    {dataStats.totalPoints.toLocaleString()} points • {dataStats.timeSpan.toFixed(1)}h span • {dataStats.sizeKB} KB
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <IconButton onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </IconButton>
                <IconButton onClick={exportData} title="Export CSV">
                  <Download size={18} />
                </IconButton>
                <IconButton onClick={clearHistorianData} title="Clear Data" color="#ef4444">
                  <RotateCcw size={18} />
                </IconButton>
                <IconButton onClick={onClose} title="Close">
                  <X size={20} />
                </IconButton>
              </div>
            </div>

            {/* Controls */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              flexShrink: 0  // ADDED: Prevent controls from shrinking
            }}>
              {/* Variable Selection */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {Object.entries(variables).map(([key, v]) => (
                  <VariableButton
                    key={key}
                    active={selectedVariable === key}
                    color={v.color}
                    onClick={() => setSelectedVariable(key)}
                  >
                    {v.label}
                  </VariableButton>
                ))}
              </div>

              <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />

              {/* Time Range */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['1h', '4h', '8h', '24h'].map(range => (
                  <TimeButton
                    key={range}
                    active={timeRange === range}
                    onClick={() => setTimeRange(range)}
                  >
                    {range}
                  </TimeButton>
                ))}
              </div>

              <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />

              {/* Zoom Controls */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <IconButton onClick={() => setZoomLevel(Math.max(1, zoomLevel / 1.5))} disabled={zoomLevel <= 1}>
                  <ZoomOut size={16} />
                </IconButton>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', minWidth: '50px', textAlign: 'center' }}>
                  {zoomLevel.toFixed(1)}x
                </span>
                <IconButton onClick={() => setZoomLevel(Math.min(10, zoomLevel * 1.5))} disabled={zoomLevel >= 10}>
                  <ZoomIn size={16} />
                </IconButton>
              </div>

              {/* Pan Controls */}
              {zoomLevel > 1 && (
                <>
                  <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <IconButton onClick={() => setPanOffset(Math.max(0, panOffset - 0.1))} disabled={panOffset <= 0}>
                      <ChevronLeft size={16} />
                    </IconButton>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      Pan
                    </span>
                    <IconButton onClick={() => setPanOffset(Math.min(1, panOffset + 0.1))} disabled={panOffset >= 1}>
                      <ChevronRight size={16} />
                    </IconButton>
                  </div>
                </>
              )}
            </div>

            {/* Chart */}
            <div style={{ 
              flex: 1, 
              padding: '1rem', 
              position: 'relative',
              minHeight: 0  // ADDED: Allow flex item to shrink below content size
            }}>
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px'
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function IconButton({ onClick, children, title, disabled = false, color = '#fff' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        padding: '0.5rem',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '6px',
        color: disabled ? 'rgba(255,255,255,0.3)' : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {children}
    </button>
  )
}

function VariableButton({ active, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.4rem 0.75rem',
        background: active ? `${color}30` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.2)'}`,
        borderRadius: '6px',
        color: active ? color : 'rgba(255,255,255,0.7)',
        fontSize: '0.7rem',
        fontWeight: active ? 'bold' : 'normal',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      {children}
    </button>
  )
}

function TimeButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.4rem 0.75rem',
        background: active ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? '#00d4ff' : 'rgba(255,255,255,0.2)'}`,
        borderRadius: '6px',
        color: active ? '#00d4ff' : 'rgba(255,255,255,0.7)',
        fontSize: '0.7rem',
        fontWeight: active ? 'bold' : 'normal',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      {children}
    </button>
  )
}
