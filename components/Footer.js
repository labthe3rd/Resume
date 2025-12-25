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
              background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
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
            maxWidth: 400,
            lineHeight: 1.6
          }}>
            Controls Engineer & OT Expert specializing in industrial automation, 
            PLC programming, and operational technology security.
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
              whileHover={{ scale: 1.2, color: '#00d4ff' }}
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
              whileHover={{ scale: 1.2, color: '#00d4ff' }}
              style={{
                color: 'var(--text-tertiary)',
                transition: 'color 0.3s ease'
              }}
            >
              <Globe size={22} />
            </motion.a>
            <motion.a
              href="mailto:Labthe3rd@gmail.com"
              whileHover={{ scale: 1.2, color: '#00d4ff' }}
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

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-tertiary)',
            fontSize: '0.875rem'
          }}>
            <span>© {currentYear} Louis Bersine. Built with</span>
            <Heart size={14} style={{ color: '#ef4444' }} />
            <span>and Next.js</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
