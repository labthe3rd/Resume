'use client'
import { useState, useEffect, useRef } from 'react'
import { useWebSocket } from '../../contexts/WebSocketContext'

export default function GraphComponent({ component, isRuntime }) {
  const [data, setData] = useState([])
  const { subscribe } = useWebSocket()
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!isRuntime || !component.tagIds || component.tagIds.length === 0) {
      setData([]) // Clear data when not in runtime
      return
    }

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
          else if (tagId === 'ns=1;s=Error') newPoint.value = msg.error
          else if (tagId === 'ns=1;s=Kp') newPoint.value = msg.agent?.kp || 0
          else if (tagId === 'ns=1;s=Ki') newPoint.value = msg.agent?.ki || 0
          else if (tagId === 'ns=1;s=Kd') newPoint.value = msg.agent?.kd || 0
          
          if (newPoint.value !== undefined) {
            const updated = [...prev, newPoint]
            return updated.slice(-300) // Keep last 300 points
          }
          return prev
        })
      })
      unsubscribers.push(unsub)
    })

    return () => unsubscribers.forEach(u => u())
  }, [isRuntime, component.tagIds, subscribe])

  // Draw graph
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
    const padding = { top: 20, right: 40, bottom: 30, left: 50 }

    // Clear
    ctx.fillStyle = component.backgroundColor || 'rgba(0,0,0,0.9)'
    ctx.fillRect(0, 0, width, height)

    // Show message if no data
    if (data.length === 0) {
      ctx.fillStyle = '#666'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        !isRuntime ? 'Enter Runtime Mode' : 
        (!component.tagIds || component.tagIds.length === 0) ? 'No tags selected' : 
        'Collecting data...',
        width / 2,
        height / 2
      )
      return
    }

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
      const values = data.map(d => d.value).filter(v => v !== undefined)
      if (values.length === 0) return
      
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const range = maxVal - minVal || 1

      ctx.strokeStyle = component.colors?.[0] || '#00d4ff'
      ctx.lineWidth = 2
      ctx.beginPath()

      let firstPoint = true
      data.forEach((point, i) => {
        if (point.value === undefined) return
        
        const x = padding.left + ((width - padding.left - padding.right) / (data.length - 1)) * i
        const y = padding.top + (height - padding.top - padding.bottom) - (((point.value - minVal) / range) * (height - padding.top - padding.bottom))
        
        if (firstPoint) {
          ctx.moveTo(x, y)
          firstPoint = false
        } else {
          ctx.lineTo(x, y)
        }
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
  }, [data, component, isRuntime])

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
