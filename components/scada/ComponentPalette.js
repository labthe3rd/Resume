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
