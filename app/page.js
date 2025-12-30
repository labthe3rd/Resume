'use client'

import { useMemo, useRef,useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { WebSocketProvider } from '../contexts/WebSocketContext'
import Navigation from '../components/Navigation'
import Hero from '../components/Hero'
import About from '../components/About'
import Skills from '../components/Skills'
import Experience from '../components/Experience'
import Projects from '../components/Projects'
import Contact from '../components/Contact'
import Footer from '../components/Footer'
import ControlSystem from '../components/ControlSystem'
import LiquidTankMonitor from '../components/LiquidTankMonitor'
import Chatbot from '../components/Chatbot'
import SystemArchitectureMap from '../components/SystemArchitectureMap'

const Scene3D = dynamic(() => import('../components/Scene3D'), { ssr: false })



export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'about', 'skills', 'experience', 'projects', 'tank-monitor', 'control-system', 'contact']
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

  return (
    <WebSocketProvider>
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
        <Scene3D />
      </div>

      <Navigation activeSection={activeSection} />

      <main>
        <Hero />
        <About />
        <Skills />
        <Experience />
        <Projects />
        <SystemArchitectureMap />
        <LiquidTankMonitor />
        <ControlSystem />
        <Contact />
        <Footer />
      </main>

      <Chatbot />
    </WebSocketProvider>
  )
}
