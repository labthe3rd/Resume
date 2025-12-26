'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, Trash2, Lock, Database, FileText, AlertCircle, CheckCircle, Loader2, Search, MessageSquare, File, Image, FileSpreadsheet, X, Terminal } from 'lucide-react'

// Matrix rain effect component
function MatrixRain() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF'
    const fontSize = 14
    const columns = canvas.width / fontSize
    const drops = Array(Math.floor(columns)).fill(1)

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#0f0'
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillStyle = `rgba(0, ${150 + Math.random() * 105}, 0, ${0.5 + Math.random() * 0.5})`
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 50)

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: 0.15
      }}
    />
  )
}

// Cyberpunk styles
const cyberButtonStyle = {
  padding: '0.75rem 1.5rem',
  background: 'rgba(0, 255, 65, 0.1)',
  border: '1px solid #00ff41',
  borderRadius: 0,
  color: '#00ff41',
  cursor: 'pointer',
  fontFamily: '"Fira Code", "Courier New", monospace',
  fontSize: '0.875rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease'
}

const cyberInputStyle = {
  width: '100%',
  padding: '0.875rem 1rem',
  background: 'rgba(0, 0, 0, 0.8)',
  border: '1px solid #00ff41',
  borderRadius: 0,
  color: '#00ff41',
  fontSize: '0.875rem',
  outline: 'none',
  fontFamily: '"Fira Code", "Courier New", monospace',
  caretColor: '#00ff41'
}

