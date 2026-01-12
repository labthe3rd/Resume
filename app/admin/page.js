'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Trash2, Database, Loader2, Search, File, X } from 'lucide-react'

// MUST be set in environment - no fallback, no guessing
const API_URL = process.env.NEXT_PUBLIC_API_URL

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
  const [documents, setDocuments] = useState([])
  const [showDocuments, setShowDocuments] = useState(false)
  
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  // Chunking configuration
  const [chunkStrategy, setChunkStrategy] = useState('semantic')
  const [chunkSize, setChunkSize] = useState(512)
  const [chunkOverlap, setChunkOverlap] = useState(64)
  const [showChunkPreview, setShowChunkPreview] = useState(false)
  const [chunks, setChunks] = useState([])
  const [chunkStats, setChunkStats] = useState(null)

  // Configuration check
  if (!API_URL) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 600, margin: '10rem auto', background: '#3a1a1a', padding: '2rem', borderRadius: '8px', border: '1px solid #ff4444' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ff4444' }}>Configuration Error</h1>
          <p style={{ marginBottom: '1rem' }}>NEXT_PUBLIC_API_URL environment variable is not set.</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '1rem' }}>Add this to your .env.local file:</p>
          <pre style={{ background: '#0a0a0f', padding: '1rem', borderRadius: '4px', fontSize: '0.875rem' }}>
