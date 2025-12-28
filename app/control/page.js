'use client'

import ControlSystem from '../../components/ControlSystem'

export default function ControlPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #050508)'
    }}>
      <ControlSystem fullPage={true} />
    </div>
  )
}
