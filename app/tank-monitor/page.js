'use client'

import { WebSocketProvider } from '../../contexts/WebSocketContext'
import LiquidTankMonitor from '../../components/LiquidTankMonitor'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TankMonitorPage() {
  return (
    <WebSocketProvider>
      <div style={{
        minHeight: '100vh',
        background: '#050508',
        position: 'relative'
      }}>
        {/* Back button */}
        <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 100
        }}
      >
        <Link href="/#tank-monitor" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          color: '#00d4ff',
          textDecoration: 'none',
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          <ArrowLeft size={16} />
          Back to Portfolio
        </Link>
      </motion.div>

        <LiquidTankMonitor fullPage={true} />
      </div>
    </WebSocketProvider>
  )
}
