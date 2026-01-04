'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'

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
        {comp.type.toUpperCase()} â€¢ {comp.id.substr(0, 12)}...
      </div>

      {/* Basic Properties */}
      <PropertySection title="Basic" expanded={expandedSections.has('basic')} onToggle={() => toggleSection('basic')}>
        <PropertyRow label="X">
          <input
            type="number"
            value={Math.round(comp.x)}
            onChange={(e) => updateComponent(comp.id, { x: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </PropertyRow>
        <PropertyRow label="Y">
          <input
            type="number"
            value={Math.round(comp.y)}
            onChange={(e) => updateComponent(comp.id, { y: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </PropertyRow>
        <PropertyRow label="Width">
          <input
            type="number"
            value={Math.round(comp.width)}
            onChange={(e) => updateComponent(comp.id, { width: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </PropertyRow>
        <PropertyRow label="Height">
          <input
            type="number"
            value={Math.round(comp.height)}
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

      {comp.type === 'graph' && (
        <PropertySection title="Graph Tags" expanded={expandedSections.has('graph-tags')} onToggle={() => toggleSection('graph-tags')}>
          <div style={{ marginBottom: '0.5rem' }}>
            {(comp.tagIds || []).map((tagId, index) => {
              const tag = tags.find(t => t.id === tagId)
              return (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.25rem',
                  padding: '0.25rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '3px'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    background: comp.colors?.[index % comp.colors.length] || '#00d4ff',
                    borderRadius: '2px'
                  }} />
                  <span style={{ flex: 1, fontSize: '0.7rem' }}>
                    {tag?.name || tagId}
                  </span>
                  <button
                    onClick={() => {
                      const newTagIds = comp.tagIds.filter((_, i) => i !== index)
                      updateComponent(comp.id, { tagIds: newTagIds })
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                const newTagIds = [...(comp.tagIds || []), e.target.value]
                updateComponent(comp.id, { tagIds: newTagIds })
              }
            }}
            style={inputStyle}
          >
            <option value="">+ Add Tag</option>
            {tags.filter(tag => !(comp.tagIds || []).includes(tag.id)).map(tag => (
              <option key={tag.id} value={tag.id}>
                {tag.name} ({tag.group})
              </option>
            ))}
          </select>
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
          <PropertyRow label="Warning %">
            <input
              type="number"
              value={comp.warningZone}
              onChange={(e) => updateComponent(comp.id, { warningZone: parseFloat(e.target.value) })}
              style={inputStyle}
            />
          </PropertyRow>
          <PropertyRow label="Danger %">
            <input
              type="number"
              value={comp.dangerZone}
              onChange={(e) => updateComponent(comp.id, { dangerZone: parseFloat(e.target.value) })}
              style={inputStyle}
            />
          </PropertyRow>
        </PropertySection>
      )}

      {comp.type === 'led' && (
        <PropertySection title="LED Settings" expanded={expandedSections.has('led')} onToggle={() => toggleSection('led')}>
          <PropertyRow label="On Threshold">
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
          <PropertyRow label="Show Value">
            <input
              type="checkbox"
              checked={comp.showValue}
              onChange={(e) => updateComponent(comp.id, { showValue: e.target.checked })}
            />
          </PropertyRow>
        </PropertySection>
      )}

      {comp.type === 'graph' && (
        <PropertySection title="Graph Settings" expanded={expandedSections.has('graph-settings')} onToggle={() => toggleSection('graph-settings')}>
          <PropertyRow label="Show Grid">
            <input
              type="checkbox"
              checked={comp.showGrid}
              onChange={(e) => updateComponent(comp.id, { showGrid: e.target.checked })}
            />
          </PropertyRow>
          <PropertyRow label="Show Legend">
            <input
              type="checkbox"
              checked={comp.showLegend}
              onChange={(e) => updateComponent(comp.id, { showLegend: e.target.checked })}
            />
          </PropertyRow>
          <PropertyRow label="Grid Color">
            <input
              type="color"
              value={comp.gridColor || '#ffffff'}
              onChange={(e) => updateComponent(comp.id, { gridColor: e.target.value })}
              style={{ ...inputStyle, height: '30px' }}
            />
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