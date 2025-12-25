'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

function ParticleField() {
  const ref = useRef()
  
  const particles = useMemo(() => {
    const positions = new Float32Array(2000 * 3)
    for (let i = 0; i < 2000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return positions
  }, [])

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.02
      ref.current.rotation.y = state.clock.elapsedTime * 0.03
    }
  })

  return (
    <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#00d4ff"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  )
}

function FloatingGrid() {
  const ref = useRef()
  
  const gridGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices = []
    const size = 20
    const divisions = 20
    const step = size / divisions

    for (let i = 0; i <= divisions; i++) {
      const pos = -size / 2 + i * step
      vertices.push(-size / 2, 0, pos, size / 2, 0, pos)
      vertices.push(pos, 0, -size / 2, pos, 0, size / 2)
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    return geometry
  }, [])

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = -3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2
    }
  })

  return (
    <lineSegments ref={ref} geometry={gridGeometry}>
      <lineBasicMaterial color="#00d4ff" transparent opacity={0.1} />
    </lineSegments>
  )
}

function GlowingOrb({ position, color, scale = 1 }) {
  const ref = useRef()

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.3
      ref.current.scale.setScalar(scale + Math.sin(state.clock.elapsedTime * 2) * 0.1)
    }
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  )
}

function ConnectionLines() {
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
      ref.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <lineSegments ref={ref} geometry={lines}>
      <lineBasicMaterial color="#a855f7" transparent opacity={0.2} />
    </lineSegments>
  )
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{ background: 'transparent' }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.5} />
      <ParticleField />
      <FloatingGrid />
      <ConnectionLines />
      <GlowingOrb position={[-3, 1, -2]} color="#00d4ff" scale={1.2} />
      <GlowingOrb position={[3, 2, -3]} color="#a855f7" scale={0.8} />
      <GlowingOrb position={[-2, -1, 1]} color="#10b981" scale={1} />
      <GlowingOrb position={[2, 0, 2]} color="#f97316" scale={0.9} />
      <GlowingOrb position={[0, 1.5, -1]} color="#3b82f6" scale={1.1} />
    </Canvas>
  )
}
