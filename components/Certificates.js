'use client'

import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Award, ExternalLink, Search, X, Filter, Image as ImageIcon } from 'lucide-react'

/**
 * All cert assets are images (webp) in:
 *   /public/certificates/...
 *
 * NOTE:
 * - If you want verify links, add verifyUrl for each cert.
 * - completed/hours are optional; leave null if you don't want to display them.
 */

const CERTS = [
    {
      id: 'fcc-sci-comp-py',
      title: 'Scientific Computing with Python',
      issuer: 'freeCodeCamp',
      category: 'Python',
      file: '/certificates/scientific-computing-with-python.webp',
      verifyUrl: 'https://freecodecamp.org/certification/labthe3rd/scientific-computing-with-python-v7',
      completed: 'Sep 30, 2023',
      hours: 300,
      color: '#00d4ff',
      summary: 'Core Python fundamentals applied through practical projects.'
    },
    {
      id: 'fcc-rwd',
      title: 'Legacy Responsive Web Design V8',
      issuer: 'freeCodeCamp',
      category: 'Web / APIs',
      file: '/certificates/responsive-web-design.webp',
      verifyUrl: 'https://freecodecamp.org/certification/labthe3rd/responsive-web-design',
      completed: 'Oct 1, 2023',
      hours: 300,
      color: '#22c55e',
      summary: 'Responsive layout fundamentals: HTML/CSS, accessibility basics, and modern page structure.'
    },
    {
      id: 'fcc-js-algos',
      title: 'Legacy JavaScript Algorithms and Data Structures V7',
      issuer: 'freeCodeCamp',
      category: 'JavaScript',
      file: '/certificates/javascript-algorithms-and-data-structures.webp',
      verifyUrl: 'https://freecodecamp.org/certification/labthe3rd/javascript-algorithms-and-data-structures',
      completed: 'Oct 2, 2023',
      hours: 300,
      color: '#a855f7',
      summary: 'Algorithms and data-structures proficiency for modern web development.'
    },
    {
      id: 'fcc-backend-apis',
      title: 'Back End Development and APIs V8',
      issuer: 'freeCodeCamp',
      category: 'Web / APIs',
      file: '/certificates/back-end-development-and-apis.webp',
      verifyUrl: 'https://freecodecamp.org/certification/labthe3rd/back-end-development-and-apis',
      completed: 'Oct 4, 2023',
      hours: 300,
      color: '#10b981',
      summary: 'Backend services and API fundamentals for building integrations.'
    },
    {
      id: 'fcc-data-analysis-py',
      title: 'Data Analysis with Python',
      issuer: 'freeCodeCamp',
      category: 'Data',
      file: '/certificates/data-analysis-with-python.webp',
      verifyUrl: 'https://freecodecamp.org/certification/labthe3rd/data-analysis-with-python-v7',
      completed: 'Oct 6, 2023',
      hours: 300,
      color: '#f59e0b',
      summary: 'Data handling, analysis workflows, and communicating results.'
    },
    {
      id: 'fcc-ml-py',
      title: 'Machine Learning with Python',
      issuer: 'freeCodeCamp',
      category: 'ML',
      file: '/certificates/machine-learning-with-python.webp',
      verifyUrl: 'https://freecodecamp.org/certification/labthe3rd/machine-learning-with-python-v7',
      completed: 'Oct 12, 2023',
      hours: 300,
      color: '#ef4444',
      summary: 'Foundational ML workflows and model-building concepts.'
    }
]

const FILTERS = ['All', 'Python', 'Web / APIs', 'Data', 'ML', 'JavaScript']

