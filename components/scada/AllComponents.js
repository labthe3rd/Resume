// components/scada/ComponentPalette.js
'use client'
import { Square, Circle, Type, Gauge, Activity, TrendingUp, Lightbulb, Droplets, Minus } from 'lucide-react'

export default function ComponentPalette({ onAddComponent, activeTool, setActiveTool, isRuntime }) {
  if (isRuntime) return null

  const components = [
    { type: 'text', icon: Type, label: 'Text', color: '#fff' },
    { type: 'gauge', icon: Gauge, label: 'Gauge', color: '#00d4ff' },
    { type: 'led', icon: Lightbulb, label: 'LED', color: '#10b981' },
    { type: 'graph', icon: TrendingUp, label: 'Graph', color: '#fbbf24' },
    { type: 'tank', icon: Droplets, label: 'Tank', color: '#8b5cf6' },
    { type: 'rect', icon: Square, label: 'Rectangle', color: '#6b7280' },
    { type: 'circle', icon: Circle, label: 'Circle', color: '#6b7280' },
    { type: 'line', icon: Minus, label: 'Line', color: '#6b7280' }
  ]

  return (
    <div style={{
      width: '240px',
      borderRight: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem',
      gap: '0.5rem',
      flexShrink: 0,
      overflowY: 'auto'
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
        COMPONENTS
      </div>
      {components.map(comp => (
        <button
          key={comp.type}
          onClick={() => onAddComponent(comp.type)}
          style={{
            padding: '0.75rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            color: comp.color,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            transition: 'all 0.2s',
            fontSize: '0.85rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.borderColor = comp.color
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          }}
        >
          <comp.icon size={20} />
          <span>{comp.label}</span>
        </button>
      ))}
    </div>
  )
}

// components/scada/GaugeComponent.js
'use client'
export default function GaugeComponent({ component, value }) {
  const displayValue = value !== null && value !== undefined ? value : 0
  const percentage = ((displayValue - component.min) / (component.max - component.min)) * 100
  const angle = -135 + (percentage / 100) * 270 // -135Â° to 135Â° sweep

  const getColor = () => {
    if (percentage >= component.dangerZone) return '#ef4444'
    if (percentage >= component.warningZone) return '#fbbf24'
    return component.color
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: component.backgroundColor,
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <svg width="100%" height="85%" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
        {/* Background arc */}
        <path
          d="M 30 170 A 80 80 0 1 1 170 170"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 30 170 A 80 80 0 1 1 170 170"
          fill="none"
          stroke={getColor()}
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 2.51} 251`}
          style={{ transition: 'stroke-dasharray 0.3s' }}
        />
        {/* Needle */}
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="35"
          stroke={component.needleColor || '#fff'}
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${angle} 100 100)`}
          style={{ transition: 'transform 0.3s' }}
        />
        {/* Center dot */}
        <circle cx="100" cy="100" r="8" fill={component.needleColor || '#fff'} />
      </svg>
      {component.showValue && (
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: getColor(),
          marginTop: '-20px'
        }}>
          {displayValue.toFixed(1)}{component.unit}
        </div>
      )}
      {component.showLabel && component.label && (
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--text-tertiary)',
          marginTop: '4px'
        }}>
          {component.label}
        </div>
      )}
    </div>
  )
}

// components/scada/LEDComponent.js
'use client'
export default function LEDComponent({ component, value }) {
  const isOn = value !== null && value !== undefined && value === component.onValue
  const color = isOn ? component.onColor : component.offColor

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    }}>
      <div style={{
        width: component.shape === 'circle' ? '80%' : '80%',
        height: component.shape === 'circle' ? '80%' : '60%',
        maxWidth: '100px',
        maxHeight: '100px',
        background: color,
        borderRadius: component.shape === 'circle' ? '50%' : '8px',
        boxShadow: isOn ? `0 0 20px ${color}, 0 0 40px ${color}` : 'none',
        border: '3px solid rgba(255,255,255,0.3)',
        transition: 'all 0.3s'
      }} />
      {component.showLabel && component.label && (
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          {component.label}
        </div>
      )}
    </div>
  )
}