NEXT_PUBLIC_API_URL=https://api.louisbersine.com
          </pre>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '1rem' }}>Then restart your Next.js development server.</p>
        </div>
      </div>
    )
  }

  // Client-side chunking for preview only
  const chunkText = (text, strategy = 'semantic') => {
    if (!text || !text.trim()) return { chunks: [], stats: null }

    const results = []
    
    try {
      switch (strategy) {
        case 'fixed':
          for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
            const chunk = text.slice(i, i + chunkSize).trim()
            if (chunk) {
              results.push({ text: chunk, size: chunk.length, type: 'fixed' })
            }
          }
          break

        case 'semantic':
          const paragraphs = text.split(/\n\n+/)
          let currentChunk = ''

          for (const para of paragraphs) {
            const testChunk = currentChunk ? currentChunk + '\n\n' + para : para
            
            if (testChunk.length > chunkSize && currentChunk) {
              results.push({ text: currentChunk.trim(), size: currentChunk.length, type: 'semantic' })
              currentChunk = para
            } else {
              currentChunk = testChunk
            }
          }

          if (currentChunk.trim()) {
            results.push({ text: currentChunk.trim(), size: currentChunk.length, type: 'semantic' })
          }
          break

        case 'sentence':
          const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
          let sentenceChunk = ''

          for (const sentence of sentences) {
            const testChunk = sentenceChunk + sentence
            
            if (testChunk.length > chunkSize && sentenceChunk) {
              results.push({ text: sentenceChunk.trim(), size: sentenceChunk.length, type: 'sentence' })
              sentenceChunk = sentence
            } else {
              sentenceChunk = testChunk
            }
          }

          if (sentenceChunk.trim()) {
            results.push({ text: sentenceChunk.trim(), size: sentenceChunk.length, type: 'sentence' })
          }
          break

        case 'recursive':
          const recursiveSplit = (text, delimiters, maxSize) => {
            if (!delimiters.length || text.length <= maxSize) {
              return text.trim() ? [text.trim()] : []
            }
            const [delimiter, ...rest] = delimiters
            const parts = text.split(delimiter)
            const chunks = []
            for (const part of parts) {
              if (part.length <= maxSize) {
                if (part.trim()) chunks.push(part.trim())
              } else {
                chunks.push(...recursiveSplit(part, rest, maxSize))
              }
            }
            return chunks
          }

          const delimiters = ['\n\n', '\n', '. ', ' ']
          const recursiveChunks = recursiveSplit(text, delimiters, chunkSize)
          
          for (const chunk of recursiveChunks) {
            if (chunk.trim()) {
              results.push({ text: chunk.trim(), size: chunk.length, type: 'recursive' })
            }
          }
          break
      }

      const stats = {
        totalChunks: results.length,
        avgSize: results.length > 0 ? Math.round(results.reduce((sum, c) => sum + c.size, 0) / results.length) : 0,
        minSize: results.length > 0 ? Math.min(...results.map(c => c.size)) : 0,
        maxSize: results.length > 0 ? Math.max(...results.map(c => c.size)) : 0,
        totalChars: text.length
      }

      return { chunks: results, stats }
    } catch (error) {
      console.error('Chunking error:', error)
      return { chunks: [], stats: null }
    }
  }

  useEffect(() => {
    if (text && text.trim()) {
      const result = chunkText(text, chunkStrategy)
      setChunks(result.chunks)
      setChunkStats(result.stats)
    } else {
      setChunks([])
      setChunkStats(null)
    }
  }, [text, chunkStrategy, chunkSize, chunkOverlap])

  const handleAuth = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/upload?password=${encodeURIComponent(password)}`)
      if (response.ok) {
        setIsAuthenticated(true)
        const data = await response.json()
        setDbInfo(data)
        setMessage({ type: 'success', text: 'Access granted' })
        // Load documents
        loadDocuments()
      } else {
        setMessage({ type: 'error', text: 'Invalid credentials' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection error: ' + error.message })
    }
    setIsLoading(false)
  }

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/documents?password=${encodeURIComponent(password)}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setSelectedFile(file)
    
    try {
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        const text = await file.text()
        setText(text)
        setTitle(file.name.replace(/\.[^/.]+$/, ''))
        setMessage({ type: 'success', text: `Loaded: ${text.length} chars` })
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''))
        setText('')
        setMessage({ type: 'success', text: `PDF selected: ${file.name} - will extract on server` })
      } else {
        setMessage({ type: 'error', text: 'Unsupported file type. Use PDF, TXT, MD, or CSV' })
        setSelectedFile(null)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'File processing failed: ' + error.message })
      setSelectedFile(null)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    
    if (!text.trim() && !selectedFile) {
      setMessage({ type: 'error', text: 'Text or file required' })
      return
    }
    
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Title required' })
      return
    }

    setIsLoading(true)
    
    try {
      const formData = new FormData()
      
      if (selectedFile && selectedFile.type === 'application/pdf') {
        formData.append('file', selectedFile)
      } else if (text.trim()) {
        formData.append('text', text)
      }
      
      formData.append('title', title)
      formData.append('category', category)
      formData.append('chunkStrategy', chunkStrategy)
      formData.append('chunkSize', chunkSize.toString())
      formData.append('chunkOverlap', chunkOverlap.toString())

      const response = await fetch(`${API_URL}/api/admin/upload?password=${encodeURIComponent(password)}`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: `Success: ${data.result?.chunksAdded || 0} chunks added` })
        setDbInfo(prev => ({ ...prev, vectorCount: data.vectorCount }))
        setText('')
        setTitle('')
        setSelectedFile(null)
        setChunks([])
        setChunkStats(null)
        // Reload documents to show what was added
        loadDocuments()
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Upload failed: ' + error.message })
    }

    setIsLoading(false)
  }

  const handleClearDB = async () => {
    if (!confirm('Delete ALL vectors?')) return

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/clear?password=${encodeURIComponent(password)}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Database cleared' })
        setDbInfo(prev => ({ ...prev, vectorCount: 0 }))
        setDocuments([])
      } else {
        setMessage({ type: 'error', text: data.error || 'Clear failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Clear failed: ' + error.message })
    }
    setIsLoading(false)
  }

  const handleTestConfig = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/test-config?password=${encodeURIComponent(password)}`)
      const data = await response.json()
      
      if (response.ok) {
        setTestResults(data)
        setMessage({ type: 'success', text: 'Diagnostics complete' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Diagnostics failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection error: ' + error.message })
    }
    setIsLoading(false)
  }

  const handleTestRAG = async () => {
    if (!ragQuery.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/test-rag?password=${encodeURIComponent(password)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery })
      })

      const data = await response.json()

      if (response.ok) {
        setRagResults(data)
        setMessage({ type: 'success', text: 'Query complete' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Query failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Query failed: ' + error.message })
    }
    setIsLoading(false)
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 400, margin: '10rem auto', background: '#1a1a2e', padding: '2rem', borderRadius: '8px', border: '1px solid #333' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>RAG Admin</h1>
          <p style={{ fontSize: '0.875rem', opacity: 0.6, marginBottom: '1.5rem' }}>API: {API_URL}</p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0', marginBottom: '1rem' }}
            />
            
            <button
              type="submit"
              disabled={isLoading}
              style={{ width: '100%', padding: '0.75rem', background: '#4a9eff', border: 'none', borderRadius: '4px', color: '#fff', cursor: isLoading ? 'wait' : 'pointer' }}
            >
              {isLoading ? 'Connecting...' : 'Login'}
            </button>
          </form>

          {message.text && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: message.type === 'error' ? '#3a1a1a' : '#1a3a1a', border: `1px solid ${message.type === 'error' ? '#ff4444' : '#44ff44'}`, borderRadius: '4px', fontSize: '0.875rem' }}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>RAG Knowledge Base</h1>
          <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>API: {API_URL}</p>
        </div>

        {message.text && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: message.type === 'error' ? '#3a1a1a' : '#1a3a1a', border: `1px solid ${message.type === 'error' ? '#ff4444' : '#44ff44'}`, borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e0e0e0', fontSize: '1.25rem' }}>×</button>
          </div>
        )}

        {/* Database Status */}
        {dbInfo && (
          <div style={{ padding: '1.5rem', background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>VECTORS</div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{dbInfo.vectorCount ?? 0}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleClearDB} disabled={isLoading} style={{ padding: '0.75rem 1.5rem', background: '#ff4444', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>
                  Clear DB
                </button>
                <button onClick={handleTestConfig} disabled={isLoading} style={{ padding: '0.75rem 1.5rem', background: '#4a9eff', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>
                  Diagnostics
                </button>
                <button onClick={loadDocuments} disabled={isLoading} style={{ padding: '0.75rem 1.5rem', background: '#44ff44', border: 'none', borderRadius: '4px', color: '#000', cursor: 'pointer' }}>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Documents List */}
        {documents.length > 0 && (
          <div style={{ padding: '1.5rem', background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Documents in Database ({documents.length})</h3>
              <button
                onClick={() => setShowDocuments(!showDocuments)}
                style={{ padding: '0.5rem 1rem', background: '#4a9eff', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
              >
                {showDocuments ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showDocuments && (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {documents.map((doc, idx) => (
                  <div key={idx} style={{ background: '#0a0a0f', padding: '1rem', marginBottom: '0.5rem', borderRadius: '4px', borderLeft: '3px solid #4a9eff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700 }}>{doc.title}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                        {doc.chunks} chunks | {doc.category} | {doc.strategy}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                      {doc.firstChunk}...
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.5rem' }}>
                      {new Date(doc.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test Results */}
        {testResults && (
          <div style={{ padding: '1.5rem', background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Diagnostics</h3>
            <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '400px', background: '#0a0a0f', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>{JSON.stringify(testResults, null, 2)}</pre>
          </div>
        )}

        {/* RAG Test */}
        <div style={{ padding: '1.5rem', background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Query Test</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input 
              type="text" 
              value={ragQuery} 
              onChange={(e) => setRagQuery(e.target.value)} 
              placeholder="Enter query..." 
              style={{ flex: 1, padding: '0.75rem', background: '#0a0a0f', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0' }}
              onKeyDown={(e) => e.key === 'Enter' && handleTestRAG()}
            />
            <button 
              onClick={handleTestRAG} 
              disabled={isLoading || !ragQuery.trim()} 
              style={{ padding: '0.75rem 1.5rem', background: '#4a9eff', border: 'none', borderRadius: '4px', color: '#fff', cursor: ragQuery.trim() ? 'pointer' : 'not-allowed', opacity: ragQuery.trim() ? 1 : 0.5 }}
            >
              Execute
            </button>
          </div>
          {ragResults && (
            <div style={{ background: '#0a0a0f', padding: '1rem', borderRadius: '4px', fontSize: '0.875rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ opacity: 0.6, marginBottom: '0.5rem' }}>RAG Debug:</div>
                <div>Embedding: {ragResults.ragDebug?.embeddingGenerated ? 'OK' : 'FAIL'}</div>
                <div>Results: {ragResults.ragDebug?.resultsFound ?? 0} | Relevant: {ragResults.ragDebug?.relevantResults ?? 0}</div>
              </div>
              {ragResults.ragDebug?.chunks?.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ opacity: 0.6, marginBottom: '0.5rem' }}>Chunks:</div>
                  {ragResults.ragDebug.chunks.map((chunk, i) => (
                    <div key={i} style={{ background: '#1a1a2e', padding: '0.5rem', marginBottom: '0.5rem', borderLeft: '3px solid #4a9eff' }}>
                      <div>Score: {chunk.score?.toFixed(3)} | {chunk.title}</div>
                      <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>{chunk.preview}</div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <div style={{ opacity: 0.6, marginBottom: '0.5rem' }}>Response:</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{ragResults.response}</div>
              </div>
            </div>
          )}
        </div>

        {/* Chunking Config */}
        <div style={{ padding: '1.5rem', background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Chunking Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>Strategy</label>
              <select value={chunkStrategy} onChange={(e) => setChunkStrategy(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0' }}>
                <option value="semantic">Semantic (Paragraphs)</option>
                <option value="sentence">Sentence-based</option>
                <option value="fixed">Fixed-size</option>
                <option value="recursive">Recursive</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>Chunk Size: {chunkSize}</label>
              <input 
                type="range" 
                min="128" 
                max="2048" 
                step="64" 
                value={chunkSize} 
                onChange={(e) => setChunkSize(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>Overlap: {chunkOverlap}</label>
              <input 
                type="range" 
                min="0" 
                max="256" 
                step="16" 
                value={chunkOverlap} 
                onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {chunkStats && (
            <div style={{ background: '#0a0a0f', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <div style={{ opacity: 0.6 }}>Total Chunks</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{chunkStats.totalChunks}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6 }}>Avg Size</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{chunkStats.avgSize}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6 }}>Min Size</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{chunkStats.minSize}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6 }}>Max Size</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{chunkStats.maxSize}</div>
                </div>
              </div>
            </div>
          )}

          {chunks.length > 0 && (
            <button
              onClick={() => setShowChunkPreview(!showChunkPreview)}
              style={{ width: '100%', padding: '0.75rem', background: '#4a9eff', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', marginBottom: showChunkPreview ? '1rem' : 0 }}
            >
              {showChunkPreview ? 'Hide' : 'Show'} Chunks ({chunks.length})
            </button>
          )}

          {showChunkPreview && chunks.length > 0 && (
            <div style={{ maxHeight: '400px', overflowY: 'auto', background: '#0a0a0f', padding: '1rem', borderRadius: '4px' }}>
              {chunks.map((chunk, idx) => (
                <div key={idx} style={{ background: '#1a1a2e', padding: '0.75rem', marginBottom: '0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', opacity: 0.6 }}>
                    <span>Chunk #{idx + 1}</span>
                    <span>{chunk.size} chars | {chunk.type}</span>
                  </div>
                  <div style={{ opacity: 0.9 }}>{chunk.text.substring(0, 200)}{chunk.text.length > 200 && '...'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File Upload */}
        <div style={{ padding: '1.5rem', background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>File Upload</h3>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFileSelect({ target: { files: [file] } }); }}
            onClick={() => fileInputRef.current?.click()}
            style={{ border: `2px dashed ${isDragging ? '#4a9eff' : '#333'}`, padding: '2rem', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(74, 158, 255, 0.1)' : '#0a0a0f', borderRadius: '4px', marginBottom: '1rem' }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.csv" onChange={handleFileSelect} style={{ display: 'none' }} />
            {selectedFile ? (
              <div>
                <File size={40} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
                <div>{selectedFile.name}</div>
                <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setText(''); setTitle(''); }} style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#ff4444', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>Remove</button>
              </div>
            ) : (
              <>
                <Upload size={40} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
                <div>Drop file or click to browse</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem' }}>PDF, TXT, MD, CSV</div>
              </>
            )}
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUpload} style={{ padding: '1.5rem', background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Upload Document</h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Document title" 
              style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0' }}>
              <option value="general">General</option>
              <option value="experience">Experience</option>
              <option value="projects">Projects</option>
              <option value="skills">Skills</option>
              <option value="education">Education</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>Text {text.length > 0 && `(${text.length} chars)`} {chunkStats && `• ${chunkStats.totalChunks} chunks`}</label>
            <textarea 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="Paste text here or upload a file above..." 
              rows={10} 
              style={{ width: '100%', padding: '0.75rem', background: '#0a0a0f', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0', resize: 'vertical', minHeight: 200, fontFamily: 'monospace', fontSize: '0.875rem' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || (!text.trim() && !selectedFile) || !title.trim()} 
            style={{ width: '100%', padding: '0.75rem', background: '#4a9eff', border: 'none', borderRadius: '4px', color: '#fff', cursor: (text.trim() || selectedFile) && title.trim() ? 'pointer' : 'not-allowed', opacity: (text.trim() || selectedFile) && title.trim() ? 1 : 0.5 }}
          >
            {isLoading ? 'Uploading...' : `Upload ${chunkStats?.totalChunks || 0} Chunks`}
          </button>
        </form>
      </div>
    </div>
  )
}