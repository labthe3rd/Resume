'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Save, FolderOpen, Grid, ZoomIn, ZoomOut, Play, Pause, Download, Upload, 
  Trash2, Copy, Undo, Redo, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react'
import ScadaCanvas from './scada/ScadaCanvas'
import ComponentPalette from './scada/ComponentPalette'
import PropertiesPanel from './scada/PropertiesPanel'
import TagBrowser from './scada/TagBrowser'
import LayersPanel from './scada/LayersPanel'
import { useWebSocket } from '../contexts/WebSocketContext'

const GRID_SIZE = 10
const STORAGE_KEY = 'scada_screens'

export default function ScadaBuilder() {
  const [components, setComponents] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [clipboard, setClipboard] = useState(null)
  const [history, setHistory] = useState({ past: [], future: [] })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [activeTool, setActiveTool] = useState('select')
  const [isRuntime, setIsRuntime] = useState(false)
  const [tags, setTags] = useState([])
  const [tagValues, setTagValues] = useState({})
  const [tagQualities, setTagQualities] = useState({})
  const [alarms, setAlarms] = useState([])
  const [screens, setScreens] = useState([])
  const [currentScreen, setCurrentScreen] = useState(null)
  const [userRole, setUserRole] = useState('Operator') // Viewer, Operator, Engineer, Admin
  
  const { connected, subscribe } = useWebSocket()

  // Load tags and alarms on mount
  useEffect(() => {
    loadTags()
    loadScreens()
    if (isRuntime) {
      loadAlarms()
      const alarmInterval = setInterval(loadAlarms, 5000)
      return () => clearInterval(alarmInterval)
    }
  }, [isRuntime])

  // WebSocket - ALWAYS connected with data quality tracking
  useEffect(() => {
    const unsubControl = subscribe('control', (data) => {
      if (isRuntime) {
        const timestamp = Date.now()
        const values = {
          'ns=1;s=Temperature': data.temperature,
          'ns=1;s=Setpoint': data.setpoint,
          'ns=1;s=HeaterPower': data.heaterPower,
          'ns=1;s=Error': data.error,
          'ns=1;s=Kp': data.agent?.kp || 0,
          'ns=1;s=Ki': data.agent?.ki || 0,
          'ns=1;s=Kd': data.agent?.kd || 0
        }
        
        setTagValues(prev => ({ ...prev, ...values }))
        
        // Update data quality indicators
        Object.keys(values).forEach(tagId => {
          setTagQualities(prev => ({
            ...prev,
            [tagId]: { quality: 'GOOD', timestamp }
          }))
        })
      }
    })
    
    const unsubTank = subscribe('tank', (data) => {
      if (isRuntime) {
        const timestamp = Date.now()
        const values = {
          'ns=1;s=LiquidFilling': data.tank?.liquidFilling ? 1 : 0,
          'ns=1;s=LiquidLevel': data.tank?.liquidLevel || 0,
          'ns=1;s=LiquidLow': data.tank?.liquidLow ? 1 : 0,
          'ns=1;s=LiquidHigh': data.tank?.liquidHigh ? 1 : 0
        }
        
        setTagValues(prev => ({ ...prev, ...values }))
        
        Object.keys(values).forEach(tagId => {
          setTagQualities(prev => ({
            ...prev,
            [tagId]: { quality: 'GOOD', timestamp }
          }))
        })
      }
    })
    
    // Check for stale data
    const staleCheck = setInterval(() => {
      if (isRuntime) {
        const now = Date.now()
        setTagQualities(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(tagId => {
            const age = now - (updated[tagId]?.timestamp || 0)
            if (age > 10000) {
              updated[tagId] = { quality: 'STALE', timestamp: updated[tagId]?.timestamp }
            } else if (age > 5000) {
              updated[tagId] = { quality: 'UNCERTAIN', timestamp: updated[tagId]?.timestamp }
            }
          })
          return updated
        })
      }
    }, 1000)
    
    return () => {
      unsubControl()
      unsubTank()
      clearInterval(staleCheck)
    }
  }, [subscribe, isRuntime])

  const loadAlarms = async () => {
    try {
      const res = await fetch('/msg/opcua/alarms')
      if (res.ok) {
        const data = await res.json()
        setAlarms(data.alarms || [])
      }
    } catch (e) {
      console.error('Failed to load alarms:', e)
    }
  }

  const acknowledgeAlarm = async (alarmId) => {
    try {
      const res = await fetch(`/msg/opcua/alarms/${alarmId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user123',
          userName: userRole
        })
      })
      if (res.ok) {
        loadAlarms()
      }
    } catch (e) {
      console.error('Failed to acknowledge alarm:', e)
    }
  }

  const shelveAlarm = async (alarmId, duration = 3600000) => {
    try {
      const res = await fetch(`/msg/opcua/alarms/${alarmId}/shelve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user123',
          userName: userRole,
          duration
        })
      })
      if (res.ok) {
        loadAlarms()
      }
    } catch (e) {
      console.error('Failed to shelve alarm:', e)
    }
  }

  const loadTags = async () => {
    try {
      console.log('🔍 Loading tags from /msg/opcua/tags')
      const res = await fetch('/msg/opcua/tags')
      if (!res.ok) {
        console.error('❌ Tag fetch failed:', res.status, res.statusText)
        return
      }
      const data = await res.json()
      console.log('✅ Tags loaded:', data.tags?.length || 0, 'tags')
      console.log('First tag:', data.tags?.[0])
      setTags(data.tags || [])
    } catch (e) {
      console.error('❌ Failed to load tags:', e)
    }
  }

  const loadScreens = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setScreens(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load screens:', e)
    }
  }

  const saveScreen = () => {
    const screen = {
      id: currentScreen?.id || `screen_${Date.now()}`,
      name: currentScreen?.name || 'Untitled',
      components,
      createdAt: currentScreen?.createdAt || Date.now(),
      updatedAt: Date.now()
    }
    
    const newScreens = screens.filter(s => s.id !== screen.id).concat(screen)
    setScreens(newScreens)
    setCurrentScreen(screen)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newScreens))
  }

  const loadScreen = (screen) => {
    setComponents(screen.components || [])
    setCurrentScreen(screen)
    setSelectedIds(new Set())
  }

  const addComponent = (type) => {
    const newComp = createComponent(type)
    setComponents([...components, newComp])
    saveToHistory()
  }

  const updateComponent = (id, updates) => {
    setComponents(components.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const deleteSelected = () => {
    setComponents(components.filter(c => !selectedIds.has(c.id)))
    setSelectedIds(new Set())
    saveToHistory()
  }

  const copySelected = () => {
    const selected = components.filter(c => selectedIds.has(c.id))
    setClipboard(selected)
  }

  const paste = () => {
    if (!clipboard) return
    const newComps = clipboard.map(c => ({
      ...c,
      id: `${c.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: c.x + 20,
      y: c.y + 20
    }))
    setComponents([...components, ...newComps])
    setSelectedIds(new Set(newComps.map(c => c.id)))
    saveToHistory()
  }

  const undo = () => {
    if (history.past.length === 0) return
    const previous = history.past[history.past.length - 1]
    const newPast = history.past.slice(0, -1)
    setHistory({ past: newPast, future: [components, ...history.future] })
    setComponents(previous)
  }

  const redo = () => {
    if (history.future.length === 0) return
    const next = history.future[0]
    const newFuture = history.future.slice(1)
    setHistory({ past: [...history.past, components], future: newFuture })
    setComponents(next)
  }

  const saveToHistory = () => {
    setHistory({ past: [...history.past, components].slice(-20), future: [] })
  }

  const align = (direction) => {
    if (selectedIds.size < 2) return
    const selected = components.filter(c => selectedIds.has(c.id))
    
    if (direction === 'left') {
      const minX = Math.min(...selected.map(c => c.x))
      setComponents(components.map(c => selectedIds.has(c.id) ? { ...c, x: minX } : c))
    } else if (direction === 'center') {
      const avgX = selected.reduce((sum, c) => sum + c.x + c.width / 2, 0) / selected.length
      setComponents(components.map(c => selectedIds.has(c.id) ? { ...c, x: avgX - c.width / 2 } : c))
    } else if (direction === 'right') {
      const maxX = Math.max(...selected.map(c => c.x + c.width))
      setComponents(components.map(c => selectedIds.has(c.id) ? { ...c, x: maxX - c.width } : c))
    }
    saveToHistory()
  }

  const exportScreen = () => {
    const json = JSON.stringify({ components, name: currentScreen?.name || 'Screen' }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentScreen?.name || 'screen'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importScreen = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          setComponents(data.components || [])
        } catch (err) {
          console.error('Failed to import:', err)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (isRuntime) return
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault()
          undo()
        } else if (e.key === 'y') {
          e.preventDefault()
          redo()
        } else if (e.key === 'c' && selectedIds.size > 0) {
          e.preventDefault()
          copySelected()
        } else if (e.key === 'v' && clipboard) {
          e.preventDefault()
          paste()
        } else if (e.key === 's') {
          e.preventDefault()
          saveScreen()
        } else if (e.key === 'a') {
          e.preventDefault()
          setSelectedIds(new Set(components.map(c => c.id)))
        }
      } else if (e.key === 'Delete' && selectedIds.size > 0) {
        deleteSelected()
      } else if (e.key === 'Escape') {
        setSelectedIds(new Set())
      }
    }
    
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [components, selectedIds, clipboard, history, isRuntime])

  return (
    <>
      {/* CSS Animation for alarm flashing */}
      <style>{`
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        background: '#2b2b2b', // ISA-101: Muted gray background
        color: '#e0e0e0', // ISA-101: Light gray text
        overflow: 'hidden'
      }}>
        {/* ISA-101 Alarm Banner - Only visible when alarms active */}
        {isRuntime && alarms.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.5rem 1rem',
            background: alarms.some(a => a.severity === 'CRITICAL') ? '#dc2626' : '#f59e0b',
            color: '#fff',
            fontWeight: 'bold',
            animation: alarms.some(a => a.state === 'UNACK_ACTIVE') ? 'flash 1s infinite' : 'none'
          }}>
            <span>⚠️ {alarms.length} ACTIVE ALARM{alarms.length > 1 ? 'S' : ''}</span>
            {alarms.slice(0, 3).map(alarm => (
              <span key={alarm.id} style={{ fontSize: '0.85rem' }}>
                {alarm.message}
              </span>
            ))}
            <button 
              onClick={() => acknowledgeAlarm(alarms[0].id)}
              style={{
                marginLeft: 'auto',
                padding: '0.25rem 1rem',
                background: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ACKNOWLEDGE
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderBottom: '1px solid #444',
          background: '#1a1a1a',
          flexWrap: 'wrap'
        }}>
          <button onClick={saveScreen} style={toolbarButtonStyle}><Save size={18} /> Save</button>
          <button onClick={() => {}} style={toolbarButtonStyle}><FolderOpen size={18} /> Load</button>
          <button onClick={exportScreen} style={toolbarButtonStyle}><Download size={18} /> Export</button>
          <button onClick={importScreen} style={toolbarButtonStyle}><Upload size={18} /> Import</button>
          
          <div style={dividerStyle} />
          
          <button onClick={undo} disabled={history.past.length === 0} style={toolbarButtonStyle}><Undo size={18} /></button>
          <button onClick={redo} disabled={history.future.length === 0} style={toolbarButtonStyle}><Redo size={18} /></button>
          <button onClick={copySelected} disabled={selectedIds.size === 0} style={toolbarButtonStyle}><Copy size={18} /></button>
          <button onClick={deleteSelected} disabled={selectedIds.size === 0} style={toolbarButtonStyle}><Trash2 size={18} /></button>
          
          <div style={dividerStyle} />
          
          <button onClick={() => align('left')} disabled={selectedIds.size < 2} style={toolbarButtonStyle}><AlignLeft size={18} /></button>
          <button onClick={() => align('center')} disabled={selectedIds.size < 2} style={toolbarButtonStyle}><AlignCenter size={18} /></button>
          <button onClick={() => align('right')} disabled={selectedIds.size < 2} style={toolbarButtonStyle}><AlignRight size={18} /></button>
          
          <div style={dividerStyle} />
          
          <button onClick={() => setZoom(Math.max(0.25, zoom - 0.25))} style={toolbarButtonStyle}><ZoomOut size={18} /></button>
          <span style={{ fontSize: '0.8rem', minWidth: '50px', textAlign: 'center', color: '#e0e0e0' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} style={toolbarButtonStyle}><ZoomIn size={18} /></button>
          
          <button 
            onClick={() => setSnapToGrid(!snapToGrid)} 
            style={{ 
              ...toolbarButtonStyle, 
              background: snapToGrid ? '#4b5563' : '#374151',
              border: snapToGrid ? '2px solid #6b7280' : '1px solid #4b5563'
            }}
          >
            <Grid size={18} /> Snap
          </button>
          
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* IEC 62443 RBAC Indicator */}
            <div style={{ 
              fontSize: '0.7rem', 
              padding: '0.25rem 0.5rem',
              background: '#374151',
              borderRadius: '4px',
              border: '1px solid #4b5563',
              color: '#e0e0e0'
            }}>
              ROLE: {userRole.toUpperCase()}
            </div>
            
            {/* Data Quality Indicator - ISA-101 */}
            {isRuntime && (
              <div style={{ 
                fontSize: '0.7rem', 
                padding: '0.25rem 0.5rem',
                background: connected ? '#1a1a1a' : '#7f1d1d',
                color: connected ? '#10b981' : '#ef4444',
                borderRadius: '4px',
                border: `1px solid ${connected ? '#10b981' : '#ef4444'}`
              }}>
                {connected ? '● DATA GOOD' : '● COMM FAIL'}
              </div>
            )}
            
            <button 
              onClick={() => setIsRuntime(!isRuntime)} 
              style={{ 
                ...toolbarButtonStyle, 
                background: isRuntime ? '#10b981' : '#374151',
                color: '#fff',
                border: isRuntime ? '1px solid #10b981' : '1px solid #4b5563'
              }}
            >
              {isRuntime ? <><Pause size={18} /> Design</> : <><Play size={18} /> Runtime</>}
            </button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left panel - Component Palette */}
          {!isRuntime && (
            <ComponentPalette onAddComponent={addComponent} />
          )}

          {/* Center - Canvas */}
          <ScadaCanvas
            components={components}
            setComponents={setComponents}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            zoom={zoom}
            pan={pan}
            setPan={setPan}
            snapToGrid={snapToGrid}
            showGrid={showGrid}
            gridSize={GRID_SIZE}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            isRuntime={isRuntime}
            tagValues={tagValues}
            saveToHistory={saveToHistory}
          />

          {/* Right panel */}
          {!isRuntime && (
            <div style={{ 
              width: '320px', 
              borderLeft: '1px solid #444',
              background: '#1a1a1a',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <PropertiesPanel
                components={components}
                selectedIds={selectedIds}
                updateComponent={updateComponent}
                tags={tags}
                isRuntime={isRuntime}
              />
              <TagBrowser tags={tags} />
              <LayersPanel
                components={components}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                setComponents={setComponents}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Component factory with ISA-101 compliant default colors
function createComponent(type) {
  const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const baseComp = {
    id,
    type,
    x: 100,
    y: 100,
    rotation: 0,
    locked: false,
    visible: true,
    zIndex: 0
  }
  
  switch (type) {
    case 'text':
      return {
        ...baseComp,
        width: 120,
        height: 32,
        text: 'Label',
        fontSize: 14,
        fontWeight: 'normal',
        color: '#e0e0e0',
        align: 'left',
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0
      }
    case 'gauge':
      return {
        ...baseComp,
        width: 150,
        height: 150,
        tagId: null,
        min: 0,
        max: 100,
        unit: '',
        label: 'Gauge',
        showValue: true,
        showLabel: true,
        color: '#9ca3af', // ISA-101: Gray for normal
        warningZone: 75,
        dangerZone: 90,
        needleColor: '#e0e0e0',
        backgroundColor: '#1a1a1a'
      }
    case 'led':
      return {
        ...baseComp,
        width: 40,
        height: 40,
        tagId: null,
        onValue: 1,
        offColor: '#333333',
        onColor: '#10b981',
        shape: 'circle',
        label: 'LED',
        showLabel: true
      }
    case 'graph':
      return {
        ...baseComp,
        width: 300,
        height: 180,
        tagIds: [],
        timeRange: '1h',
        showLegend: true,
        showGrid: true,
        backgroundColor: '#1a1a1a',
        gridColor: '#374151',
        colors: ['#9ca3af', '#6b7280', '#4b5563', '#e5e7eb', '#d1d5db'] // ISA-101: Grayscale
      }
    case 'tank':
      return {
        ...baseComp,
        width: 80,
        height: 150,
        tagId: null,
        min: 0,
        max: 100,
        fillColor: '#6b7280', // ISA-101: Gray - color only for alarms
        emptyColor: '#1a1a1a',
        borderColor: '#9ca3af',
        borderWidth: 2,
        showValue: true,
        showScale: true
      }
    case 'rect':
      return {
        ...baseComp,
        width: 100,
        height: 80,
        fill: '#1f2937',
        stroke: '#374151',
        strokeWidth: 2,
        borderRadius: 4
      }
    case 'circle':
      return {
        ...baseComp,
        width: 80,
        height: 80,
        fill: '#1f2937',
        stroke: '#374151',
        strokeWidth: 2
      }
    case 'line':
      return {
        ...baseComp,
        width: 100,
        height: 4,
        stroke: '#374151',
        strokeWidth: 2
      }
    default:
      return { ...baseComp, width: 100, height: 100 }
  }
}

// ISA-101 Compliant Toolbar Button Style
const toolbarButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  background: '#374151',
  border: '1px solid #4b5563',
  borderRadius: '4px',
  color: '#e0e0e0',
  cursor: 'pointer',
  fontSize: '0.85rem',
  transition: 'all 0.2s'
}

// ISA-101 Compliant Divider Style
const dividerStyle = {
  width: '1px',
  height: '24px',
  background: '#4b5563'
}
