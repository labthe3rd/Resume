// file: ./app/page.js  (main page)
// This version of the home page strips away demo components and weak sections,
// leaving only the core narrative: hero introduction, about, architecture,
// scope, outcomes, and contact information. Certification listings and AI/VR
// demo components have been removed to present a focused, executive-level
// portfolio.

/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navigation from '../components/Navigation'
import Hero from '../components/Hero'
import About from '../components/About'
import Skills from '../components/Skills'
import Experience from '../components/Experience'
import Projects from '../components/Projects'
import Contact from '../components/Contact'
import Footer from '../components/Footer'

// 3D scene and performance debug removed to simplify the site and improve performance.
const isDevelopment = process.env.NODE_ENV === 'development'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('hero')

  // Initial loading animation timer
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  // Track which section is active for nav highlighting. Only track the core
  // sections: hero, about, skills (architecture), experience (scope),
  // projects (outcomes), and contact. Certification and demo sections were
  // removed.
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'about', 'skills', 'experience', 'projects', 'contact']
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

  // Performance debug and 3D scene hooks removed for simplicity

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
              background: 'var(--bg-primary)',
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
                background: 'var(--gradient-1)',
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
                background: 'var(--gradient-2)',
                borderRadius: 2
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Removed the 3D canvas and performance debug overlay for a cleaner, faster loading experience */}

      <Navigation activeSection={activeSection} />

      <main>
        <Hero />
        <About />
        <Skills />
        <Experience />
        <Projects />
        <Contact />
        <Footer />
      </main>
    </>
  )
}