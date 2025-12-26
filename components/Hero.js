'use client'

import { motion } from 'framer-motion'
import { ArrowDown, Linkedin, Globe, Mail } from 'lucide-react'

export default function Hero() {
  return (
    <section
      id="hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '6rem 2rem 4rem'
      }}
    >
      <div className="container" style={{ textAlign: 'center', maxWidth: 900 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.2 }}
        >
          <span
            className="mono"
            style={{
              fontSize: '0.875rem',
              color: 'var(--accent-cyan)',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '1.5rem'
            }}
          >
            Controls & OT Expert
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.4 }}
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(3rem, 12vw, 8rem)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            marginBottom: '2rem'
          }}
        >
          <span style={{ display: 'block' }}>Louis</span>
          <span
            className="gradient-text"
            style={{ display: 'block' }}
          >
            Bersine
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.6 }}
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'var(--text-secondary)',
            maxWidth: 600,
            margin: '0 auto 3rem',
            lineHeight: 1.6
          }}
        >
          A decade of experience transforming industrial operations through 
          innovative controls engineering, OT security, and intelligent automation solutions.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.8 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <motion.a
            href="#projects"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="cta-button"
          >
            View Projects
            <ArrowDown size={18} />
          </motion.a>

          <motion.a
            href="#contact"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="cta-button cta-button-outline"
          >
            <Mail size={18} />
            Get in Touch
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 3 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            marginTop: '4rem'
          }}
        >
          <motion.a
            href="https://www.linkedin.com/in/louis-bersine-iii"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1, color: '#00d4ff' }}
            style={{
              color: 'var(--text-tertiary)',
              transition: 'color 0.3s ease'
            }}
          >
            <Linkedin size={24} />
          </motion.a>
          <motion.a
            href="https://www.louisbersine.com/"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1, color: '#00d4ff' }}
            style={{
              color: 'var(--text-tertiary)',
              transition: 'color 0.3s ease'
            }}
          >
            <Globe size={24} />
          </motion.a>
          <motion.a
            href="#contact"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
            }}
            whileHover={{ scale: 1.1, color: '#00d4ff' }}
            style={{
              color: 'var(--text-tertiary)',
              transition: 'color 0.3s ease',
              cursor: 'pointer'
            }}
          >
            <Mail size={24} />
          </motion.a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 3.5 }}
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            color: 'var(--text-tertiary)',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <ArrowDown size={24} />
        </motion.div>
      </motion.div>
    </section>
  )
}
