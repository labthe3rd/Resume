'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Cpu, Network, Code2, Shield, Bot, Eye } from 'lucide-react'

const iconMap = {
  Cpu,
  Network,
  Code2,
  Shield,
  Bot,
  Eye
}

export default function Skills() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [skillCategories, setSkillCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/skills')
      .then(res => res.json())
      .then(data => {
        const skillsWithIcons = data.skills.map(skill => ({
          ...skill,
          icon: iconMap[skill.iconName] || Code2
        }))
        setSkillCategories(skillsWithIcons)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load skills:', err)
        setLoading(false)
      })
  }, [])

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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            Loading skills...
          </div>
        ) : (
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
        )}
      </div>
    </section>
  )
}
