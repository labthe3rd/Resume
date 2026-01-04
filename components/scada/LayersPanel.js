'use client'
import { Eye, EyeOff, Lock, Unlock, Trash2 } from 'lucide-react'

export default function LayersPanel({ components, selectedIds, setSelectedIds, setComponents }) {
  const moveLayer = (id, direction) => {
    const index = components.findIndex(c => c.id === id)
    if (index === -1) return
    
    const newComponents = [...components]
    const newIndex = direction === 'up' ? Math.min(index + 1, components.length - 1) : Math.max(index - 1, 0)
    
    const [item] = newComponents.splice(index, 1)
    newComponents.splice(newIndex, 0, item)
    
    setComponents(newComponents)
  }

  const deleteLayer = (id) => {
    setComponents(components.filter(c => c.id !== id))
    setSelectedIds(new Set())
  }

  return (
    <div style={{
      flex: 1,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.3)',
      overflow: 'auto'
    }}>
      <div style={{
        padding: '1rem 1rem 0.5rem 1rem',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        color: '#8b5cf6'
      }}>
        LAYERS ({components.length})
      </div>
      
      <div style={{ padding: '0 1rem 1rem 1rem' }}>
        {components.slice().reverse().map((comp, idx) => {
          const isSelected = selectedIds.has(comp.id)
          return (
            <div
              key={comp.id}
              onClick={() => setSelectedIds(new Set([comp.id]))}
              style={{
                padding: '0.5rem',
                marginBottom: '0.25rem',
                background: isSelected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                border: isSelected ? '1px solid #8b5cf6' : '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setComponents(components.map(c =>
                    c.id === comp.id ? { ...c, visible: !c.visible } : c
                  ))
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: comp.visible ? '#fff' : '#666',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {comp.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setComponents(components.map(c =>
                    c.id === comp.id ? { ...c, locked: !c.locked } : c
                  ))
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: comp.locked ? '#fbbf24' : '#666',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {comp.locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{comp.type}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>
                  {comp.id.substr(0, 12)}...
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Delete this component?')) deleteLayer(comp.id)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
