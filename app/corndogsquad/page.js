'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Trees, Sparkles, Music, Lock } from 'lucide-react'

const PASSWORD = 'CornDooogSquad'

export default function CornDogSquad() {
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [messages, setMessages] = useState([
    { type: 'forest', text: 'Welcome to the Forest, friend! Ready to get HYPED for Electric Forest 2026?! Ask me anything about the festival, the vibes, or just chat - I\'ll find a way to spread that forest magic! 🌲✨' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkPassword = (e) => {
    e.preventDefault()
    if (passwordInput === PASSWORD) {
      setAuthenticated(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
      setPasswordInput('')
    }
  }

  const getApiUrl = () => {
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    return process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3101' : '/msg')
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { type: 'user', text: userMessage }])
    setIsLoading(true)

    try {
      const res = await fetch(`${getApiUrl()}/forest/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      const data = await res.json()

      if (data.response) {
        setMessages(prev => [...prev, { type: 'forest', text: data.response }])
      } else {
        setMessages(prev => [...prev, { type: 'forest', text: 'The forest spirits are resting... but ELECTRIC FOREST 2026 IS COMING! Happy Forest! 🌲' }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { type: 'forest', text: 'Lost in the trees for a moment... but you know what never gets lost? The HYPE for Electric Forest 2026! HAPPY FOREST! 🌲✨🎶' }])
    }

    setIsLoading(false)
  }

  // Password Gate
  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a1628 0%, #1a0a28 50%, #0a2818 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '3rem',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ fontSize: '4rem', marginBottom: '1rem' }}
          >
            🌲
          </motion.div>
          <h1 style={{
            fontSize: '1.8rem',
            marginBottom: '0.5rem',
            background: 'linear-gradient(90deg, #22c55e, #a855f7, #22c55e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            CornDog Squad
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Enter the forest password
          </p>

          <form onSubmit={checkPassword}>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)'
              }} />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password..."
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  border: `2px solid ${passwordError ? '#ef4444' : 'rgba(34, 197, 94, 0.3)'}`,
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
              />
            </div>
            {passwordError && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}
              >
                Wrong password! The forest remains hidden...
              </motion.p>
            )}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '1rem',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Enter the Forest 🌲
            </motion.button>
          </form>
        </motion.div>
      </div>
    )
  }

  // Main Chat Interface
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #1a0a28 50%, #0a2818 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Static background elements - no animation to avoid distraction */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i * 7) % 100}%`,
              top: `${(i * 13) % 100}%`,
              fontSize: '1.2rem',
              opacity: 0.15
            }}
          >
            {['🌲', '✨', '🎵', '🦋', '🌟'][i % 5]}
          </div>
        ))}
      </div>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1rem',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            padding: '1.5rem',
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            marginBottom: '1rem',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Trees size={28} style={{ color: '#22c55e' }} />
            <h1 style={{
              fontSize: '1.8rem',
              background: 'linear-gradient(90deg, #22c55e, #a855f7, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              CornDog Squad
            </h1>
            <Music size={28} style={{ color: '#a855f7' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
            Electric Forest 2026 Hype Station 🌲✨
          </p>
        </motion.div>

        {/* Chat Area */}
        <div style={{
          flex: 1,
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}
                >
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: msg.type === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.type === 'user'
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(168, 85, 247, 0.2))',
                    border: msg.type === 'user' ? 'none' : '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    lineHeight: 1.5
                  }}>
                    {msg.type === 'forest' && (
                      <span style={{ marginRight: '0.5rem' }}>🌲</span>
                    )}
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ alignSelf: 'flex-start' }}
              >
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(168, 85, 247, 0.2))',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: 'rgba(255,255,255,0.7)'
                }}>
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    🌲 Gathering forest wisdom...
                  </motion.span>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '1rem',
            borderTop: '1px solid rgba(34, 197, 94, 0.2)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about Electric Forest..."
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  border: '2px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
              <motion.button
                onClick={sendMessage}
                disabled={isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                  color: '#fff',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Send size={18} />
              </motion.button>
            </div>
            <p style={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.75rem',
              marginTop: '0.75rem'
            }}>
              Happy Forest! 🌲💚✨
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
