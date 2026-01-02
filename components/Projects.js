'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Clock, DollarSign, Shield, Cpu, Bot, Wrench, Zap, Eye, Castle } from 'lucide-react'

const iconMap = {
  Clock,
  DollarSign,
  Shield,
  Cpu,
  Bot,
  Wrench,
  Zap,
  Eye,
  Castle
}

export default function Projects() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedProject, setExpandedProject] = useState(null)
  const [projects, setProjects] = useState([])
  const [projectCategories, setProjectCategories] = useState(['All'])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        const projectsWithIcons = data.projects.map(project => ({
          ...project,
          icon: iconMap[project.iconName] || Clock
        }))
        setProjects(projectsWithIcons)
        setProjectCategories(data.categories)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load projects:', err)
        setLoading(false)
      })
  }, [])

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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            Loading projects...
          </div>
        ) : (
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

                  {project.monetaryValue && (
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
                      {project.monetaryValue} {project.monetaryWord || 'Impact'}
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
        )}
      </div>
    </section>
  )
}
