'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Clock, DollarSign, Shield, Cpu, Bot, Wrench, Zap, Eye,Castle } from 'lucide-react'

const projectCategories = ['All', 'Kellanova', 'Proficient', 'Altron', 'Freelance']

const projects = [
{
  title: 'PTP Grandmaster Incident Response',
  company: 'Kellanova',
  category: 'Kellanova',
  icon: Clock,
  color: '#00d4ff',
  problem: 'A critical high-speed production line suffered catastrophic "phantom" position failures that mimicked mechanical breakage, threatening $450,000/hr in lost retail output.',
  solution: 'Performed deep-packet analysis via Asset Centre to isolate a rogue PLC broadcast. Corrected the Best Master Clock Algorithm (BMCA) conflict and engineered network guards to prevent future grandmaster takeovers.',
  benefit: 'Executed a definitive 8-hour recovery where industry averages for such "ghost" timing errors exceed 48 hours—saving an estimated $5M+ in potential downtime and lost product.',
  savings: '350,000/hr',
  tags: ['Precision Time Protocol', 'PTP/BMCA', 'Digital Forensics', 'Network Hardening']
},
  {
    title: 'OT System Overhaul',
    company: 'Kellanova',
    category: 'Kellanova',
    icon: Castle,
    color: '#a855f7',
    problem: 'Several systems for data collection were not functioning upon starting my role. No documentation existed.',
    solution: 'Restored functionality for OPC communication on several servers, created disaster recovery program, engineered solution to track PLC changes, developed automated backup system and created documentation.',
    benefit: 'Plant wide productivity improvements, reduced maintenance time, and restored metrics that were no longer being tracked.',
    savings: '150,000',
    tags: ['OPC', 'Disaster Recovery', 'Documentation', 'Automation']
  },
{
  title: 'Internal Safety System ROI',
  company: 'Kellanova',
  category: 'Kellanova',
  icon: Shield,
  color: '#10b981',
  problem: 'Cutting conveyor utilized a high-risk single-channel safety system susceptible to undetected failure.',
  solution: 'Designed and internally executed a Guard Link intelligent safety upgrade, bypassing the need for high-cost external contractors.',
  benefit: 'Achieved Category 3/4 safety compliance with an 85% cost reduction compared to external quotes.',
  savings: '270,000',
  tags: ['ROI Optimization', 'Guard Link', 'Functional Safety']
},
  {
    title: 'Touch Panel Test Station',
    company: 'Proficient',
    category: 'Proficient',
    icon: Eye,
    color: '#f97316',
    problem: 'Customer needed automated testing for electric vehicle touch screen panels.',
    solution: 'Designed electrical schematics and programming for system that interfaced with customer touch screen panels for electric vehicles and verified functionality.',
    benefit: 'Fully automated testing process with comprehensive functionality verification.',
    savings: '120,000',
    tags: ['EV', 'Touch Panels', 'Testing', 'Automation']
  },
  {
    title: 'Glovebox Latch Rotary System',
    company: 'Proficient',
    category: 'Proficient',
    icon: Cpu,
    color: '#3b82f6',
    problem: 'Fully autonomous glovebox latch system was not meeting customer metrics.',
    solution: 'Took ownership of glovebox latch rotary system that ran autonomously. Worked with customers on site to re-program system and find mechanical flaws.',
    benefit: 'Customer met metrics promised for system after reprogramming and mechanical adjustments.',
    savings: '550,000',
    tags: ['Autonomous', 'Automotive', 'PLC Programming']
  },
  {
    title: 'Robotic Pushnut Cell',
    company: 'Altron',
    category: 'Altron',
    icon: Bot,
    color: '#ec4899',
    problem: 'Automotive seat assembly line needed autonomous pushnut installation.',
    solution: 'Designed, programmed and commissioned robotic cell on automotive seat assembly line.',
    benefit: 'Fully autonomous operation with high precision pushnut installation.',
    savings: '350,000',
    tags: ['Robotics', 'Automotive', 'Assembly Line']
  },
  {
    title: 'Autonomous Seat Assembly Station',
    company: 'Altron',
    category: 'Altron',
    icon: Wrench,
    color: '#00d4ff',
    problem: 'Semi truck seat frames required autonomous screw assembly.',
    solution: 'Designed, programmed and ran FAT for autonomous screw station that assembled semi seat frames autonomously.',
    benefit: 'Successful FAT completion with fully autonomous operation.',
    savings: '400,000',
    tags: ['FAT', 'Autonomous', 'Assembly']
  },
  {
    title: 'VR Theatrical Performance',
    company: 'Dennison University',
    category: 'Freelance',
    icon: Zap,
    color: '#a855f7',
    problem: 'University needed innovative VR system for theatrical performances.',
    solution: 'Developed fully autonomous virtual reality system to mirror real time theatrical performance in VR. Designed AI generated theatrical performance with LLM-driven dialog changes.',
    benefit: '24/7 live AI-powered VR theatrical performance with dynamic dialog each session.',
    tags: ['VR', 'AI', 'LLM', 'Theater']
  }
]

