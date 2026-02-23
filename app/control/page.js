// file: ./app/control/page.js
'use client'

import { useEffect } from 'react'
import ControlSystem from '../../components/ControlSystem'
import Link from 'next/link'
import { useWebSocket } from '../../contexts/WebSocketContext'

// This page provides a detailed blog entry about the AI PID control demo.
// It first explains the problem of tuning PID controllers and how a local
// large language model can assist with adaptive tuning. At the bottom of
// the article the interactive simulation is embedded so visitors can try
// the demo themselves without leaving the page.

export default function ControlBlogPage() {
  const { subscribe } = useWebSocket()

  // Subscribe to the control stream when this page is mounted. Without this
  // subscription the underlying WebSocket would never connect and the demo
  // would not receive live data.
  useEffect(() => {
    const unsub = subscribe('control', () => {})
    return () => unsub()
  }, [subscribe])

  return (
    <div
      style={{
        padding: '6rem 2rem',
        /* expand the content width on larger screens while maintaining good margins */
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
        AI&nbsp;PID&nbsp;Control&nbsp;Demo
      </h1>

      <p style={{ marginBottom: '1rem' }}>
        Traditional proportional–integral–derivative (PID) controllers are the workhorses of
        industrial automation. But tuning K<sub>p</sub>, K<sub>i</sub> and K<sub>d</sub> so that a
        process follows its set point without overshoot or oscillation can be time‑consuming and
        often depends on tribal knowledge. In this lab we explored how a private large language model
        can monitor a simulated thermal process and suggest incremental PID adjustments in real time.
      </p>

      <p style={{ marginBottom: '1rem' }}>
        The demo uses an OPC‑UA server to emulate a heater and thermocouple. The agent receives
        live metrics—process value, set point, error, stability, oscillation and smoothness—and
        responds with JSON instructions to either <code>tune</code> or <code>monitor</code>. When
        tuning, it proposes new PID gains within defined safe ranges (K<sub>p</sub> ≈ 1–4, K<sub>i</sub> ≈
        0.05–0.3 and K<sub>d</sub> ≈ 0.3–2). The API gateway orchestrates the LLM and enforces a
        cooldown between changes so the system settles before retuning.
      </p>

      <p style={{ marginBottom: '1rem' }}>
        Because the inference happens locally, no process data leaves the plant. The model uses a
        prompt tailored for PID tuning and logs its reasoning along with confidence scores. This
        approach demonstrates how AI can assist controls engineers without replacing them—reducing
        manual trial‑and‑error, preventing prolonged instability and providing a repeatable
        methodology for brownfield upgrades.
      </p>

      <p style={{ marginBottom: '2rem', color: 'var(--text-primary)', fontWeight: 500 }}>
        After reading about the approach you can explore the interactive simulation below. Observe how
        the agent adjusts the gains and how the temperature trace responds. Feel free to change the
        set point and watch the AI regain stability.
      </p>

      {/* Interactive simulation */}
      <div style={{ marginTop: '3rem' }}>
        <ControlSystem fullPage={false} />
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