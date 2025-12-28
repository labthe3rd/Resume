'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Download } from 'lucide-react'

const navItems = [
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'playground', label: 'Playground' },
  { id: 'control-system', label: 'AI Control' },
  { id: 'contact', label: 'Contact' },
]

export default function Navigation({ activeSection }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMobileMenuOpen(false)
    }
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, delay: 2 }}
        className={`nav-blur ${isScrolled ? 'scrolled' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '1rem 2rem',
        }}
      >
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <motion.a
            href="#hero"
            onClick={(e) => { e.preventDefault(); scrollToSection('hero') }}
            whileHover={{ scale: 1.05 }}
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '1.5rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            LB
          </motion.a>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem'
          }} className="desktop-nav">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                whileHover={{ y: -2 }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeSection === item.id ? '#00d4ff' : 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Space Grotesk, sans-serif',
                  position: 'relative',
                  padding: '0.5rem 0'
                }}
              >
                {item.label}
                {activeSection === item.id && (
                  <motion.div
                    layoutId="activeIndicator"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: '#00d4ff',
                      borderRadius: 2
                    }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <motion.a
              href="/Louis_Bersine_Resume.pdf"
              download="Louis_Bersine_Resume.pdf"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="cta-button"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem'
              }}
            >
              <Download size={16} />
              <span className="desktop-only">Resume</span>
            </motion.a>

            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileTap={{ scale: 0.9 }}
              className="mobile-menu-btn"
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'none'
              }}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: 80,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(5, 5, 8, 0.98)',
              backdropFilter: 'blur(20px)',
              zIndex: 99,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2rem'
            }}
          >
            {navItems.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => scrollToSection(item.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeSection === item.id ? '#00d4ff' : 'white',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Syne, sans-serif'
                }}
              >
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .desktop-only {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