export default function Projects() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedProject, setExpandedProject] = useState(null)

  const filteredProjects = activeCategory === 'All'
    ? projects
    : projects.filter(p => p.category === activeCategory)

  return (
    <section
      id="projects"
      ref={ref}
      style={{
        padding: '8rem 2rem',
        position: 'relative',
        background: 'linear-gradient(180deg, transparent 0%, rgba(168, 85, 247, 0.02) 50%, transparent 100%)'
      }}
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ marginBottom: '3rem' }}
        >
          <span className="section-subtitle">Portfolio</span>
          <h2 className="section-title">
            Key <span className="gradient-text">Projects</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '3rem'
          }}
        >
          {projectCategories.map((category) => (
            <motion.button
              key={category}
              onClick={() => setActiveCategory(category)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeCategory === category
                  ? 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)'
                  : 'var(--glass-bg)',
                border: `1px solid ${activeCategory === category ? 'transparent' : 'var(--glass-border)'}`,
                borderRadius: '100px',
                color: activeCategory === category ? 'var(--bg-primary)' : 'var(--text-secondary)',
                fontWeight: activeCategory === category ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '0.875rem',
                transition: 'all 0.3s ease'
              }}
            >
              {category}
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          layout
          className="bento-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}
        >
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.title}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="glass-card"
              style={{
                padding: '2rem',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
              onClick={() => setExpandedProject(expandedProject === project.title ? null : project.title)}
            >
              <div
                className="project-card-accent"
                style={{
                  background: `linear-gradient(90deg, ${project.color}, transparent)`
                }}
              />

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${project.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <project.icon size={24} style={{ color: project.color }} />
                </div>

                {project.savings && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: '#10b98115',
                    border: '1px solid #10b98130',
                    borderRadius: '100px',
                    color: '#10b981',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    <DollarSign size={14} />
                    {project.savings} Impact
                  </div>
                )}
              </div>

              <div style={{
                fontSize: '0.75rem',
                color: project.color,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.5rem'
              }}>
                {project.company}
              </div>

              <h3 style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '1.25rem',
                fontWeight: 700,
                marginBottom: '1rem'
              }}>
                {project.title}
              </h3>

              <motion.div
                initial={false}
                animate={{ height: expandedProject === project.title ? 'auto' : 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ paddingBottom: '1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '0.5rem'
                    }}>
                      Problem
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                      {project.problem}
                    </p>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '0.5rem'
                    }}>
                      Solution
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                      {project.solution}
                    </p>
                  </div>

                  <div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '0.5rem'
                    }}>
                      Benefit
                    </div>
                    <p style={{ color: '#10b981', fontSize: '0.875rem', lineHeight: 1.6, fontWeight: 500 }}>
                      {project.benefit}
                    </p>
                  </div>
                </div>
              </motion.div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginTop: '1rem'
              }}>
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                textAlign: 'center'
              }}>
                {expandedProject === project.title ? 'Click to collapse' : 'Click to expand'}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
