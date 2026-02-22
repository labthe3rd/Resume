// file: Footer.js (modified)
// This footer update aligns the tagline with the narrative of stabilizing OT networks
// and high‑availability controls architectures.

'use client'

import { motion } from 'framer-motion'
import { Linkedin, Globe, Mail, Heart } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer style={{
      padding: '4rem 2rem',
      borderTop: '1px solid var(--glass-border)',
      background: 'rgba(0, 0, 0, 0.3)'
    }}>
      <div className="container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          textAlign: 'center'
        }}>
          <motion.a
            href="#hero"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })
            }}
            whileHover={{ scale: 1.05 }}
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '2rem',
              fontWeight: 800,
              background: 'var(--gradient-1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            Louis Bersine
          </motion.a>

          <p style={{
            color: 'var(--text-tertiary)',
            maxWidth: 500,
            lineHeight: 1.6
          }}>
            OT Infrastructure & Controls Architect specializing in brownfield network stabilization, cyber‑aligned governance, high‑availability Rockwell platforms and measured risk reduction.
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem'
          }}>
            <motion.a
              href="https://www.linkedin.com/in/louis-bersine-iii"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2, color: 'var(--accent-primary)' }}
              style={{
                color: 'var(--text-tertiary)',
                transition: 'color 0.3s ease'
              }}
            >
              <Linkedin size={22} />
            </motion.a>
            <motion.a
              href="https://www.louisbersine.com/"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2, color: 'var(--accent-primary)' }}
              style={{
                color: 'var(--text-tertiary)',
                transition: 'color 0.3s ease'
              }}
            >
              <Globe size={22} />
            </motion.a>
            <motion.a
              href="mailto:Labthe3rd@gmail.com"
              whileHover={{ scale: 1.2, color: 'var(--accent-primary)' }}
              style={{
                color: 'var(--text-tertiary)',
                transition: 'color 0.3s ease'
              }}
            >
              <Mail size={22} />
            </motion.a>
          </div>

          <div style={{
            width: '100%',
            height: 1,
            background: 'var(--glass-border)'
          }} />

          {/* Replace casual “Built with <3 and Next.js” with a professional copyright line */}
          <div
            style={{
              color: 'var(--text-tertiary)',
              fontSize: '0.875rem'
            }}
          >
            © {currentYear} Louis Bersine. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}