const cyberPanelStyle = {
  background: 'rgba(0, 0, 0, 0.9)',
  border: '1px solid #00ff41',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  position: 'relative'
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [dbInfo, setDbInfo] = useState(null)
  const [testResults, setTestResults] = useState(null)
  const [ragQuery, setRagQuery] = useState('')
  const [ragResults, setRagResults] = useState(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileProcessing, setFileProcessing] = useState(false)
  const [filePreview, setFilePreview] = useState(null)
  const fileInputRef = useRef(null)

  const [displayedMessage, setDisplayedMessage] = useState('')
  useEffect(() => {
    if (message.text) {
      let currentIndex = 0
      setDisplayedMessage('')
      const interval = setInterval(() => {
        if (currentIndex < message.text.length) {
          setDisplayedMessage(message.text.substring(0, currentIndex + 1))
          currentIndex++
        } else {
          clearInterval(interval)
        }
      }, 10)
      return () => clearInterval(interval)
    } else {
      setDisplayedMessage('')
    }
  }, [message.text])

  const handleAuth = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/upload?password=${encodeURIComponent(password)}`)
      if (response.ok) {
        setIsAuthenticated(true)
        const data = await response.json()
        setDbInfo(data)
        setMessage({ type: 'success', text: '> ACCESS GRANTED. WELCOME TO THE MATRIX.' })
      } else {
        setMessage({ type: 'error', text: '> ACCESS DENIED. INVALID CREDENTIALS.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '> SYSTEM ERROR. CONNECTION FAILED.' })
    }
    setIsLoading(false)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!text.trim()) {
      setMessage({ type: 'error', text: '> ERROR: NO DATA TO UPLOAD.' })
      return
    }

    setIsLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, text, title, category })
      })

      const data = await response.json()

      if (response.ok) {
        const successMsg = data.errors && data.errors.length > 0
          ? `> PARTIAL: ${data.chunksProcessed}/${data.totalChunks} CHUNKS`
          : `> COMPLETE: ${data.chunksProcessed} CHUNKS INJECTED`
        setMessage({ type: 'success', text: successMsg })
        setText('')
        setTitle('')
        setSelectedFile(null)
        setFilePreview(null)
        const infoResponse = await fetch(`/api/admin/upload?password=${encodeURIComponent(password)}`)
        if (infoResponse.ok) {
          setDbInfo(await infoResponse.json())
        }
      } else {
        setMessage({ type: 'error', text: `> FAILED: ${data.error || 'UNKNOWN'}` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '> CRITICAL ERROR' })
    }
    setIsLoading(false)
  }

  const handleClearDB = async () => {
    if (!confirm('⚠️ PURGE ALL VECTORS?')) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (response.ok) {
        setMessage({ type: 'success', text: '> DATABASE PURGED.' })
        setDbInfo({ result: { vectorCount: 0 } })
      } else {
        setMessage({ type: 'error', text: '> PURGE FAILED.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '> ERROR.' })
    }
    setIsLoading(false)
  }

  const handleTestConfig = async () => {
    setIsLoading(true)
    setTestResults(null)
    setMessage({ type: '', text: '> RUNNING DIAGNOSTICS...' })
    try {
      const response = await fetch('/api/admin/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await response.json()
      setTestResults(data)
      setMessage({ type: 'success', text: '> DIAGNOSTICS COMPLETE.' })
    } catch (error) {
      setTestResults({ error: error.message })
    }
    setIsLoading(false)
  }

  const handleTestRAG = async () => {
    if (!ragQuery.trim()) return
    setIsLoading(true)
    setRagResults(null)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: ragQuery, debug: true })
      })
      const data = await response.json()
      setRagResults(data)
    } catch (error) {
      setRagResults({ error: error.message })
    }
    setIsLoading(false)
  }

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false) }
  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await processFile(file)
  }
  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (file) await processFile(file)
  }

  const processFile = async (file) => {
    setSelectedFile(file)
    setFileProcessing(true)
    setMessage({ type: '', text: `> PROCESSING: ${file.name}` })
    setFilePreview(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('password', password)

      const response = await fetch('/api/admin/process-file', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()

      if (response.ok) {
        setText(data.text)
        setTitle(file.name.replace(/\.[^/.]+$/, ''))
        setFilePreview({ fileName: data.fileName, method: data.processingMethod, textLength: data.textLength, preview: data.preview })
        setMessage({ type: 'success', text: `> DECODED: ${data.textLength} CHARS [${data.processingMethod}]` })
      } else {
        setMessage({ type: 'error', text: `> FAILED: ${data.error}` })
        setSelectedFile(null)
      }
    } catch (error) {
      setMessage({ type: 'error', text: '> FILE ERROR' })
      setSelectedFile(null)
    }
    setFileProcessing(false)
  }

  const clearFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setText('')
    setTitle('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={20} />
    if (ext === 'pdf') return <FileText size={20} />
    if (ext === 'csv') return <FileSpreadsheet size={20} />
    return <File size={20} />
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: '"Fira Code", "Courier New", monospace',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <MatrixRain />
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)', pointerEvents: 'none', zIndex: 100 }} />

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ ...cyberPanelStyle, maxWidth: 450, width: '100%', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Terminal size={32} color="#00ff41" />
            <div>
              <div style={{ color: '#00ff41', fontSize: '1.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>SYSTEM ACCESS</div>
              <div style={{ color: '#00ff4180', fontSize: '0.75rem' }}>AUTHORIZATION REQUIRED</div>
            </div>
          </div>

          <div style={{ color: '#00ff41', marginBottom: '1rem', fontSize: '0.75rem' }}>{'>'} ENTER ACCESS CODE:</div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="****************"
            style={{ ...cyberInputStyle, marginBottom: '1rem' }}
          />

          <motion.button
            onClick={handleAuth}
            disabled={isLoading || !password}
            whileHover={{ boxShadow: '0 0 20px #00ff4150' }}
            whileTap={{ scale: 0.98 }}
            style={{ ...cyberButtonStyle, width: '100%', opacity: password ? 1 : 0.5 }}
          >
            {isLoading ? <><Loader2 size={16} className="spin" /> AUTHENTICATING...</> : '[ AUTHENTICATE ]'}
          </motion.button>

          {message.text && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem',
              background: message.type === 'error' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 65, 0.1)',
              border: `1px solid ${message.type === 'error' ? '#ff0000' : '#00ff41'}`,
              color: message.type === 'error' ? '#ff0000' : '#00ff41',
              fontSize: '0.75rem'
            }}>
              {displayedMessage}<span className="blink">_</span>
            </div>
          )}
        </motion.div>

        <style jsx global>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .blink { animation: blink 1s infinite; }
          @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        `}</style>
      </div>
    )
  }

  // MAIN ADMIN PANEL
  return (
    <div style={{ minHeight: '100vh', background: '#000', padding: '2rem', fontFamily: '"Fira Code", "Courier New", monospace', color: '#00ff41', position: 'relative', overflow: 'hidden' }}>
      <MatrixRain />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)', pointerEvents: 'none', zIndex: 100 }} />

      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Terminal size={32} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', textShadow: '0 0 10px #00ff41' }}>RAG CONTROL TERMINAL</h1>
          </div>
          <div style={{ color: '#00ff4180', fontSize: '0.75rem', marginLeft: '3rem' }}>NEURAL NETWORK KNOWLEDGE BASE v2.0</div>
        </motion.div>

        {/* Message */}
        {message.text && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{
            marginBottom: '1.5rem', padding: '1rem',
            background: message.type === 'error' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 65, 0.1)',
            border: `1px solid ${message.type === 'error' ? '#ff0000' : '#00ff41'}`,
            color: message.type === 'error' ? '#ff0000' : '#00ff41',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span>{displayedMessage}<span className="blink">_</span></span>
            <button onClick={() => setMessage({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
          </motion.div>
        )}

        {/* Database Status */}
        {dbInfo && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={cyberPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Database size={24} />
                <div>
                  <div style={{ fontSize: '0.625rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.2em' }}>VECTOR DATABASE</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, textShadow: '0 0 10px #00ff41' }}>{dbInfo.result?.vectorCount ?? dbInfo.vectorCount ?? 0} <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>VECTORS</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <motion.button onClick={handleClearDB} disabled={isLoading} whileHover={{ boxShadow: '0 0 15px rgba(255,0,0,0.3)' }} style={{ ...cyberButtonStyle, color: '#ff0000', borderColor: '#ff0000', background: 'rgba(255, 0, 0, 0.1)' }}>
                  <Trash2 size={14} style={{ marginRight: '0.5rem' }} />PURGE
                </motion.button>
                <motion.button onClick={handleTestConfig} disabled={isLoading} whileHover={{ boxShadow: '0 0 15px rgba(0,255,255,0.3)' }} style={{ ...cyberButtonStyle, color: '#00ffff', borderColor: '#00ffff', background: 'rgba(0, 255, 255, 0.1)' }}>
                  DIAGNOSTICS
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Test Results */}
        {testResults && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...cyberPanelStyle, fontSize: '0.7rem' }}>
            <div style={{ marginBottom: '0.5rem', color: '#00ffff', textTransform: 'uppercase' }}>{'>'} DIAGNOSTICS:</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#00ff41' }}>{JSON.stringify(testResults, null, 2)}</pre>
          </motion.div>
        )}

        {/* RAG Test */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cyberPanelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Search size={20} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>NEURAL QUERY TEST</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input type="text" value={ragQuery} onChange={(e) => setRagQuery(e.target.value)} placeholder="> ENTER QUERY..." style={{ ...cyberInputStyle, flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && handleTestRAG()} />
            <motion.button onClick={handleTestRAG} disabled={isLoading || !ragQuery.trim()} whileHover={{ boxShadow: '0 0 15px #00ff4150' }} style={{ ...cyberButtonStyle, opacity: ragQuery.trim() ? 1 : 0.5 }}>
              {isLoading ? <Loader2 size={16} className="spin" /> : 'EXECUTE'}
            </motion.button>
          </div>
          {ragResults && (
            <div style={{ background: 'rgba(0, 0, 0, 0.5)', padding: '1rem', border: '1px solid #00ff4140', fontSize: '0.75rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#00ffff', marginBottom: '0.5rem' }}>{'>'} RAG DEBUG:</div>
                <div>EMBEDDING: {ragResults.ragDebug?.embeddingGenerated ? '[OK]' : '[FAIL]'}</div>
                <div>RESULTS: {ragResults.ragDebug?.resultsFound ?? 0} | RELEVANT: {ragResults.ragDebug?.relevantResults ?? 0}</div>
              </div>
              {ragResults.ragDebug?.chunks?.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ color: '#ff00ff', marginBottom: '0.5rem' }}>{'>'} CHUNKS:</div>
                  {ragResults.ragDebug.chunks.map((chunk, i) => (
                    <div key={i} style={{ background: 'rgba(0, 255, 65, 0.05)', padding: '0.5rem', marginBottom: '0.5rem', borderLeft: '2px solid #00ff41' }}>
                      <div style={{ color: '#00ffff' }}>SCORE: {chunk.score?.toFixed(3)} | {chunk.title}</div>
                      <div style={{ opacity: 0.7 }}>{chunk.preview}</div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <div style={{ color: '#ffff00', marginBottom: '0.5rem' }}>{'>'} RESPONSE:</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{ragResults.response}</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* File Upload */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={cyberPanelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Upload size={20} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>FILE INJECTION</span>
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '1rem' }}>PDF / TXT / MD / CSV / JPG / PNG / GIF / WEBP</div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#00ff41' : '#00ff4140'}`,
              padding: '2rem', textAlign: 'center', cursor: 'pointer',
              background: isDragging ? 'rgba(0, 255, 65, 0.05)' : 'transparent', marginBottom: '1rem'
            }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.csv,.jpg,.jpeg,.png,.gif,.webp" onChange={handleFileSelect} style={{ display: 'none' }} />
            {fileProcessing ? (
              <div><Loader2 size={40} className="spin" style={{ marginBottom: '1rem' }} /><div>DECODING...</div></div>
            ) : selectedFile ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  {getFileIcon(selectedFile.name)}<span>{selectedFile.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); clearFile(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff0000' }}><X size={18} /></button>
                </div>
                {filePreview && <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>{filePreview.textLength} CHARS</span>}
              </div>
            ) : (
              <><Upload size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} /><div>DROP FILE OR CLICK</div></>
            )}
          </div>
          {filePreview && (
            <div style={{ background: 'rgba(0, 0, 0, 0.5)', padding: '1rem', border: '1px solid #00ff4140', marginBottom: '1rem', fontSize: '0.75rem' }}>
              <div style={{ color: '#ffff00', marginBottom: '0.5rem' }}>{'>'} EXTRACTED [{filePreview.method}]:</div>
              <div style={{ opacity: 0.7, maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{filePreview.preview}</div>
            </div>
          )}
        </motion.div>

        {/* Upload Form */}
        <motion.form onSubmit={handleUpload} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={cyberPanelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <FileText size={20} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{selectedFile ? 'CONFIRM INJECTION' : 'MANUAL ENTRY'}</span>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.625rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>IDENTIFIER</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="> TITLE" style={cyberInputStyle} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.625rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>CLASSIFICATION</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={cyberInputStyle}>
              <option value="general">GENERAL</option>
              <option value="experience">EXPERIENCE</option>
              <option value="projects">PROJECTS</option>
              <option value="skills">SKILLS</option>
              <option value="education">EDUCATION</option>
              <option value="personal">PERSONAL</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.625rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>DATA ({text.length} CHARS)</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="> ENTER DATA..." rows={10} style={{ ...cyberInputStyle, resize: 'vertical', minHeight: 200 }} />
          </div>

          <motion.button type="submit" disabled={isLoading || !text.trim()} whileHover={{ boxShadow: text.trim() ? '0 0 20px #00ff4150' : 'none' }} style={{ ...cyberButtonStyle, width: '100%', opacity: text.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {isLoading ? <><Loader2 size={16} className="spin" /> INJECTING...</> : <><Upload size={16} /> [ INJECT INTO MATRIX ]</>}
          </motion.button>
        </motion.form>
      </div>

      <style jsx global>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .blink { animation: blink 1s infinite; }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        ::selection { background: #00ff41; color: #000; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #00ff41; }
      `}</style>
    </div>
  )
}
