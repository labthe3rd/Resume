// components/scada/PropertiesPanel.js
'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function PropertiesPanel({ components, selectedIds, updateComponent, tags, isRuntime }) {
  const [expandedSections, setExpandedSections] = useState(new Set(['basic', 'data']))

  if (isRuntime) return null

  const selected = components.filter(c => selectedIds.has(c.id))
  if (selected.length === 0) {
    return (
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
          No component selected
        </div>
      </div>
    )
  }

  if (selected.length > 1) {
    return (
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Multiple Selection ({selected.length})
        </div>
        <PropertySection title="Transform" expanded={expandedSections.has('transform')} onToggle={() => toggleSection('transform')}>
          <button
            onClick={() => selected.forEach(c => updateComponent(c.id, { locked: !c.locked }))}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Toggle Lock
          </button>
        </PropertySection>
      </div>
    )
  }

  const comp = selected[0]

  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) newSet.delete(section)
      else newSet.add(section)
      return newSet
    })
  }

  return (
    <div style={{
      padding: '1rem',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.3)',
      overflowY: 'auto',
      maxHeight: '40vh'
    }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1rem', color: '#00d4ff' }}>
        PROPERTIES
      </div>
      
      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
        {comp.type.toUpperCase()} • {comp.id.substr(0, 12)}...
      </div>

      {/* Basic Properties */}
      <PropertySection title="Basic" expanded={expandedSections.has('basic')} onToggle={() => toggleSection('basic')}>
        <PropertyRow label="X">
          <input
            type="number"
            value={comp.x}
            onChange={(e) => updateComponent(comp.id, { x: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </PropertyRow>
        <PropertyRow label="Y">
          <input
            type="number"
            value={comp.y}
            onChange={(e) => updateComponent(comp.id, { y: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </PropertyRow>
        <PropertyRow label="Width">
          <input
            type="number"
            value={comp.width}
            onChange={(e) => updateComponent(comp.id, { width: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </PropertyRow>
        <PropertyRow label="Height">
          <input
            type="number"
            value={comp.height}
            onChange={(e) => updateComponent(comp.id, { height: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </PropertyRow>
        <PropertyRow label="Rotation">
          <input
            type="number"
            value={comp.rotation || 0}
            onChange={(e) => updateComponent(comp.id, { rotation: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </PropertyRow>
        <PropertyRow label="Locked">
          <input
            type="checkbox"
            checked={comp.locked}
            onChange={(e) => updateComponent(comp.id, { locked: e.target.checked })}
          />
        </PropertyRow>
        <PropertyRow label="Visible">
          <input
            type="checkbox"
            checked={comp.visible}
            onChange={(e) => updateComponent(comp.id, { visible: e.target.checked })}
          />
        </PropertyRow>
      </PropertySection>

      {/* Type-specific properties */}
      {comp.type === 'text' && (
        <PropertySection title="Text" expanded={expandedSections.has('text')} onToggle={() => toggleSection('text')}>
          <PropertyRow label="Content">
            <input
              type="text"
              value={comp.text}
              onChange={(e) => updateComponent(comp.id, { text: e.target.value })}
              style={inputStyle}
            />
          </PropertyRow>
          <PropertyRow label="Font Size">
            <input
              type="number"
              value={comp.fontSize}
              onChange={(e) => updateComponent(comp.id, { fontSize: parseFloat(e.target.value) })}
              style={inputStyle}
            />
          </PropertyRow>
          <PropertyRow label="Color">
            <input
              type="color"
              value={comp.color}
              onChange={(e) => updateComponent(comp.id, { color: e.target.value })}
              style={{ ...inputStyle, height: '30px' }}
            />
          </PropertyRow>
          <PropertyRow label="Align">
            <select
              value={comp.align}
              onChange={(e) => updateComponent(comp.id, { align: e.target.value })}
              style={inputStyle}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </PropertyRow>
        </PropertySection>
      )}

      {(comp.type === 'gauge' || comp.type === 'led' || comp.type === 'tank') && (
        <PropertySection title="Data Source" expanded={expandedSections.has('data')} onToggle={() => toggleSection('data')}>
          <PropertyRow label="Tag">
            <select
              value={comp.tagId || ''}
              onChange={(e) => updateComponent(comp.id, { tagId: e.target.value || null })}
              style={inputStyle}
            >
              <option value="">-- Select Tag --</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>
                  {tag.name} ({tag.group})
                </option>
              ))}
            </select>
          </PropertyRow>
        </PropertySection>
      )}

      {comp.type === 'gauge' && (
        <PropertySection title="Gauge Settings" expanded={expandedSections.has('gauge')} onToggle={() => toggleSection('gauge')}>
          <PropertyRow label="Min">
            <input
              type="number"
              value={comp.min}
              onChange={(e) => updateComponent(comp.id, { min: parseFloat(e.target.value) })}
              style={inputStyle}
            />
          </PropertyRow>
          <PropertyRow label="Max">
            <input
              type="number"
              value={comp.max}
              onChange={(e) => updateComponent(comp.id, { max: parseFloat(e.target.value) })}
              style={inputStyle}
            />
          </PropertyRow>
          <PropertyRow label="Unit">
            <input
              type="text"
              value={comp.unit}
              onChange={(e) => updateComponent(comp.id, { unit: e.target.value })}
              style={inputStyle}
            />
          </PropertyRow>
          <PropertyRow label="Label">
            <input
              type="text"
              value={comp.label}
              onChange={(e) => updateComponent(comp.id, { label: e.target.value })}
              style={inputStyle}
            />
          </PropertyRow>
          <PropertyRow label="Color">
            <input
              type="color"
              value={comp.color}
              onChange={(e) => updateComponent(comp.id, { color: e.target.value })}
              style={{ ...inputStyle, height: '30px' }}
            />
          </PropertyRow>
        </PropertySection>
      )}

      {comp.type === 'led' && (
        <PropertySection title="LED Settings" expanded={expandedSections.has('led')} onToggle={() => toggleSection('led')}>
          <PropertyRow label="On Value">
            <input
              type="number"
              value={comp.onValue}
              onChange={(e) => updateComponent(comp.id, { onValue: parseFloat(e.target.value) })}
              style={inputStyle}
            />
          </PropertyRow>
          <PropertyRow label="On Color">
            <input
              type="color"
              value={comp.onColor}
              onChange={(e) => updateComponent(comp.id, { onColor: e.target.value })}
              style={{ ...inputStyle, height: '30px' }}
            />
          </PropertyRow>
          <PropertyRow label="Off Color">
            <input
              type="color"
              value={comp.offColor}
              onChange={(e) => updateComponent(comp.id, { offColor: e.target.value })}
              style={{ ...inputStyle, height: '30px' }}
            />
          </PropertyRow>
          <PropertyRow label="Shape">
            <select
              value={comp.shape}
              onChange={(e) => updateComponent(comp.id, { shape: e.target.value })}
              style={inputStyle}
            >
              <option value="circle">Circle</option>
              <option value="square">Square</option>
            </select>
          </PropertyRow>
        </PropertySection>
      )}

      {(comp.type === 'rect' || comp.type === 'circle') && (
        <PropertySection title="Appearance" expanded={expandedSections.has('appearance')} onToggle={() => toggleSection('appearance')}>
          <PropertyRow label="Fill">
            <input
              type="color"
              value={comp.fill}
              onChange={(e) => updateComponent(comp.id, { fill: e.target.value })}
              style={{ ...inputStyle, height: '30px' }}
            />
          </PropertyRow>
          <PropertyRow label="Stroke">
            <input
              type="color"
              value={comp.stroke}
              onChange={(e) => updateComponent(comp.id, { stroke: e.target.value })}
              style={{ ...inputStyle, height: '30px' }}
            />
          </PropertyRow>
          <PropertyRow label="Stroke Width">
            <input
              type="number"
              value={comp.strokeWidth}
              onChange={(e) => updateComponent(comp.id, { strokeWidth: parseFloat(e.target.value) })}
              style={inputStyle}
            />
          </PropertyRow>
        </PropertySection>
      )}
    </div>
  )
}

function PropertySection({ title, expanded, onToggle, children }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: expanded ? '0.5rem' : 0,
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </div>
      {expanded && <div style={{ paddingLeft: '0.5rem' }}>{children}</div>}
    </div>
  )
}

function PropertyRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.7rem' }}>
      <label style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div style={{ width: '60%' }}>{children}</div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.25rem 0.5rem',
  background: 'rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '3px',
  color: '#fff',
  fontSize: '0.7rem'
}

// components/scada/TagBrowser.js
'use client'
import { useState } from 'react'
import { ChevronRight, ChevronDown, Tag as TagIcon } from 'lucide-react'

export default function TagBrowser({ tags, onTagSelect }) {
  const [expanded, setExpanded] = useState(new Set(['oven', 'tank']))

  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.group]) acc[tag.group] = []
    acc[tag.group].push(tag)
    return acc
  }, {})

  const toggleGroup = (group) => {
    setExpanded(prev => {
      const newSet = new Set(prev)
      if (newSet.has(group)) newSet.delete(group)
      else newSet.add(group)
      return newSet
    })
  }

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.3)',
      maxHeight: '30vh',
      overflow: 'auto'
    }}>
      <div style={{
        padding: '1rem 1rem 0.5rem 1rem',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        color: '#fbbf24'
      }}>
        TAG BROWSER
      </div>
      
      <div style={{ padding: '0 1rem 1rem 1rem' }}>
        {Object.entries(groupedTags).map(([group, groupTags]) => (
          <div key={group} style={{ marginBottom: '0.5rem' }}>
            <div
              onClick={() => toggleGroup(group)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              {expanded.has(group) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span style={{ fontWeight: 'bold' }}>{group}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>
                ({groupTags.length})
              </span>
            </div>
            
            {expanded.has(group) && (
              <div style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                {groupTags.map(tag => (
                  <div
                    key={tag.id}
                    onClick={() => onTagSelect?.(tag)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.3rem 0.5rem',
                      fontSize: '0.65rem',
                      cursor: 'pointer',
                      borderRadius: '3px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <TagIcon size={12} color={tag.dataType === 'Boolean' ? '#10b981' : '#00d4ff'} />
                    <span>{tag.name}</span>
                    {tag.unit && <span style={{ color: 'var(--text-tertiary)' }}>({tag.unit})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// components/scada/LayersPanel.js
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
                  padding: '2px'
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
                  padding: '2px'
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
                  padding: '2px'
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
