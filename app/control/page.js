// file: ./app/control/page.js  (or whatever your control route is)
'use client'

import { useEffect, useLayoutEffect } from 'react'
import ControlSystem from '../../components/ControlSystem'
import { useWebSocket } from '../../contexts/WebSocketContext'

export default function ControlPage() {
  const { subscribe } = useWebSocket()

  // Force scroll to top immediately and after hydration
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => window.scrollTo(0, 0), 100)
    return () => clearTimeout(timer)
  }, [])

  // Subscribe ONLY to control stream on this page
  useEffect(() => {
    const unsub = subscribe('control', () => {})
    return () => unsub()
  }, [subscribe])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #050508)' }}>
      <ControlSystem fullPage={true} />
    </div>
  )
}
