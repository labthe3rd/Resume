'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { GraduationCap, MapPin, Briefcase, Code } from 'lucide-react'

const stats = [
  { value: '10+', label: 'Years Experience', icon: Briefcase },
  { value: 'BSEE', label: 'Michigan Tech', icon: GraduationCap },
  { value: '4', label: 'Industries', icon: MapPin },
  { value: '20+', label: 'Technologies', icon: Code },
]

export default function About() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      id="about"
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
          style={{ marginBottom: '4rem' }}
        >
          <span className="section-subtitle">About Me</span>
          <h2 className="section-title">
            Engineering <span className="gradient-text">Excellence</span>
          </h2>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '3rem',
          alignItems: 'start'
        }}>
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
              marginBottom: '1.5rem'
            }}>
              A Michigan Tech BSEE graduate, I bridge the gap between <strong>Legacy Controls</strong> 
              and <strong>Modern IT Infrastructure</strong>. My focus is on Digital Transformation—turning 
              unreliable plant-floor data into secure, actionable insights. Having managed projects across 4 industries, I am committed to delivering excellence wherever the challenge leads.
            </p>
            <p style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
              marginBottom: '2rem'
            }}>
              In the Grand Rapids industrial hub, I specialize in high-speed Food/CPG and 
              Automotive assembly, delivering "Secure-by-Design" automation that prioritizes 
              both safety and multi-million dollar ROI. Open to relocation to support the evolution of Food/CPG and Automotive manufacturing hubs.
            </p>

            <div className="glass-card" style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <GraduationCap size={32} style={{ color: 'var(--accent-cyan)' }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  Michigan Technological University
                </div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  BSEE | Electrical Engineering | Class of 2015
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem'
            }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                className="glass-card"
                style={{
                  padding: '2rem',
                  textAlign: 'center'
                }}
              >
                <stat.icon
                  size={28}
                  style={{
                    color: 'var(--accent-cyan)',
                    marginBottom: '1rem'
                  }}
                />
                <div style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {stat.value}
                </div>
                <div style={{
                  color: 'var(--text-tertiary)',
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
