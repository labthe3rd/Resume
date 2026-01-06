// file: ./components/Scene3D.js
'use client'

import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { detectHardwareCapabilities, getQualityPreset, PerformanceMonitor } from '../utils/hardwareDetection'

const MAX_PARTICLES = 2000

function ParticleField({ quality, qualityKey }) {
  const ref = useRef()

  const basePositions = useMemo(() => {
    const positions = new Float32Array(MAX_PARTICLES * 3)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return positions
  }, [])

  const positions = useMemo(() => {
    const count = Math.min(quality.particleCount, MAX_PARTICLES)
    return basePositions.subarray(0, count * 3)
  }, [basePositions, quality.particleCount, qualityKey])

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.02 * quality.animationSpeed
      ref.current.rotation.y = state.clock.elapsedTime * 0.03 * quality.animationSpeed
    }
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#00d4ff"
        size={quality.pointSize}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  )
}

function FloatingGrid({ quality, qualityKey }) {
  const ref = useRef()

  const gridGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices = []
    const size = 20
    const divisions = quality.gridDivisions
    const step = size / divisions

    for (let i = 0; i <= divisions; i++) {
      const pos = -size / 2 + i * step
      vertices.push(-size / 2, 0, pos, size / 2, 0, pos)
      vertices.push(pos, 0, -size / 2, pos, 0, size / 2)
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    return geometry
  }, [quality.gridDivisions, qualityKey])

  useEffect(() => {
    return () => {
      gridGeometry.dispose()
    }
  }, [gridGeometry])

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = -3 + Math.sin(state.clock.elapsedTime * 0.5 * quality.animationSpeed) * 0.2
    }
  })

  return (
    <lineSegments ref={ref} geometry={gridGeometry}>
      <lineBasicMaterial color="#00d4ff" transparent opacity={0.1} />
    </lineSegments>
  )
}

function GlowingOrb({ position, color, scale = 1, quality }) {
  const ref = useRef()

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * quality.animationSpeed + position[0]) * 0.3
      ref.current.scale.setScalar(scale + Math.sin(state.clock.elapsedTime * 2 * quality.animationSpeed) * 0.1)
    }
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  )
}

function ConnectionLines({ quality }) {
  const ref = useRef()

  const lines = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices = []
    const nodePositions = [
      [-3, 1, -2],
      [3, 2, -3],
      [-2, -1, 1],
      [2, 0, 2],
      [0, 1.5, -1],
      [-1, -0.5, -2],
      [1.5, 1, 1]
    ]

    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        if (Math.random() > 0.5) {
          vertices.push(...nodePositions[i], ...nodePositions[j])
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    return geometry
  }, [])

  useEffect(() => {
    return () => {
      lines.dispose()
    }
  }, [lines])

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.05 * quality.animationSpeed
    }
  })

  return (
    <lineSegments ref={ref} geometry={lines}>
      <lineBasicMaterial color="#a855f7" transparent opacity={0.2} />
    </lineSegments>
  )
}

function SceneContent({ quality, onPerformanceChange, qualityKey }) {
  const monitorRef = useRef(null)
  const onPerformanceChangeRef = useRef(onPerformanceChange)

  useEffect(() => {
    onPerformanceChangeRef.current = onPerformanceChange
  }, [onPerformanceChange])

  useEffect(() => {
    if (!monitorRef.current) {
      monitorRef.current = new PerformanceMonitor((action, fps) => {
        onPerformanceChangeRef.current?.(action, fps)
      })
    }
    return () => {
      monitorRef.current?.reset?.()
    }
  }, [])

  useFrame(() => {
    monitorRef.current?.update?.()
  })

  const orbPositions = useMemo(() => ([
    { position: [-3, 1, -2], color: "#00d4ff", scale: 1.2 },
    { position: [3, 2, -3], color: "#a855f7", scale: 0.8 },
    { position: [-2, -1, 1], color: "#10b981", scale: 1 },
    { position: [2, 0, 2], color: "#f97316", scale: 0.9 },
    { position: [0, 1.5, -1], color: "#3b82f6", scale: 1.1 }
  ]), [])

  return (
    <>
      <ParticleField quality={quality} qualityKey={qualityKey} />
      <FloatingGrid quality={quality} qualityKey={qualityKey} />
      <ConnectionLines quality={quality} />
      {orbPositions.slice(0, quality.orbCount).map((orb) => (
        <GlowingOrb key={orb.position.join(',')} {...orb} quality={quality} />
      ))}
    </>
  )
}

