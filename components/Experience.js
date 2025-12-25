'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { MapPin, Calendar, Building } from 'lucide-react'

const experiences = [
  {
    company: 'Kellanova | Kellogg',
    role: 'Controls Engineer & OT Specialist',
    period: 'Dec 2023 - Present',
    location: 'Grand Rapids, MI',
    description: 'Managed controls infrastructure on OT Network. Designed and executed equipment upgrades and installs during plant downtime.',
    highlights: [
      'OT Network Infrastructure Management',
      'Equipment Upgrades & Installations',
      'Plant Downtime Optimization',
      'System Documentation & Recovery'
    ],
    color: '#00d4ff'
  },
  {
    company: 'Proficient Machine & Automation',
    role: 'Controls Engineer',
    period: 'Sep 2019 - Sep 2023',
    location: 'Byron Center, MI',
    description: 'Designed AutoCAD Electrical drawings, programmed equipment, and commissioned installations at customer facilities.',
    highlights: [
      'AutoCAD Electrical Design',
      'PLC Programming',
      'Customer Facility Commissioning',
      'Touch Panel Test Stations'
    ],
    color: '#a855f7'
  },
  {
    company: 'Roman Manufacturing',
    role: 'Project Engineer',
    period: 'Aug 2018 - Sep 2019',
    location: 'Wyoming, MI',
    description: 'Managed execution and procurement of customer build requests. Provided on-site support and executed upgrades at Metal Refinery.',
    highlights: [
      'Project Execution & Procurement',
      'Metal Refinery Modernization',
      'On-site Technical Support',
      'Safety Standards Compliance'
    ],
    color: '#10b981'
  },
  {
    company: 'Altron Automation',
    role: 'Controls Engineer',
    period: 'Dec 2016 - Aug 2018',
    location: 'Hudsonville, MI',
    description: 'Designed AutoCAD Electrical schematics, programmed equipment, and commissioned installations at customer facilities.',
    highlights: [
      'Robotic Cell Design & Programming',
      'Automotive Assembly Lines',
      'FAT Execution',
      'Autonomous Systems Development'
    ],
    color: '#f97316'
  }
]

export default function Experience() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

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
      </div>
    </section>
  )
}
