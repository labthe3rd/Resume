'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Cpu, Network, Code2, Shield, Bot, Eye } from 'lucide-react'

const skillCategories = [
  {
    title: 'Controls Engineering',
    icon: Cpu,
    color: '#00d4ff',
    skills: [
      'Studio 5000', 'RSLogix 500', 'FTView ME', 'FTView SE',
      'FT Assetcentre', 'Osisoft PI', 'Ignition', 'Kepware',
      'Fanuc', 'IAI Robots', 'Denso Robots', 'Kinnetix',
      'Powerflex', 'Atlas Copco', 'Siemens S7'
    ]
  },
  {
    title: 'Vision Systems',
    icon: Eye,
    color: '#a855f7',
    skills: ['Keyence Vision', 'Cognex Vision', 'OCR Implementation', 'Quality Inspection']
  },
  {
    title: 'OT Administration',
    icon: Network,
    color: '#10b981',
    skills: [
      'TCP/IP', 'PTP', 'NTP', 'SMNTP', 'RDP',
      'EIP', 'Canbus', 'VPNs', 'Firewalls', 'Active Directory'
    ]
  },
  {
    title: 'OT Security',
    icon: Shield,
    color: '#f97316',
    skills: ['Claroty', 'Network Segmentation', 'Disaster Recovery', 'Compliance']
  },
  {
    title: 'Programming',
    icon: Code2,
    color: '#3b82f6',
    skills: [
      'Python', 'PowerShell', 'C#', 'C++', 'JavaScript',
      'VBA', 'AutoLISP', 'Batch', 'Bash', 'Power Automate'
    ]
  },
  {
    title: 'Robotics & Automation',
    icon: Bot,
    color: '#ec4899',
    skills: ['Fanuc Robots', 'Denso Robots', 'IAI Robots', 'Autonomous Systems', 'PLC Integration']
  }
]

export default function Skills() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      id="skills"
      ref={ref}
      style={{
        padding: '8rem 2rem',
        position: 'relative',
        background: 'linear-gradient(180deg, transparent 0%, rgba(0, 212, 255, 0.02) 50%, transparent 100%)'
      }}
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ marginBottom: '4rem' }}
        >
          <span className="section-subtitle">Expertise</span>
          <h2 className="section-title">
            Technical <span className="gradient-text">Skillset</span>
          </h2>
        </motion.div>

        <div className="bento-grid">
          {skillCategories.map((category, index) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`glass-card bento-item ${index === 0 ? 'large' : ''}`}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <div className="project-card-accent" style={{
                background: `linear-gradient(90deg, ${category.color}, transparent)`
              }} />
              
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${category.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <category.icon size={24} style={{ color: category.color }} />
                  </div>
                  <h3 style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 700
                  }}>
                    {category.title}
                  </h3>
                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  {category.skills.map((skill) => (
                    <motion.span
                      key={skill}
                      whileHover={{ scale: 1.05, borderColor: category.color }}
                      className="skill-tag"
                      style={{ cursor: 'default' }}
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
