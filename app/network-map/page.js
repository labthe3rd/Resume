// file: ./app/network-map/page.js
'use client'

import SystemArchitectureMap from '../../components/SystemArchitectureMap'
import Link from 'next/link'

// This page documents the network architecture that powers the demos. It explains
// how a publicly hosted Next.js frontend connects securely to a private OT lab using
// a reverse proxy and VPN tunnel. An interactive map illustrates each component and
// connection layer.

export default function NetworkMapPage() {
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
        Network&nbsp;Architecture&nbsp;Overview
      </h1>

      <p style={{ marginBottom: '1rem' }}>
        Delivering these demos requires a robust yet secure topology. The frontend is deployed to
        a global edge network where it serves the React application over HTTPS. A Caddy reverse
        proxy terminates TLS, enforces rate limits and exposes a single public endpoint. Beyond the
        proxy, a WireGuard VPN establishes a point‑to‑point tunnel into a private lab network—no OT
        equipment is exposed directly to the internet.
      </p>

      <p style={{ marginBottom: '1rem' }}>
        Inside the private network a Node.js API gateway orchestrates WebSocket connections and
        handles REST requests. It talks to a containerized large language model that decides PID
        adjustments and detects anomalies. Another container hosts an OPC‑UA server to simulate
        physical processes like thermal heating and tank levels. All services communicate over an
        isolated Docker bridge network to simplify discovery and enhance isolation.
      </p>

      <p style={{ marginBottom: '2rem' }}>
        Click on each node in the map below to learn about its role, security controls and key
        features. This design reflects how brownfield OT systems can be safely modernized using
        zero‑trust principles, strong encryption and minimal attack surface.
      </p>

      {/* Interactive network map */}
      <div style={{ marginTop: '3rem' }}>
        <SystemArchitectureMap />
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