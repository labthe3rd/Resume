'use client'

import { useEffect, useLayoutEffect } from 'react'
import ControlSystem from '../../components/ControlSystem'

export default function ControlPage() {
  // Force scroll to top immediately and after hydration
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  useEffect(() => {
    // Also after a small delay to catch any async rendering
    const timer = setTimeout(() => {
      window.scrollTo(0, 0)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #050508)'
    }}>
      <ControlSystem fullPage={true} />
    </div>
  )
}