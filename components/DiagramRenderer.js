'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, Cloud, Shield, Lock, Home, Server, Network, Bot, Cpu, Database,
  Zap, ArrowRight, Activity
} from 'lucide-react'

const ICON_MAP = {
  Globe, Cloud, Shield, Lock, Home, Server, Network, Bot, Cpu, Database,
  Zap, ArrowRight, Activity
}

function NodeCard({ node, isActive, onClick, index }) {
  const Icon = ICON_MAP[node.icon] || Server

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        position: 'relative',
        padding: '1.25rem',
        background: isActive ? node.gradient || `${node.color}10` : 'rgba(255,255,255,0.02)',
        border: `2px solid ${isActive ? node.color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '16px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      {isActive && (
        <div style={{
          position: 'absolute',
          inset: -1,
          borderRadius: '16px',
          background: `radial-gradient(circle at center, ${node.color}20 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `${node.color}15`,
          border: `1px solid ${node.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon size={24} style={{ color: node.color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: node.color,
            marginBottom: '0.25rem',
            fontWeight: 600
          }}>
            {node.subtitle}
          </div>
          <div style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.5rem'
          }}>
            {node.title}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {node.features.map((feature, i) => (
              <span key={i} style={{
                fontSize: '0.6rem',
                padding: '0.2rem 0.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '100px',
                color: 'var(--text-secondary)'
              }}>
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#10b981',
          boxShadow: '0 0 8px #10b98150',
          flexShrink: 0
        }} />
      </div>
    </motion.button>
  )
}

function DetailPanel({ node }) {
  const Icon = ICON_MAP[node.icon] || Server

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '1.5rem',
        height: 'fit-content'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.25rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: `${node.color}15`,
          border: `1px solid ${node.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={28} style={{ color: node.color }} />
        </div>

        <div>
          <div style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: node.color,
            marginBottom: '0.25rem',
            fontWeight: 600
          }}>
            {node.subtitle}
          </div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}>
            {node.title}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-tertiary)',
          marginBottom: '0.5rem',
          fontWeight: 600
        }}>
          Description
        </div>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          lineHeight: 1.6
        }}>
          {node.description}
        </p>
      </div>

      <div>
        <div style={{
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-tertiary)',
          marginBottom: '0.75rem',
          fontWeight: 600
        }}>
          Features
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {node.features.map((feature, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: node.color,
                flexShrink: 0
              }} />
              <span style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function DiagramRenderer({ diagramData }) {
  const [activeId, setActiveId] = useState(null)
  
  useEffect(() => {
    if (diagramData?.nodes && diagramData.nodes.length > 0 && !activeId) {
      setActiveId(diagramData.nodes[0].id)
    }
  }, [diagramData, activeId])

  const activeNode = useMemo(() => 
    diagramData?.nodes?.find(n => n.id === activeId) || diagramData?.nodes?.[0],
    [activeId, diagramData]
  )

  if (!diagramData || !diagramData.nodes || diagramData.nodes.length === 0) {
    return (
      <section style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No diagram data available</p>
      </section>
    )
  }

  return (
    <section
      style={{
        padding: '6rem 1.5rem',
        position: 'relative',
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,212,255,0.02) 50%, transparent 100%)'
      }}
    >
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '5%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: '100px',
            marginBottom: '1rem'
          }}>
            <Zap size={14} style={{ color: '#00d4ff' }} />
            <span style={{ fontSize: '0.75rem', color: '#00d4ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Diagram
            </span>
          </div>

          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            marginBottom: '0.75rem',
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {diagramData.title}
          </h2>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1.1rem',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            {diagramData.subtitle}
          </p>
        </motion.div>

        {/* Main Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          {/* Nodes Grid */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {diagramData.nodes.map((node, index) => (
              <NodeCard
                key={node.id}
                node={node}
                isActive={activeId === node.id}
                onClick={() => setActiveId(node.id)}
                index={index}
              />
            ))}
          </div>

          {/* Detail Panel */}
          <AnimatePresence mode="wait">
            {activeNode && <DetailPanel key={activeId} node={activeNode} />}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile responsive styles */}
      <style jsx>{`
        @media (max-width: 900px) {
          section > div > div:last-of-type {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
