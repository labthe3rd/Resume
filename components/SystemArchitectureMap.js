'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Cloud,
  Shield,
  Lock,
  Home,
  Server,
  Network,
  Bot,
  ArrowRight,
  Cpu,
  Database,
  Zap,
  CheckCircle,
  Activity
} from 'lucide-react'

const NODES = [
  {
    id: 'client',
    icon: Globe,
    title: 'User Browser',
    subtitle: 'Web Application',
    color: '#00d4ff',
    gradient: 'linear-gradient(135deg, #00d4ff20 0%, #00d4ff05 100%)',
    description: 'React/Next.js frontend served via CDN. Establishes WebSocket connection for real-time updates.',
    features: ['HTTPS/WSS', 'Real-time UI', 'CDN Cached'],
    layer: 'public'
  },
  {
    id: 'vercel',
    icon: Cloud,
    title: 'Vercel Edge',
    subtitle: 'Next.js Hosting',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f720 0%, #a855f705 100%)',
    description: 'Global edge network hosting the frontend application with automatic scaling and optimization.',
    features: ['Edge Functions', 'Global CDN', 'Auto SSL'],
    layer: 'public'
  },
  {
    id: 'proxy',
    icon: Shield,
    title: 'Caddy Proxy',
    subtitle: 'Reverse Proxy',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b98120 0%, #10b98105 100%)',
    description: 'TLS termination and request routing. Single public entrypoint for enhanced security.',
    features: ['TLS 1.3', 'Rate Limiting', 'WebSocket'],
    layer: 'edge'
  },
  {
    id: 'tunnel',
    icon: Lock,
    title: 'WireGuard VPN',
    subtitle: 'Encrypted Tunnel',
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, #fbbf2420 0%, #fbbf2405 100%)',
    description: 'Point-to-point encrypted connection from edge to private network. No exposed ports.',
    features: ['256-bit AES', 'P2P Tunnel', 'Zero Trust'],
    layer: 'tunnel'
  },
  {
    id: 'api',
    icon: Server,
    title: 'API Gateway',
    subtitle: 'Node.js Backend',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef444420 0%, #ef444405 100%)',
    description: 'Main application server handling REST APIs, WebSocket connections, and AI orchestration.',
    features: ['Express.js', 'WebSocket', 'Orchestration'],
    layer: 'private'
  },
  {
    id: 'docker',
    icon: Network,
    title: 'Docker Network',
    subtitle: 'Service Mesh',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f620 0%, #3b82f605 100%)',
    description: 'Isolated container network for secure service-to-service communication.',
    features: ['Bridge Network', 'DNS Discovery', 'Isolation'],
    layer: 'private'
  },
  {
    id: 'ai',
    icon: Bot,
    title: 'Ollama LLM',
    subtitle: 'AI Inference',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec489920 0%, #ec489905 100%)',
    description: 'Local LLM running in container. Handles PID tuning decisions and anomaly detection.',
    features: ['LLaMA 3.2', 'GPU Accel', 'Private'],
    layer: 'private'
  },
  {
    id: 'opcua',
    icon: Cpu,
    title: 'OPC-UA Server',
    subtitle: 'Process Simulation',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d420 0%, #06b6d405 100%)',
    description: 'Industrial simulation server running thermal process and tank level monitoring.',
    features: ['100ms Loop', 'PID Control', 'Simulation'],
    layer: 'private'
  }
]

const CONNECTIONS = [
  { from: 'client', to: 'vercel', label: 'HTTPS', type: 'public' },
  { from: 'vercel', to: 'proxy', label: 'Edge Route', type: 'public' },
  { from: 'client', to: 'proxy', label: 'WSS Direct', type: 'public', dashed: true },
  { from: 'proxy', to: 'tunnel', label: 'Encrypted', type: 'tunnel' },
  { from: 'tunnel', to: 'api', label: 'Private', type: 'private' },
  { from: 'api', to: 'docker', label: 'Internal', type: 'private' },
  { from: 'docker', to: 'ai', label: 'LLM Calls', type: 'private' },
  { from: 'docker', to: 'opcua', label: 'Control', type: 'private' }
]

