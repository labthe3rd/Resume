import { NextResponse } from 'next/server'
import { AI_CONFIG, GOOGLE_ENDPOINTS } from '../../../../lib/ai-config'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const UPSTASH_VECTOR_REST_URL = process.env.UPSTASH_VECTOR_REST_URL
const UPSTASH_VECTOR_REST_TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

async function getEmbedding(text) {
  const url = GOOGLE_ENDPOINTS.embedding(AI_CONFIG.EMBEDDING_MODEL, GOOGLE_API_KEY)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${AI_CONFIG.EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: AI_CONFIG.EMBEDDING_DIMENSIONS
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Google Embedding API error:', errorText)
    throw new Error(`Embedding failed: ${response.status} - ${errorText}`)
  }
  
  const data = await response.json()
  return data.embedding?.values
}

async function upsertVector(id, embedding, metadata) {
  const response = await fetch(`${UPSTASH_VECTOR_REST_URL}/upsert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_VECTOR_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id,
      vector: embedding,
      metadata
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Upstash upsert error:', errorText)
    throw new Error(`Upstash upsert failed: ${response.status} - ${errorText}`)
  }

  return response.json()
}

function chunkText(text, chunkSize = AI_CONFIG.RAG_CHUNK_SIZE, overlap = AI_CONFIG.RAG_CHUNK_OVERLAP) {
  const chunks = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim())
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue
    
    if ((currentChunk + ' ' + trimmed).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim())
      // Keep last part for overlap
      const words = currentChunk.split(' ')
      currentChunk = words.slice(-Math.floor(overlap / 5)).join(' ') + ' ' + trimmed
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmed
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

export async function POST(request) {
  try {
    // Check configuration
    const configStatus = {
      hasGoogleKey: !!GOOGLE_API_KEY,
      hasUpstashUrl: !!UPSTASH_VECTOR_REST_URL,
      hasUpstashToken: !!UPSTASH_VECTOR_REST_TOKEN,
      hasAdminPassword: !!ADMIN_PASSWORD,
      embeddingModel: AI_CONFIG.EMBEDDING_MODEL,
      chatModel: AI_CONFIG.CHAT_MODEL
    }

    if (!GOOGLE_API_KEY || !UPSTASH_VECTOR_REST_URL || !UPSTASH_VECTOR_REST_TOKEN || !ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Server not fully configured', config: configStatus },
        { status: 500 }
      )
    }

    const { password, text, title, category } = await request.json()

    // Verify admin password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      )
    }

    // Chunk the text
    const chunks = chunkText(text)
    const timestamp = Date.now()
    const results = []
    const errors = []

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const id = `${timestamp}-${i}`
      
      try {
        // Generate embedding
        const embedding = await getEmbedding(chunk)
        
        if (!embedding) {
          errors.push({ chunk: i, error: 'No embedding returned' })
          continue
        }

        // Store in vector DB
        await upsertVector(id, embedding, {
          text: chunk,
          title: title || 'Untitled',
          category: category || 'general',
          chunkIndex: i,
          totalChunks: chunks.length,
          createdAt: new Date().toISOString()
        })

        results.push({ id, chunkIndex: i })
      } catch (chunkError) {
        errors.push({ chunk: i, error: chunkError.message })
      }
    }

    return NextResponse.json({
      success: results.length > 0,
      chunksProcessed: results.length,
      totalChunks: chunks.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process document', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to list vectors (admin only)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const password = searchParams.get('password')

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!UPSTASH_VECTOR_REST_URL || !UPSTASH_VECTOR_REST_TOKEN) {
      return NextResponse.json(
        { error: 'Vector DB not configured' },
        { status: 500 }
      )
    }

    // Get info about the index
    const response = await fetch(`${UPSTASH_VECTOR_REST_URL}/info`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_VECTOR_REST_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get index info')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to clear vectors (admin only)
export async function DELETE(request) {
  try {
    const { password, ids } = await request.json()

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!UPSTASH_VECTOR_REST_URL || !UPSTASH_VECTOR_REST_TOKEN) {
      return NextResponse.json(
        { error: 'Vector DB not configured' },
        { status: 500 }
      )
    }

    // If no specific IDs, reset the entire index
    const endpoint = ids && ids.length > 0 
      ? `${UPSTASH_VECTOR_REST_URL}/delete`
      : `${UPSTASH_VECTOR_REST_URL}/reset`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_VECTOR_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: ids && ids.length > 0 ? JSON.stringify({ ids }) : undefined
    })

    if (!response.ok) {
      throw new Error('Failed to delete')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete documents' },
      { status: 500 }
    )
  }
}
