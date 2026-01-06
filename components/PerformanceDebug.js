'use client'

import { useState, useEffect } from 'react'
import { X, Activity, Cpu, HardDrive, Zap, Monitor } from 'lucide-react'

export default function PerformanceDebug({ stats, onClose, onSetTier }) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (stats?.lastChange) {
      setHistory(prev => [...prev.slice(-9), stats.lastChange])
    }
  }, [stats?.lastChange])

  if (!stats) return null

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  const getTierColor = (tier) => {
    switch (tier) {
      case 'low': return '#f97316'
      case 'medium': return '#10b981'
      case 'high': return '#00d4ff'
      default: return '#ffffff'
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: isMinimized ? '300px' : '450px',
      maxHeight: isMinimized ? '60px' : '90vh',
      background: 'rgba(10, 10, 15, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '20px',
      zIndex: 10000,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px',
      color: '#ffffff',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isMinimized ? '0' : '20px',
        paddingBottom: isMinimized ? '0' : '15px',
        borderBottom: isMinimized ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} color="#00d4ff" />
          <span style={{ fontWeight: 600, fontSize: '15px' }}>Performance Monitor</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isMinimized ? '▼' : '▲'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Current FPS */}
          <div style={{
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', marginBottom: '5px' }}>
              CURRENT FPS
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 700, 
              color: stats.fps >= 50 ? '#10b981' : stats.fps >= 30 ? '#10b981' : '#f97316'
            }}>
              {stats.fps ? stats.fps.toFixed(1) : '0.0'}
            </div>
          </div>

          {/* Quality Tier Controls */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: '11px', 
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              Quality Tier
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['low', 'medium', 'high'].map(tier => (
                <button
                  key={tier}
                  onClick={() => onSetTier(tier)}
                  style={{
                    flex: 1,
                    background: stats.currentTier === tier 
                      ? getTierColor(tier)
                      : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${stats.currentTier === tier ? getTierColor(tier) : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '8px',
                    padding: '10px',
                    cursor: 'pointer',
                    color: stats.currentTier === tier ? '#000000' : '#ffffff',
                    fontWeight: stats.currentTier === tier ? 700 : 400,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s'
                  }}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Hardware Info */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: '11px', 
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Monitor size={14} />
              Hardware Capabilities
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  <Cpu size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  CPU Cores
                </span>
                <span>{stats.capabilities?.hardwareConcurrency || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  <HardDrive size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  Memory
                </span>
                <span>{stats.capabilities?.deviceMemory ? `${stats.capabilities.deviceMemory} GB` : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  <Zap size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  Device Type
                </span>
                <span>{stats.capabilities?.isMobile ? 'Mobile' : 'Desktop'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Pixel Ratio</span>
                <span>{stats.capabilities?.devicePixelRatio?.toFixed(2) || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Max Texture</span>
                <span>{stats.capabilities?.maxTextureSize || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Current Quality Settings */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: '11px', 
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              Current Settings
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Particles</span>
                <span>{stats.quality?.particleCount || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Grid Divisions</span>
                <span>{stats.quality?.gridDivisions || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Orbs</span>
                <span>{stats.quality?.orbCount || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Antialias</span>
                <span>{stats.quality?.antialias ? 'Yes' : 'No'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Animation Speed</span>
                <span>{stats.quality?.animationSpeed || 'N/A'}x</span>
              </div>
            </div>
          </div>

          {/* Change History */}
          {history.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              padding: '15px'
            }}>
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                fontSize: '11px', 
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Change History
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.slice().reverse().map((change, i) => (
                  <div 
                    key={i}
                    style={{
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      borderLeft: `3px solid ${getTierColor(change.to)}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ 
                        color: change.action === 'upgrade' ? '#10b981' : 
                               change.action === 'downgrade' ? '#f97316' : '#00d4ff',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {change.action}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                        {formatTime(change.time)}
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {change.from ? `${change.from} → ${change.to}` : `Set to ${change.to}`}
                      {change.fps && ` (${change.fps.toFixed(1)} FPS)`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}