'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, Activity, Cpu, Gauge, Thermometer, Zap } from 'lucide-react'

const generateRandomValue = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

export default function Playground() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [isRunning, setIsRunning] = useState(false)
  const [plcData, setPlcData] = useState({
    temperature: 72,
    pressure: 45,
    speed: 0,
    production: 0,
    status: 'STOPPED'
  })

  useEffect(() => {
    let interval
    if (isRunning) {
      interval = setInterval(() => {
        setPlcData(prev => ({
          temperature: Math.min(95, Math.max(65, prev.temperature + generateRandomValue(-2, 3))),
          pressure: Math.min(60, Math.max(30, prev.pressure + generateRandomValue(-3, 3))),
          speed: Math.min(100, Math.max(60, prev.speed + generateRandomValue(-5, 5))),
          production: prev.production + generateRandomValue(1, 3),
          status: 'RUNNING'
        }))
      }, 500)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const handleStart = () => {
    setIsRunning(true)
    setPlcData(prev => ({ ...prev, speed: 75, status: 'STARTING...' }))
    setTimeout(() => setPlcData(prev => ({ ...prev, status: 'RUNNING' })), 1000)
  }

  const handleStop = () => {
    setIsRunning(false)
    setPlcData(prev => ({ ...prev, speed: 0, status: 'STOPPED' }))
  }

  const handleReset = () => {
    setIsRunning(false)
    setPlcData({
      temperature: 72,
      pressure: 45,
      speed: 0,
      production: 0,
      status: 'STOPPED'
    })
  }

  const getStatusColor = () => {
    switch (plcData.status) {
      case 'RUNNING': return '#10b981'
      case 'STARTING...': return '#f97316'
      default: return '#ef4444'
    }
  }

  return (
    <section
      id="playground"
      ref={ref}
      style={{
        padding: '8rem 2rem',
        position: 'relative'
      }}
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ marginBottom: '3rem' }}
        >
          <span className="section-subtitle">Interactive Demo</span>
          <h2 className="section-title">
            PLC <span className="gradient-text">Playground</span>
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            maxWidth: 600,
            marginTop: '1rem'
          }}>
            Experience a simulated industrial control system. Start the line and watch real-time metrics update.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card"
          style={{
            padding: '2rem',
            maxWidth: 900,
            margin: '0 auto'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: getStatusColor(),
                boxShadow: `0 0 20px ${getStatusColor()}`,
                animation: isRunning ? 'pulse 1s infinite' : 'none'
              }} />
              <span className="mono" style={{
                color: getStatusColor(),
                fontWeight: 600,
                fontSize: '0.875rem'
              }}>
                {plcData.status}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {!isRunning ? (
                <motion.button
                  onClick={handleStart}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #00d4ff 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--bg-primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}
                >
                  <Play size={18} />
                  Start Line
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleStop}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}
                >
                  <Pause size={18} />
                  Stop Line
                </motion.button>
              )}

              <motion.button
                onClick={handleReset}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Space Grotesk, sans-serif'
                }}
              >
                <RotateCcw size={18} />
                Reset
              </motion.button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.5rem'
          }}>
            <MetricCard
              icon={Thermometer}
              label="Temperature"
              value={plcData.temperature}
              unit="°F"
              color="#f97316"
              min={65}
              max={95}
              isRunning={isRunning}
            />
            <MetricCard
              icon={Gauge}
              label="Pressure"
              value={plcData.pressure}
              unit="PSI"
              color="#3b82f6"
              min={30}
              max={60}
              isRunning={isRunning}
            />
            <MetricCard
              icon={Activity}
              label="Line Speed"
              value={plcData.speed}
              unit="%"
              color="#10b981"
              min={0}
              max={100}
              isRunning={isRunning}
            />
            <MetricCard
              icon={Zap}
              label="Production"
              value={plcData.production}
              unit="units"
              color="#a855f7"
              isCounter
              isRunning={isRunning}
            />
          </div>

          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem'
          }}>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
              // PLC Tag Monitor
            </div>
            <div style={{ color: '#10b981' }}>
              Program:MainProgram.Temperature := {plcData.temperature};
            </div>
            <div style={{ color: '#3b82f6' }}>
              Program:MainProgram.Pressure := {plcData.pressure};
            </div>
            <div style={{ color: '#f97316' }}>
              Program:MainProgram.LineSpeed := {plcData.speed};
            </div>
            <div style={{ color: '#a855f7' }}>
              Program:MainProgram.ProductionCount := {plcData.production};
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function MetricCard({ icon: Icon, label, value, unit, color, min, max, isCounter, isRunning }) {
  const percentage = isCounter ? 100 : ((value - min) / (max - min)) * 100

  return (
    <div style={{
      padding: '1.5rem',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '12px',
      border: '1px solid var(--glass-border)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <Icon size={20} style={{ color }} />
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          {label}
        </span>
      </div>

      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: '2rem',
        fontWeight: 700,
        color,
        marginBottom: '0.5rem'
      }}>
        {value}
        <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', marginLeft: '0.25rem' }}>
          {unit}
        </span>
      </div>

      {!isCounter && (
        <div style={{
          height: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <motion.div
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3 }}
            style={{
              height: '100%',
              background: color,
              borderRadius: 2
            }}
          />
        </div>
      )}
    </div>
  )
}
