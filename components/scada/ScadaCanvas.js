'use client'

import { useRef, useState, useEffect } from 'react'
import GaugeComponent from './GaugeComponent'
import LEDComponent from './LEDComponent'
import GraphComponent from './GraphComponent'
import TankComponent from './TankComponent'

export default function ScadaCanvas({
  components,
  setComponents,
  selectedIds,
  setSelectedIds,
  zoom,
  pan,
  setPan,
  snapToGrid,
  showGrid,
  gridSize,
  activeTool,
  setActiveTool,
  isRuntime,
  tagValues,
  saveToHistory
}) {
  const canvasRef = useRef(null)
  const [dragging, setDragging] = useState(null)
  const [resizing, setResizing] = useState(null)
  const [panning, setPanning] = useState(false)
  const [selectionBox, setSelectionBox] = useState(null)

  // Mouse handlers
  const handleMouseDown = (e) => {
    if (isRuntime) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    // Check if clicking on a component
    const clickedComponent = components
      .slice()
      .reverse()
      .find(c => 
        c.visible &&
        !c.locked &&
        x >= c.x && 
        x <= c.x + c.width && 
        y >= c.y && 
        y <= c.y + c.height
      )

    if (activeTool === 'select' || activeTool === 'move') {
      if (clickedComponent) {
        if (!e.shiftKey && !selectedIds.has(clickedComponent.id)) {
          setSelectedIds(new Set([clickedComponent.id]))
        } else if (e.shiftKey) {
          const newSelected = new Set(selectedIds)
          if (newSelected.has(clickedComponent.id)) {
            newSelected.delete(clickedComponent.id)
          } else {
            newSelected.add(clickedComponent.id)
          }
          setSelectedIds(newSelected)
        }
        
        setDragging({
          componentIds: e.shiftKey && selectedIds.has(clickedComponent.id) 
            ? Array.from(selectedIds)
            : [clickedComponent.id],
          startX: x,
          startY: y,
          initialPositions: components
            .filter(c => (e.shiftKey && selectedIds.has(clickedComponent.id) ? selectedIds.has(c.id) : c.id === clickedComponent.id))
            .reduce((acc, c) => ({ ...acc, [c.id]: { x: c.x, y: c.y } }), {})
        })
      } else if (e.button === 1 || e.ctrlKey) {
        // Middle mouse or Ctrl+drag for panning
        setPanning({ startX: e.clientX, startY: e.clientY, initialPan: { ...pan } })
      } else {
        // Start selection box
        setSelectionBox({ startX: x, startY: y, endX: x, endY: y })
        setSelectedIds(new Set())
      }
    } else if (activeTool === 'pan') {
      setPanning({ startX: e.clientX, startY: e.clientY, initialPan: { ...pan } })
    }
  }

  const handleMouseMove = (e) => {
    if (isRuntime) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    if (dragging) {
      const dx = x - dragging.startX
      const dy = y - dragging.startY

      setComponents(components.map(c => {
        if (dragging.componentIds.includes(c.id)) {
          let newX = dragging.initialPositions[c.id].x + dx
          let newY = dragging.initialPositions[c.id].y + dy

          if (snapToGrid) {
            newX = Math.round(newX / gridSize) * gridSize
            newY = Math.round(newY / gridSize) * gridSize
          }

          return { ...c, x: newX, y: newY }
        }
        return c
      }))
    } else if (resizing) {
      const dx = e.clientX - resizing.startX
      const dy = e.clientY - resizing.startY

      setComponents(components.map(c => {
        if (c.id !== resizing.componentId) return c

        let newWidth = resizing.initialWidth
        let newHeight = resizing.initialHeight
        let newX = c.x
        let newY = c.y

        const dir = resizing.direction

        // Handle resize based on direction
        if (dir.includes('e')) newWidth = Math.max(20, resizing.initialWidth + dx / zoom)
        if (dir.includes('w')) {
          newWidth = Math.max(20, resizing.initialWidth - dx / zoom)
          newX = resizing.initialX + (resizing.initialWidth - newWidth)
        }
        if (dir.includes('s')) newHeight = Math.max(20, resizing.initialHeight + dy / zoom)
        if (dir.includes('n')) {
          newHeight = Math.max(20, resizing.initialHeight - dy / zoom)
          newY = resizing.initialY + (resizing.initialHeight - newHeight)
        }

        if (snapToGrid) {
          newWidth = Math.round(newWidth / gridSize) * gridSize
          newHeight = Math.round(newHeight / gridSize) * gridSize
          newX = Math.round(newX / gridSize) * gridSize
          newY = Math.round(newY / gridSize) * gridSize
        }

        return { ...c, width: newWidth, height: newHeight, x: newX, y: newY }
      }))
    } else if (panning) {
      const dx = e.clientX - panning.startX
      const dy = e.clientY - panning.startY
      setPan({
        x: panning.initialPan.x + dx,
        y: panning.initialPan.y + dy
      })
    } else if (selectionBox) {
      setSelectionBox({ ...selectionBox, endX: x, endY: y })
      
      // Update selection
      const minX = Math.min(selectionBox.startX, x)
      const maxX = Math.max(selectionBox.startX, x)
      const minY = Math.min(selectionBox.startY, y)
      const maxY = Math.max(selectionBox.startY, y)
      
      const selected = new Set(
        components
          .filter(c => 
            c.visible &&
            !c.locked &&
            c.x < maxX && 
            c.x + c.width > minX && 
            c.y < maxY && 
            c.y + c.height > minY
          )
          .map(c => c.id)
      )
      setSelectedIds(selected)
    }
  }

  const handleMouseUp = () => {
    if (dragging) {
      saveToHistory()
      setDragging(null)
    }
    if (resizing) {
      saveToHistory()
      setResizing(null)
    }
    if (panning) {
      setPanning(false)
    }
    if (selectionBox) {
      setSelectionBox(null)
    }
  }

  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.25, Math.min(3, zoom * delta))
      
      // Zoom towards mouse position
      const rect = canvasRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const worldX = (mouseX - pan.x) / zoom
      const worldY = (mouseY - pan.y) / zoom
      
      const newPanX = mouseX - worldX * newZoom
      const newPanY = mouseY - worldY * newZoom
      
      setPan({ x: newPanX, y: newPanY })
    }
  }

  useEffect(() => {
    if (dragging || resizing || panning || selectionBox) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, resizing, panning, selectionBox, components, snapToGrid, gridSize, zoom, pan])

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#0f0f0f',
        cursor: panning || activeTool === 'pan' ? 'grab' : 
                dragging ? 'grabbing' : 
                resizing ? `${resizing.direction}-resize` :
                'default'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: '100%',
          height: '100%'
        }}
      >
        {/* Grid */}
        {showGrid && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4000px',
              height: '4000px',
              pointerEvents: 'none'
            }}
          >
            <defs>
              <pattern
                id="grid"
                width={gridSize}
                height={gridSize}
                patternUnits="userSpaceOnUse"
              >
                <circle cx={gridSize / 2} cy={gridSize / 2} r="0.5" fill="rgba(255,255,255,0.1)" />
              </pattern>
            </defs>
            <rect width="4000" height="4000" fill="url(#grid)" />
          </svg>
        )}

        {/* Components */}
        {components
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
          .map(comp => (
            <ComponentWrapper
              key={comp.id}
              component={comp}
              isSelected={selectedIds.has(comp.id)}
              isRuntime={isRuntime}
              tagValues={tagValues}
              canvasRef={canvasRef}
              setResizing={setResizing}
              onClick={(e) => {
                if (isRuntime) return
                e.stopPropagation()
                if (!e.shiftKey) {
                  setSelectedIds(new Set([comp.id]))
                } else {
                  const newSelected = new Set(selectedIds)
                  if (newSelected.has(comp.id)) {
                    newSelected.delete(comp.id)
                  } else {
                    newSelected.add(comp.id)
                  }
                  setSelectedIds(newSelected)
                }
              }}
              onResizeStart={(direction) => {
                setResizing({
                  componentId: comp.id,
                  direction,
                  startX: 0,
                  startY: 0,
                  initialWidth: comp.width,
                  initialHeight: comp.height,
                  initialX: comp.x,
                  initialY: comp.y
                })
              }}
            />
          ))}

        {/* Selection Box */}
        {selectionBox && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(selectionBox.startX, selectionBox.endX),
              top: Math.min(selectionBox.startY, selectionBox.endY),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              height: Math.abs(selectionBox.endY - selectionBox.startY),
              border: '1px dashed #00d4ff',
              background: 'rgba(0,212,255,0.1)',
              pointerEvents: 'none'
            }}
          />
        )}
      </div>
    </div>
  )
}

