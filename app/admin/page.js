'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, Trash2, Lock, Database, FileText, AlertCircle, CheckCircle, Loader2, Search, MessageSquare } from 'lucide-react'

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

  const handleAuth = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/upload?password=${encodeURIComponent(password)}`)
      if (response.ok) {
        setIsAuthenticated(true)
        const data = await response.json()
        setDbInfo(data)
        setMessage({ type: 'success', text: 'Authenticated successfully' })
      } else {
        setMessage({ type: 'error', text: 'Invalid password' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Authentication failed' })
    }
    setIsLoading(false)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!text.trim()) {
      setMessage({ type: 'error', text: 'Please enter some text content' })
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
          ? `Processed ${data.chunksProcessed}/${data.totalChunks} chunks. Some errors: ${JSON.stringify(data.errors)}`
          : `Successfully processed ${data.chunksProcessed} of ${data.totalChunks} chunks`
        setMessage({ type: 'success', text: successMsg })
        setText('')
        setTitle('')
        // Refresh DB info
        const infoResponse = await fetch(`/api/admin/upload?password=${encodeURIComponent(password)}`)
        if (infoResponse.ok) {
          setDbInfo(await infoResponse.json())
        }
      } else {
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : (data.config ? `${data.error} - Config: ${JSON.stringify(data.config)}` : data.error)
        setMessage({ type: 'error', text: errorMsg || 'Upload failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload document' })
    }

    setIsLoading(false)
  }

  const handleClearDB = async () => {
    if (!confirm('Are you sure you want to clear ALL documents from the vector database? This cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Database cleared successfully' })
        setDbInfo({ result: { vectorCount: 0 } })
      } else {
        setMessage({ type: 'error', text: 'Failed to clear database' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear database' })
    }
    setIsLoading(false)
  }

  const handleTestConfig = async () => {
    setIsLoading(true)
    setTestResults(null)
    try {
      const response = await fetch('/api/admin/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await response.json()
      setTestResults(data)
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

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#050508',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'Space Grotesk, sans-serif'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 24,
            padding: '3rem',
            maxWidth: 400,
            width: '100%',
            textAlign: 'center'
          }}
        >
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(0, 212, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <Lock size={28} color="#00d4ff" />
          </div>

          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            color: 'white'
          }}>
            Admin Access
          </h1>
          
          <p style={{
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '2rem',
            fontSize: '0.875rem'
          }}>
            Enter admin password to manage RAG documents
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              color: 'white',
              fontSize: '1rem',
              marginBottom: '1rem',
              outline: 'none',
              fontFamily: 'Space Grotesk, sans-serif'
            }}
          />

          {message.text && (
            <div style={{
              padding: '0.75rem',
              borderRadius: 8,
              marginBottom: '1rem',
              background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              color: message.type === 'error' ? '#ef4444' : '#10b981',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'center'
            }}>
              {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              {message.text}
            </div>
          )}

          <motion.button
            onClick={handleAuth}
            disabled={isLoading || !password}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '1rem',
              background: password ? 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 12,
              color: password ? '#050508' : 'rgba(255,255,255,0.3)',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: password ? 'pointer' : 'not-allowed',
              fontFamily: 'Space Grotesk, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={18} />}
            Authenticate
          </motion.button>
        </motion.div>

        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050508',
      padding: '2rem',
      fontFamily: 'Space Grotesk, sans-serif',
      color: 'white'
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '2.5rem',
            fontWeight: 800,
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            RAG Admin Panel
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
            Upload documents to enhance the chatbot's knowledge
          </p>
        </motion.div>

        {/* Database Info */}
        {dbInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(0, 212, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Database size={24} color="#00d4ff" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Vector Count
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {dbInfo.result?.vectorCount ?? dbInfo.vectorCount ?? 0}
                </div>
              </div>
            </div>

            <motion.button
              onClick={handleClearDB}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                color: '#ef4444',
                cursor: 'pointer',
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Trash2 size={16} />
              Clear Database
            </motion.button>

            <motion.button
              onClick={handleTestConfig}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 8,
                color: '#3b82f6',
                cursor: 'pointer',
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              Test Config
            </motion.button>
          </motion.div>
        )}

        {/* Test Results */}
        {testResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '1.5rem',
              marginBottom: '2rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              overflow: 'auto'
            }}
          >
            <div style={{ marginBottom: '0.5rem', color: '#3b82f6', fontWeight: 600 }}>
              Configuration Test Results:
            </div>
            {JSON.stringify(testResults, null, 2)}
          </motion.div>
        )}

        {/* RAG Test Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Search size={24} color="#10b981" />
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.25rem', fontWeight: 700 }}>
              Test RAG Retrieval
            </h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Test if the chatbot is retrieving your uploaded documents. Debug info will show what chunks were found.
          </p>
          
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              placeholder="Ask a question about your uploaded content..."
              style={{
                flex: 1,
                padding: '0.875rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: 'white',
                fontSize: '0.875rem',
                outline: 'none',
                fontFamily: 'Space Grotesk, sans-serif'
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleTestRAG()}
            />
            <motion.button
              onClick={handleTestRAG}
              disabled={isLoading || !ragQuery.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '0.875rem 1.5rem',
                background: ragQuery.trim() ? 'linear-gradient(135deg, #10b981 0%, #00d4ff 100%)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 8,
                color: ragQuery.trim() ? '#050508' : 'rgba(255,255,255,0.3)',
                fontWeight: 600,
                cursor: ragQuery.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'Space Grotesk, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={16} />}
              Test
            </motion.button>
          </div>

          {ragResults && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 8,
              padding: '1rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.75rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#10b981', fontWeight: 600, marginBottom: '0.5rem' }}>RAG Debug Info:</div>
                <div>Embedding Generated: {ragResults.ragDebug?.embeddingGenerated ? '✅ Yes' : '❌ No'}</div>
                <div>Results Found: {ragResults.ragDebug?.resultsFound ?? 0}</div>
                <div>Relevant Results (score &gt; 0.7): {ragResults.ragDebug?.relevantResults ?? 0}</div>
              </div>
              
              {ragResults.ragDebug?.chunks?.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ color: '#a855f7', fontWeight: 600, marginBottom: '0.5rem' }}>Retrieved Chunks:</div>
                  {ragResults.ragDebug.chunks.map((chunk, i) => (
                    <div key={i} style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      padding: '0.5rem', 
                      borderRadius: 4, 
                      marginBottom: '0.5rem' 
                    }}>
                      <div style={{ color: '#00d4ff' }}>Score: {chunk.score?.toFixed(3)} | Title: {chunk.title}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)' }}>{chunk.preview}</div>
                    </div>
                  ))}
                </div>
              )}

              {ragResults.ragDebug?.relevantResults === 0 && (
                <div style={{ color: '#f97316', marginBottom: '1rem' }}>
                  ⚠️ No relevant chunks found! This means either:
                  <br/>• No documents have been uploaded yet
                  <br/>• The uploaded content doesn't match your query
                  <br/>• The similarity scores are below 0.7 threshold
                </div>
              )}
              
              <div>
                <div style={{ color: '#3b82f6', fontWeight: 600, marginBottom: '0.5rem' }}>AI Response:</div>
                <div style={{ color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap' }}>{ragResults.response}</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Upload Form */}
        <motion.form
          onSubmit={handleUpload}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: '2rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <FileText size={24} color="#a855f7" />
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.25rem', fontWeight: 700 }}>
              Upload Document
            </h2>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '0.5rem'
            }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: 'white',
                fontSize: '0.875rem',
                outline: 'none',
                fontFamily: 'Space Grotesk, sans-serif'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '0.5rem'
            }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: 'white',
                fontSize: '0.875rem',
                outline: 'none',
                fontFamily: 'Space Grotesk, sans-serif'
              }}
            >
              <option value="general">General</option>
              <option value="experience">Work Experience</option>
              <option value="projects">Projects</option>
              <option value="skills">Skills</option>
              <option value="education">Education</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '0.5rem'
            }}>
              Content
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your document content here..."
              rows={12}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: 'white',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'Space Grotesk, sans-serif',
                lineHeight: 1.6
              }}
            />
          </div>

          {message.text && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 8,
              marginBottom: '1rem',
              background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              color: message.type === 'error' ? '#ef4444' : '#10b981',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              {message.text}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={isLoading || !text.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '1rem',
              background: text.trim() ? 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 12,
              color: text.trim() ? '#050508' : 'rgba(255,255,255,0.3)',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'Space Grotesk, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isLoading ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Upload size={18} />
            )}
            Upload & Process
          </motion.button>
        </motion.form>

        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '0.75rem',
          marginTop: '2rem'
        }}>
          Documents are chunked and embedded using Google's text-embedding-004 model
        </p>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        option {
          background: #1a1a1f;
        }
      `}</style>
    </div>
  )
}