// components/scada/TankComponent.js
'use client'
export default function TankComponent({ component, value }) {
  const displayValue = value !== null && value !== undefined ? value : 0
  const percentage = Math.max(0, Math.min(100, ((displayValue - component.min) / (component.max - component.min)) * 100))

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Tank container */}
      <div style={{
        flex: 1,
        width: '70%',
        position: 'relative',
        border: `${component.borderWidth}px solid ${component.borderColor}`,
        borderRadius: '0 0 8px 8px',
        overflow: 'hidden',
        background: component.emptyColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}>
        {/* Liquid fill */}
        <div style={{
          width: '100%',
          height: `${percentage}%`,
          background: component.fillColor,
          transition: 'height 0.5s',
          boxShadow: `0 -2px 10px ${component.fillColor}50`
        }} />
        
        {/* Value display */}
        {component.showValue && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
            zIndex: 10
          }}>
            {displayValue.toFixed(1)}%
          </div>
        )}
      </div>
      
      {/* Scale markers */}
      {component.showScale && (
        <div style={{
          position: 'absolute',
          right: '-30px',
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: '0.6rem',
          color: 'var(--text-tertiary)'
        }}>
          <div>100</div>
          <div>75</div>
          <div>50</div>
          <div>25</div>
          <div>0</div>
        </div>
      )}
    </div>
  )
}

// components/scada/GraphComponent.js
'use client'
import { useState, useEffect, useRef } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'

export default function GraphComponent({ component, isRuntime }) {
  const [data, setData] = useState([])
  const { subscribe } = useWebSocket()
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!isRuntime || !component.tagIds || component.tagIds.length === 0) return

    const unsubscribers = []
    
    // Subscribe to all tags
    component.tagIds.forEach(tagId => {
      const unsub = subscribe('control', (msg) => {
        setData(prev => {
          const now = Date.now()
          const newPoint = { timestamp: now }
          
          // Map tag values
          if (tagId === 'ns=1;s=Temperature') newPoint.value = msg.temperature
          else if (tagId === 'ns=1;s=Setpoint') newPoint.value = msg.setpoint
          else if (tagId === 'ns=1;s=HeaterPower') newPoint.value = msg.heaterPower
          
          const updated = [...prev, newPoint]
          return updated.slice(-300) // Keep last 300 points
        })
      })
      unsubscribers.push(unsub)
    })

    return () => unsubscribers.forEach(u => u())
  }, [isRuntime, component.tagIds, subscribe])

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 40, bottom: 30, left: 50 }

    // Clear
    ctx.fillStyle = component.backgroundColor || 'rgba(0,0,0,0.9)'
    ctx.fillRect(0, 0, width, height)

    // Grid
    if (component.showGrid) {
      ctx.strokeStyle = component.gridColor || 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + ((height - padding.top - padding.bottom) / 5) * i
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(width - padding.right, y)
        ctx.stroke()
      }
    }

    // Draw data
    if (data.length > 1) {
      const values = data.map(d => d.value)
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const range = maxVal - minVal || 1

      ctx.strokeStyle = component.colors[0] || '#00d4ff'
      ctx.lineWidth = 2
      ctx.beginPath()

      data.forEach((point, i) => {
        const x = padding.left + ((width - padding.left - padding.right) / (data.length - 1)) * i
        const y = padding.top + (height - padding.top - padding.bottom) - (((point.value - minVal) / range) * (height - padding.top - padding.bottom))
        
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Y-axis labels
      ctx.fillStyle = '#fff'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      for (let i = 0; i <= 5; i++) {
        const val = minVal + (range / 5) * (5 - i)
        const y = padding.top + ((height - padding.top - padding.bottom) / 5) * i
        ctx.fillText(val.toFixed(1), padding.left - 5, y + 3)
      }
    }
  }, [data, component])

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: component.backgroundColor || 'rgba(0,0,0,0.9)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

// Export all as a single module for easy import
export { GaugeComponent, LEDComponent, TankComponent, GraphComponent }
