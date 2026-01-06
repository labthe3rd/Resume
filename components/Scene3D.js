'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { detectHardwareCapabilities, getQualityPreset, PerformanceMonitor } from '../utils/hardwareDetection'

function ParticleField({ quality }) {
  const ref = useRef()
  
  const particles = useMemo(() => {
    const positions = new Float32Array(quality.particleCount * 3)
    for (let i = 0; i < quality.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return positions
  }, [quality.particleCount])

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.02 * quality.animationSpeed
      ref.current.rotation.y = state.clock.elapsedTime * 0.03 * quality.animationSpeed
    }
  })

  return (
    <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
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

function FloatingGrid({ quality }) {
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
  }, [quality.gridDivisions])

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

  useEffect(() => {
    if (!monitorRef.current) {
      monitorRef.current = new PerformanceMonitor(onPerformanceChange)
    }
    return () => {
      if (monitorRef.current) {
        monitorRef.current.reset()
      }
    }
  }, [onPerformanceChange])

  useFrame(() => {
    if (monitorRef.current) {
      monitorRef.current.update()
    }
  })

  const orbPositions = [
    { position: [-3, 1, -2], color: "#00d4ff", scale: 1.2 },
    { position: [3, 2, -3], color: "#a855f7", scale: 0.8 },
    { position: [-2, -1, 1], color: "#10b981", scale: 1 },
    { position: [2, 0, 2], color: "#f97316", scale: 0.9 },
    { position: [0, 1.5, -1], color: "#3b82f6", scale: 1.1 }
  ]

  return (
    <>
      <ambientLight intensity={0.5} />
      <ParticleField key={`particles-${qualityKey}`} quality={quality} />
      <FloatingGrid key={`grid-${qualityKey}`} quality={quality} />
      <ConnectionLines quality={quality} />
      {orbPositions.slice(0, quality.orbCount).map((orb, i) => (
        <GlowingOrb key={i} {...orb} quality={quality} />
      ))}
    </>
  )
}

export default function Scene3D({ onStatsUpdate }) {
  const [capabilities, setCapabilities] = useState(null)
  const [quality, setQuality] = useState(null)
  const [currentTier, setCurrentTier] = useState(null)
  const [qualityKey, setQualityKey] = useState(0)

  useEffect(() => {
    const caps = detectHardwareCapabilities()
    setCapabilities(caps)
    const preset = getQualityPreset(caps.tier)
    setQuality(preset)
    setCurrentTier(caps.tier)
    
    if (onStatsUpdate) {
      onStatsUpdate({
        capabilities: caps,
        currentTier: caps.tier,
        quality: preset,
        fps: 0
      })
    }
  }, [])

  const handlePerformanceChange = (action, fps) => {
    // Always update FPS
    if (onStatsUpdate) {
      onStatsUpdate(prev => ({ ...prev, fps }))
    }

    // Handle quality changes
    if (action === 'downgrade' && currentTier !== 'low') {
      const newTier = currentTier === 'high' ? 'medium' : 'low'
      const newQuality = getQualityPreset(newTier)
      setCurrentTier(newTier)
      setQuality(newQuality)
      setQualityKey(prev => prev + 1)
      
      if (onStatsUpdate) {
        onStatsUpdate(prev => ({ 
          ...prev, 
          currentTier: newTier, 
          quality: newQuality,
          lastChange: { action: 'downgrade', from: currentTier, to: newTier, fps, time: Date.now() }
        }))
      }
      console.log(`Performance downgrade: ${currentTier} -> ${newTier} (FPS: ${fps.toFixed(1)})`)
    } else if (action === 'upgrade' && currentTier !== 'high') {
      const newTier = currentTier === 'low' ? 'medium' : 'high'
      const newQuality = getQualityPreset(newTier)
      setCurrentTier(newTier)
      setQuality(newQuality)
      setQualityKey(prev => prev + 1)
      
      if (onStatsUpdate) {
        onStatsUpdate(prev => ({ 
          ...prev, 
          currentTier: newTier, 
          quality: newQuality,
          lastChange: { action: 'upgrade', from: currentTier, to: newTier, fps, time: Date.now() }
        }))
      }
      console.log(`Performance upgrade: ${currentTier} -> ${newTier} (FPS: ${fps.toFixed(1)})`)
    }
  }

  const setManualTier = (tier) => {
    const newQuality = getQualityPreset(tier)
    setCurrentTier(tier)
    setQuality(newQuality)
    setQualityKey(prev => prev + 1)
    
    if (onStatsUpdate) {
      onStatsUpdate(prev => ({ 
        ...prev, 
        currentTier: tier, 
        quality: newQuality,
        lastChange: { action: 'manual', to: tier, time: Date.now() }
      }))
    }
  }

  useEffect(() => {
    window.__setScene3DTier = setManualTier
    return () => {
      delete window.__setScene3DTier
    }
  }, [])

  if (!quality) {
    return null
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{ background: 'transparent' }}
      dpr={quality.dpr}
      gl={{ 
        antialias: quality.antialias,
        powerPreference: 'high-performance'
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