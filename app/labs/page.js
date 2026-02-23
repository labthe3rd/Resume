// file: ./app/labs/page.js
'use client'

import Link from 'next/link'
import { Cpu, Droplet, Network } from 'lucide-react'
import { motion } from 'framer-motion'

// The labs index provides an overview of the available demos and technical blog posts.
// Each card links to a detailed article with an embedded interactive simulation or map.

export default function LabsPage() {
  const labs = [
    {
      title: 'AI PID Control',
      description:
        'How a private LLM tunes PID gains on a simulated thermal process in real time.',
      href: '/control',
      Icon: Cpu,
    },
    {
      title: 'Liquid Tank Monitor',
      description:
        'Building a digital twin of a storage tank with anomaly detection and escalation.',
      href: '/tank-monitor',
      Icon: Droplet,
    },
    {
      title: 'Network Architecture',
      description:
        'Securing the connection between a public web app and a private OT lab with VPN and containers.',
      href: '/network-map',
      Icon: Network,
    },
  ]

  return (
    <section
      style={{
        padding: '6rem 1.5rem',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}
    >
      <div style={{ maxWidth: '1400px', width: '100%', margin: '0 auto' }}>

        {/* Back link to the main page */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href='/'
            style={{
              color: 'var(--accent-primary)',
              textDecoration: 'underline',
              fontSize: '0.9rem'
            }}
          >
            ← Back to Home
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ marginBottom: '3rem' }}
        >
          <span className="section-subtitle">Labs &amp; Demos</span>
          <h2 className="section-title">
            Technical <span className="gradient-text">Explorations</span>
          </h2>
          <p style={{ maxWidth: '700px', marginTop: '1rem', lineHeight: 1.5 }}>
            These posts document experimental tools and prototypes built to test new ideas. They are
            secondary to the core outcomes but show how we apply advanced techniques to real process
            challenges.
          </p>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {labs.map(({ title, description, href, Icon }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="glass-card"
              style={{
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                cursor: 'default'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={24} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)'
                }}>
                  {title}
                </h3>
              </div>

              <p style={{ flex: 1, fontSize: '0.9rem', lineHeight: 1.4 }}>
                {description}
              </p>

              <Link
                href={href}
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.5rem 1rem',
                  background: 'var(--gradient-1)',
                  color: 'var(--bg-primary)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
              >
                Read &amp; Explore →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}