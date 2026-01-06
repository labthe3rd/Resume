// file: ./app/page.js  (main page)
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import Navigation from '../components/Navigation'
import Hero from '../components/Hero'
import About from '../components/About'
import Skills from '../components/Skills'
import Certificates from '../components/Certificates'
import Experience from '../components/Experience'
import Projects from '../components/Projects'
import Contact from '../components/Contact'
import Footer from '../components/Footer'
import ControlSystem from '../components/ControlSystem'
import LiquidTankMonitor from '../components/LiquidTankMonitor'
import Chatbot from '../components/Chatbot'
import SystemArchitectureMap from '../components/SystemArchitectureMap'
import PerformanceDebug from '../components/PerformanceDebug'
import { useWebSocket } from '../contexts/WebSocketContext'

const Scene3D = dynamic(() => import('../components/Scene3D'), { ssr: false })

const isDevelopment = process.env.NODE_ENV === 'development'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('hero')
  const [showDebug, setShowDebug] = useState(false)
  const [perfStats, setPerfStats] = useState({
    fps: 0,
    capabilities: null,
    currentTier: null,
    quality: null,
    lastChange: null
  })
  const { subscribe } = useWebSocket()

  useEffect(() => {
    const unsubControl = subscribe('control', () => {})
    const unsubTank = subscribe('tank', () => {})
    return () => {
      unsubControl()
      unsubTank()
    }
  }, [subscribe])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'about', 'skills', 'certifications', 'experience', 'projects', 'tank-monitor', 'control-system', 'contact']
      const scrollPosition = window.scrollY + window.innerHeight / 3

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

 useEffect(() => {
    if (!isDevelopment) return

    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const handleStatsUpdate = useCallback((stats) => {
    setPerfStats(prev => {
      if (typeof stats === 'function') {
        return stats(prev)
      }
      return { ...prev, ...stats }
    })
  }, [])

  const handleSetTier = useCallback((tier) => {
    if (window.__setScene3DTier) {
      window.__setScene3DTier(tier)
    }
  }, [])

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: '#050508',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '2rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: 'clamp(2rem, 8vw, 4rem)',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 50%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              LB
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 200 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              style={{
                height: 2,
                background: 'linear-gradient(90deg, #00d4ff, #a855f7)',
                borderRadius: 2
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

  <div className="canvas-container">
        <Scene3D onStatsUpdate={isDevelopment ? handleStatsUpdate : undefined} />
      </div>

      {isDevelopment && showDebug && (
        <PerformanceDebug 
          stats={perfStats}
          onClose={() => setShowDebug(false)}
          onSetTier={handleSetTier}
        />
      )}

      {isDevelopment && (
        <div
          onClick={() => setShowDebug(prev => !prev)}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            width: '50px',
            height: '50px',
            background: 'rgba(0, 212, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9998,
            transition: 'all 0.3s ease',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            fontWeight: 700,
            color: '#00d4ff'
          }}
          title="Toggle Performance Debug (Ctrl+Shift+D)"
        >
          FPS
        </div>
      )}

      <Navigation activeSection={activeSection} />

      <main>
        <Hero />
        <About />
        <Skills />
         <Certificates />
        <Experience />
        <Projects />
        <SystemArchitectureMap />
        <LiquidTankMonitor />
        <ControlSystem />
        <Contact />
        <Footer />
      </main>

      <Chatbot />
    </>
  )
}