export default function Certificates() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const [activeFilter, setActiveFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const [preview, setPreview] = useState(null) // { title, file, verifyUrl }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CERTS.filter(c => {
      const passesFilter = activeFilter === 'All' ? true : c.category === activeFilter
      const passesQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.issuer.toLowerCase().includes(q)
      return passesFilter && passesQuery
    })
  }, [activeFilter, query])

  // Bias ordering toward OT-adjacent value: Python -> APIs -> Data -> ML -> JS
  const ordered = useMemo(() => {
    const weight = (c) => {
      if (c.category === 'Python') return 0
      if (c.category === 'Web / APIs') return 1
      if (c.category === 'Data') return 2
      if (c.category === 'ML') return 3
      if (c.category === 'JavaScript') return 4
      return 9
    }
    return [...filtered].sort((a, b) => weight(a) - weight(b))
  }, [filtered])

  const visible = showAll ? ordered : ordered.slice(0, 3)

  const openPreview = (cert) => {
    setPreview({ title: cert.title, file: cert.file, verifyUrl: cert.verifyUrl || null })
  }

  const hasMeta = (cert) => Boolean(cert.completed) || (typeof cert.hours === 'number')

  return (
    <section
      id="certifications"
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
          style={{ marginBottom: '2rem' }}
        >
          <span className="section-subtitle">Credentials</span>
          <h2 className="section-title">
            Certifications <span className="gradient-text">That Support the Work</span>
          </h2>

          <p style={{
            color: 'var(--text-secondary)',
            maxWidth: 820,
            lineHeight: 1.7,
            marginTop: '1rem'
          }}>
            These are supporting proof-points for software execution: Python, backend APIs, and data/ML literacy—useful
            when building OT tooling, dashboards, and secure integrations.
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="glass-card"
          style={{
            padding: '1.25rem',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 340px' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(0, 212, 255, 0.10)',
              border: '1px solid rgba(0, 212, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Search size={18} style={{ color: 'var(--accent-cyan)' }} />
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search certifications…"
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--glass-border)',
                borderRadius: 12,
                padding: '0.9rem 1rem',
                color: 'white',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              <Filter size={16} />
              Filter:
            </div>

            {FILTERS.map(f => (
              <motion.button
                key={f}
                onClick={() => setActiveFilter(f)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '999px',
                  background: activeFilter === f
                    ? 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)'
                    : 'var(--glass-bg)',
                  border: `1px solid ${activeFilter === f ? 'transparent' : 'var(--glass-border)'}`,
                  color: activeFilter === f ? 'var(--bg-primary)' : 'rgba(255,255,255,0.75)',
                  cursor: 'pointer',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '0.85rem',
                  fontWeight: activeFilter === f ? 600 : 400
                }}
              >
                {f}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="bento-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}
        >
          {visible.map((cert, index) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="glass-card"
              style={{
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                className="project-card-accent"
                style={{
                  background: `linear-gradient(90deg, ${cert.color}, transparent)`
                }}
              />

              {/* Thumbnail */}
              <button
                onClick={() => openPreview(cert)}
                style={{
                  width: '100%',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
                aria-label={`Preview ${cert.title}`}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.75rem',
                  gap: '0.5rem',
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '0.85rem',
                  borderBottom: '1px solid rgba(255,255,255,0.10)'
                }}>
                  <ImageIcon size={16} />
                  Preview (full size)
                </div>

                <img
                  src={cert.file}
                  alt={cert.title}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </button>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: `${cert.color}15`,
                    border: `1px solid ${cert.color}25`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Award size={20} style={{ color: cert.color }} />
                  </div>

                  <div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: cert.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '0.25rem'
                    }}>
                      {cert.issuer} • {cert.category}
                    </div>

                    <h3 style={{
                      fontFamily: 'Syne, sans-serif',
                      fontSize: '1.15rem',
                      fontWeight: 750,
                      lineHeight: 1.2
                    }}>
                      {cert.title}
                    </h3>
                  </div>
                </div>

                {typeof cert.hours === 'number' && (
                  <div style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.10)',
                    border: '1px solid rgba(16, 185, 129, 0.18)',
                    color: '#10b981',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap'
                  }}>
                    ~{cert.hours} hrs
                  </div>
                )}
              </div>

              <p style={{
                color: 'var(--text-secondary)',
                lineHeight: 1.65,
                marginTop: '1rem',
                marginBottom: hasMeta(cert) ? '0.9rem' : '1.25rem'
              }}>
                {cert.summary}
              </p>

              {hasMeta(cert) && (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {cert.completed && (
                    <span>
                      Completed: <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{cert.completed}</span>
                    </span>
                  )}
                </div>
              )}

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  Click to enlarge
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {cert.verifyUrl && (
                    <motion.a
                      href={cert.verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="cta-button cta-button-outline"
                      style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                    >
                      Verify <ExternalLink size={16} />
                    </motion.a>
                  )}

                  <motion.button
                    onClick={() => openPreview(cert)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="cta-button"
                    style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                  >
                    View
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Show more / less */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.35 }}
          style={{ textAlign: 'center', marginTop: '2rem' }}
        >
          {ordered.length > 3 && (
            <motion.button
              onClick={() => setShowAll(!showAll)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="cta-button cta-button-outline"
              style={{ padding: '0.8rem 1.4rem' }}
            >
              {showAll ? 'Show fewer' : `Show all (${ordered.length})`}
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
            onClick={() => setPreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="glass-card"
              style={{
                width: 'min(1200px, 100%)',
                maxHeight: '85vh',
                overflow: 'auto',
                position: 'relative',
                padding: '1rem'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.75rem 0.75rem 1rem'
              }}>
                <div style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '1rem',
                  fontWeight: 750,
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  {preview.title}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {preview.verifyUrl && (
                    <motion.a
                      href={preview.verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="cta-button cta-button-outline"
                      style={{ padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}
                    >
                      Verify <ExternalLink size={16} />
                    </motion.a>
                  )}

                  <motion.button
                    onClick={() => setPreview(null)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 10,
                      padding: '0.5rem',
                      color: 'rgba(255,255,255,0.8)',
                      cursor: 'pointer'
                    }}
                    aria-label="Close preview"
                  >
                    <X size={18} />
                  </motion.button>
                </div>
              </div>

              <img
                src={preview.file}
                alt={preview.title}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)'
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