export default function Scene3D({ onStatsUpdate }) {
  const [capabilities, setCapabilities] = useState(null)
  const [quality, setQuality] = useState(null)
  const [currentTier, setCurrentTier] = useState(null)
  const [qualityKey, setQualityKey] = useState(0)

  const onStatsUpdateRef = useRef(onStatsUpdate)
  const currentTierRef = useRef(null)
  const lastTierChangeAtRef = useRef(0)
  const manualOverrideUntilRef = useRef(0)

  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate
  }, [onStatsUpdate])

  useEffect(() => {
    currentTierRef.current = currentTier
  }, [currentTier])

  useEffect(() => {
    const caps = detectHardwareCapabilities()
    setCapabilities(caps)

    const preset = getQualityPreset(caps.tier)
    setQuality(preset)
    setCurrentTier(caps.tier)
    currentTierRef.current = caps.tier

    lastTierChangeAtRef.current = Date.now()

    if (onStatsUpdateRef.current) {
      onStatsUpdateRef.current({
        capabilities: caps,
        currentTier: caps.tier,
        quality: preset,
        fps: 0
      })
    }
  }, [])

  const applyTier = useCallback((nextTier, meta) => {
    const nextQuality = getQualityPreset(nextTier)

    setCurrentTier(nextTier)
    currentTierRef.current = nextTier

    setQuality(nextQuality)
    setQualityKey(prev => prev + 1)

    if (onStatsUpdateRef.current) {
      onStatsUpdateRef.current(prev => ({
        ...prev,
        currentTier: nextTier,
        quality: nextQuality,
        ...(meta ? { lastChange: meta } : null)
      }))
    }
  }, [])

  const handlePerformanceChange = useCallback((action, fps) => {
    // Always update FPS
    if (onStatsUpdateRef.current) {
      onStatsUpdateRef.current(prev => ({ ...prev, fps }))
    }

    if (action !== 'downgrade' && action !== 'upgrade') return

    const now = Date.now()
    if (now < manualOverrideUntilRef.current) return
    if (now - lastTierChangeAtRef.current < 8000) return

    const tier = currentTierRef.current
    if (!tier) return

    let nextTier = tier
    if (action === 'downgrade') {
      if (tier === 'high') nextTier = 'medium'
      else if (tier === 'medium') nextTier = 'low'
    } else if (action === 'upgrade') {
      if (tier === 'low') nextTier = 'medium'
      else if (tier === 'medium') nextTier = 'high'
    }

    if (nextTier === tier) return

    lastTierChangeAtRef.current = now

    applyTier(nextTier, {
      action,
      from: tier,
      to: nextTier,
      fps,
      time: now
    })
  }, [applyTier])

  const setManualTier = useCallback((tier) => {
    const now = Date.now()
    manualOverrideUntilRef.current = now + 15000
    lastTierChangeAtRef.current = now

    applyTier(tier, { action: 'manual', to: tier, time: now })
  }, [applyTier])

  useEffect(() => {
    window.__setScene3DTier = setManualTier
    return () => {
      delete window.__setScene3DTier
    }
  }, [setManualTier])

  if (!quality) return null

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{ background: 'transparent' }}
      dpr={quality.dpr}
      gl={{
        antialias: quality.antialias,
        powerPreference: 'high-performance',
        alpha: true,
        stencil: false
      }}
    >
      <SceneContent
        quality={quality}
        onPerformanceChange={handlePerformanceChange}
        qualityKey={qualityKey}
      />
    </Canvas>
  )
}