function NodeCard({ node, isActive, onClick, index }) {
  const Icon = node.icon

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
        background: isActive ? node.gradient : 'rgba(255,255,255,0.02)',
        border: `2px solid ${isActive ? node.color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '16px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Glow effect when active */}
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
        {/* Icon */}
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

        {/* Content */}
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

          {/* Feature badges */}
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

        {/* Status indicator */}
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
  const Icon = node.icon

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
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.25rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: node.gradient,
          border: `2px solid ${node.color}40`,
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
            letterSpacing: '0.12em',
            color: node.color,
            marginBottom: '0.25rem'
          }}>
            {node.subtitle}
          </div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            margin: 0
          }}>
            {node.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
        marginBottom: '1.25rem'
      }}>
        {node.description}
      </p>

      {/* Features */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-tertiary)',
          marginBottom: '0.75rem'
        }}>
          Features
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {node.features.map((feature, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px'
            }}>
              <CheckCircle size={14} style={{ color: node.color }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Layer indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem',
        background: `${node.color}10`,
        border: `1px solid ${node.color}20`,
        borderRadius: '10px'
      }}>
        <Activity size={14} style={{ color: node.color }} />
        <span style={{ fontSize: '0.75rem', color: node.color, fontWeight: 500 }}>
          {node.layer === 'public' ? 'Public Network Layer' :
           node.layer === 'edge' ? 'Edge Gateway Layer' :
           node.layer === 'tunnel' ? 'Encrypted Tunnel' :
           'Private Network Layer'}
        </span>
      </div>
    </motion.div>
  )
}

function DataFlowLine({ active }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0.5rem 0'
    }}>
      <motion.div
        animate={{
          opacity: active ? [0.3, 1, 0.3] : 0.3
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}
      >
        <div style={{
          width: '20px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3))'
        }} />
        <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
        <div style={{
          width: '20px',
          height: '2px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.3), transparent)'
        }} />
      </motion.div>
    </div>
  )
}

function FlowDiagram({ activeId, onNodeClick }) {
  const publicNodes = NODES.filter(n => n.layer === 'public')
  const edgeNode = NODES.find(n => n.layer === 'edge')
  const tunnelNode = NODES.find(n => n.layer === 'tunnel')
  const privateNodes = NODES.filter(n => n.layer === 'private')

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)
        `,
        backgroundSize: '24px 24px',
        pointerEvents: 'none'
      }} />

      {/* Layer Labels */}
      <div style={{ position: 'relative' }}>
        {/* Public Layer */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: '100px',
            marginBottom: '0.75rem'
          }}>
            <Globe size={12} style={{ color: '#00d4ff' }} />
            <span style={{ fontSize: '0.65rem', color: '#00d4ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Public Internet
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {publicNodes.map((node, i) => (
              <NodeCard
                key={node.id}
                node={node}
                isActive={activeId === node.id}
                onClick={() => onNodeClick(node.id)}
                index={i}
              />
            ))}
          </div>
        </div>

        <DataFlowLine active={true} />

        {/* Edge Layer */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '100px',
            marginBottom: '0.75rem'
          }}>
            <Shield size={12} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Edge Gateway
            </span>
          </div>
          {edgeNode && (
            <NodeCard
              node={edgeNode}
              isActive={activeId === edgeNode.id}
              onClick={() => onNodeClick(edgeNode.id)}
              index={2}
            />
          )}
        </div>

        <DataFlowLine active={true} />

        {/* Tunnel Layer */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: '100px',
            marginBottom: '0.75rem'
          }}>
            <Lock size={12} style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Encrypted Tunnel
            </span>
          </div>
          {tunnelNode && (
            <NodeCard
              node={tunnelNode}
              isActive={activeId === tunnelNode.id}
              onClick={() => onNodeClick(tunnelNode.id)}
              index={3}
            />
          )}
        </div>

        <DataFlowLine active={true} />

        {/* Private Layer */}
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '100px',
            marginBottom: '0.75rem'
          }}>
            <Server size={12} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Private Network
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {privateNodes.map((node, i) => (
              <NodeCard
                key={node.id}
                node={node}
                isActive={activeId === node.id}
                onClick={() => onNodeClick(node.id)}
                index={4 + i}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SystemArchitectureMap({
  id = 'architecture-map',
  title = 'System Architecture',
  subtitle = 'Secure infrastructure connecting edge services to private AI compute'
}) {
  const [activeId, setActiveId] = useState('proxy')
  const activeNode = useMemo(() => NODES.find(n => n.id === activeId) || NODES[0], [activeId])

  return (
    <section
      id={id}
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
              Infrastructure
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
            {title}
          </h2>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1.1rem',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            {subtitle}
          </p>
        </motion.div>

        {/* Main Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          <FlowDiagram
            activeId={activeId}
            onNodeClick={setActiveId}
          />

          <AnimatePresence mode="wait">
            <DetailPanel key={activeId} node={activeNode} />
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            marginTop: '2rem',
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}
        >
          {[
            { icon: Shield, label: 'Zero Trust Architecture' },
            { icon: Lock, label: 'End-to-End Encryption' },
            { icon: Activity, label: 'Real-time Monitoring' }
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-tertiary)',
              fontSize: '0.85rem'
            }}>
              <item.icon size={16} style={{ opacity: 0.7 }} />
              <span>{item.label}</span>
            </div>
          ))}
        </motion.div>
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