function ComponentWrapper({ component, isSelected, isRuntime, tagValues, onClick, canvasRef, setResizing }) {
  if (!component.visible) return null

  const tagValue = component.tagId ? (tagValues[component.tagId] ?? null) : null

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: component.x,
        top: component.y,
        width: component.width,
        height: component.height,
        transform: `rotate(${component.rotation || 0}deg)`,
        border: isSelected && !isRuntime ? '2px solid #00d4ff' : 'none',
        boxShadow: isSelected && !isRuntime ? '0 0 10px rgba(0,212,255,0.5)' : 'none',
        cursor: isRuntime ? 'default' : 'move',
        pointerEvents: isRuntime && component.type !== 'graph' ? 'none' : 'auto',
        opacity: component.locked && !isRuntime ? 0.6 : 1
      }}
    >
      {renderComponent(component, tagValue, isRuntime)}
      
      {/* Resize Handles */}
      {isSelected && !isRuntime && !component.locked && (
        <>
          {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(dir => (
            <div
              key={dir}
              onMouseDown={(e) => {
                e.stopPropagation()
                const rect = canvasRef.current.getBoundingClientRect()
                setResizing({
                  componentId: component.id,  // Changed from comp.id to component.id
                  direction: dir,
                  startX: e.clientX,
                  startY: e.clientY,
                  initialWidth: component.width,  // Changed from comp.width
                  initialHeight: component.height,  // Changed from comp.height
                  initialX: component.x,  // Changed from comp.x
                  initialY: component.y  // Changed from comp.y
                })
              }}
              style={{
                position: 'absolute',
                width: dir.length === 1 ? '100%' : 8,
                height: dir.length === 1 ? '100%' : 8,
                ...getHandlePosition(dir),
                background: '#00d4ff',
                border: '1px solid #fff',
                cursor: `${dir}-resize`,
                zIndex: 1000
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

function getHandlePosition(dir) {
  const positions = {
    nw: { top: -4, left: -4 },
    ne: { top: -4, right: -4 },
    sw: { bottom: -4, left: -4 },
    se: { bottom: -4, right: -4 },
    n: { top: -2, left: 0, right: 0, height: 4 },
    s: { bottom: -2, left: 0, right: 0, height: 4 },
    e: { right: -2, top: 0, bottom: 0, width: 4 },
    w: { left: -2, top: 0, bottom: 0, width: 4 }
  }
  return positions[dir] || {}
}

function renderComponent(component, tagValue, isRuntime) {
  switch (component.type) {
    case 'text':
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: component.align === 'center' ? 'center' : component.align === 'right' ? 'flex-end' : 'flex-start',
          fontSize: component.fontSize,
          fontWeight: component.fontWeight,
          color: component.color,
          backgroundColor: component.backgroundColor,
          border: component.borderWidth > 0 ? `${component.borderWidth}px solid ${component.borderColor}` : 'none',
          padding: '4px 8px',
          overflow: 'hidden'
        }}>
          {component.text}
        </div>
      )
    
    case 'gauge':
      return <GaugeComponent component={component} value={tagValue} />
    
    case 'led':
      return <LEDComponent component={component} value={tagValue} />
    
    case 'graph':
      return <GraphComponent component={component} isRuntime={isRuntime} />
    
    case 'tank':
      return <TankComponent component={component} value={tagValue} />
    
    case 'rect':
      return (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: component.fill,
          border: `${component.strokeWidth}px solid ${component.stroke}`,
          borderRadius: component.borderRadius
        }} />
      )
    
    case 'circle':
      return (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: component.fill,
          border: `${component.strokeWidth}px solid ${component.stroke}`,
          borderRadius: '50%'
        }} />
      )
    
    case 'line':
      return (
        <div style={{
          width: '100%',
          height: component.strokeWidth,
          backgroundColor: component.stroke
        }} />
      )
    
    default:
      return (
        <div style={{
          width: '100%',
          height: '100%',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          color: '#666'
        }}>
          {component.type}
        </div>
      )
  }
}
