// file: ./app/tank-monitor/page.js
'use client'

import { useEffect } from 'react'
import LiquidTankMonitor from '../../components/LiquidTankMonitor'
import Link from 'next/link'
import { useWebSocket } from '../../contexts/WebSocketContext'

// This page contains a blog entry describing the liquid tank monitoring demo.
// The article explains how the digital twin works, the anomaly detection and
// escalation logic, and why this tooling matters for high‑availability OT systems.
// At the end of the article the interactive demo is embedded for visitors to explore.

export default function TankMonitorBlogPage() {
  const { subscribe } = useWebSocket()

  // Subscribe to the tank stream when mounted so the demo receives data.
  useEffect(() => {
    const unsub = subscribe('tank', () => {})
    return () => unsub()
  }, [subscribe])

  return (
    <div
      style={{
        padding: '6rem 2rem',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        color: 'var(--text-secondary)',
        lineHeight: 1.6
      }}
    >
      <h1
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '2.25rem',
          fontWeight: 700,
          marginBottom: '2rem',
          color: 'var(--text-primary)'
        }}
      >
        Liquid&nbsp;Tank&nbsp;Monitor&nbsp;Demo
      </h1>

      <p style={{ marginBottom: '1rem' }}>
        This lab simulates a storage tank with high and low level sensors, a fill valve and a
        controller that manages filling. In most plants, operators only know whether the tank is
        empty or full. Here we build a digital twin that calculates the continuous level, detects
        anomalies and escalates alerts based on severity.
      </p>

      <p style={{ marginBottom: '1rem' }}>
        The simulation runs on an OPC‑UA server that publishes tank state at 10&nbsp;Hz. A custom
        monitoring service subscribes to the stream, evaluates thresholds and looks for unusual
        patterns such as sensor bypass, stuck valves, negative level readings or rapid level
        oscillations. When an anomaly persists, the system triggers notifications: an HMI alert first,
        then an email, and finally an automated voice call via SignalWire if the situation is critical.
      </p>

      <p style={{ marginBottom: '1rem' }}>
        Each alert includes a descriptive message and the timestamp so operators can respond quickly.
        Voice and SMS settings are configurable and disabled by default to prevent spam. This demo
        shows how layered notification policies can help brownfield plants respond to events without
        dispatching maintenance unnecessarily.
      </p>

      <p style={{ marginBottom: '2rem', color: 'var(--text-primary)', fontWeight: 500 }}>
        Scroll down to explore the interactive monitoring dashboard. You can toggle faults, pause
        filling and enable text‑to‑speech to hear the escalation sequence. Watch how the tank level
        evolves and how the AI analysis describes the anomalies.
      </p>

      {/* Interactive simulation */}
      <div style={{ marginTop: '3rem' }}>
        <LiquidTankMonitor fullPage={false} />
      </div>

      {/* Back link to labs index */}
      <div style={{ marginTop: '3rem' }}>
        <Link href="/labs" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
          ← Back to Labs &amp; Demos
        </Link>
      </div>
    </div>
  )
}