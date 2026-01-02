'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { MapPin, Calendar } from 'lucide-react'

export default function Experience() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/experience')
      .then(res => res.json())
      .then(data => {
        setExperiences(data.experiences)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load experiences:', err)
        setLoading(false)
      })
  }, [])

  return (
    <section
      id="experience"
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
          <span className="section-subtitle">Career</span>
          <h2 className="section-title">
            Professional <span className="gradient-text">Experience</span>
          </h2>
        </motion.div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            Loading experience...
          </div>
        ) : (
          <div style={{
            position: 'relative',
            paddingLeft: '2rem'
          }}>
            <div className="timeline-line" />

            {experiences.map((exp, index) => (
              <motion.div
                key={exp.company}
                initial={{ opacity: 0, x: -30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                style={{
                  position: 'relative',
                  marginBottom: '3rem'
                }}
              >
                <div
                  className="timeline-dot"
                  style={{
                    background: exp.color,
                    boxShadow: `0 0 20px ${exp.color}`
                  }}
                />

                <motion.div
                  className="glass-card"
                  whileHover={{ x: 10 }}
                  style={{
                    marginLeft: '2rem',
                    padding: '2rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    className="project-card-accent"
                    style={{
                      background: `linear-gradient(90deg, ${exp.color}, transparent)`,
                      opacity: 1
                    }}
                  />

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <h3 style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        marginBottom: '0.5rem'
                      }}>
                        {exp.company}
                      </h3>
                      <div style={{
                        color: exp.color,
                        fontWeight: 600,
                        marginBottom: '0.5rem'
                      }}>
                        {exp.role}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '0.5rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-tertiary)',
                        fontSize: '0.875rem'
                      }}>
                        <Calendar size={14} />
                        {exp.period}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-tertiary)',
                        fontSize: '0.875rem'
                      }}>
                        <MapPin size={14} />
                        {exp.location}
                      </div>
                    </div>
                  </div>

                  <p style={{
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: '1.5rem'
                  }}>
                    {exp.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    {exp.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: `${exp.color}15`,
                          border: `1px solid ${exp.color}30`,
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          color: exp.color
                        }}
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
