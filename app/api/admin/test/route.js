import { NextResponse } from 'next/server'
import { AI_CONFIG, GOOGLE_ENDPOINTS } from '../../../../lib/ai-config'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const UPSTASH_VECTOR_REST_URL = process.env.UPSTASH_VECTOR_REST_URL
const UPSTASH_VECTOR_REST_TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export async function POST(request) {
  try {
    const { password } = await request.json()

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      config: {
        hasGoogleKey: !!GOOGLE_API_KEY,
        googleKeyPrefix: GOOGLE_API_KEY ? GOOGLE_API_KEY.substring(0, 10) + '...' : null,
        hasUpstashUrl: !!UPSTASH_VECTOR_REST_URL,
        upstashUrlPrefix: UPSTASH_VECTOR_REST_URL ? UPSTASH_VECTOR_REST_URL.substring(0, 30) + '...' : null,
        hasUpstashToken: !!UPSTASH_VECTOR_REST_TOKEN,
        hasAdminPassword: !!ADMIN_PASSWORD
      },
      models: {
        chat: AI_CONFIG.CHAT_MODEL,
        embedding: AI_CONFIG.EMBEDDING_MODEL,
        embeddingDimensions: AI_CONFIG.EMBEDDING_DIMENSIONS
      },
      tests: {}
    }

    // Test Google Embedding API
    try {
      const embeddingUrl = GOOGLE_ENDPOINTS.embedding(AI_CONFIG.EMBEDDING_MODEL, GOOGLE_API_KEY)
      const embeddingResponse = await fetch(embeddingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${AI_CONFIG.EMBEDDING_MODEL}`,
          content: { parts: [{ text: 'test embedding' }] },
          outputDimensionality: AI_CONFIG.EMBEDDING_DIMENSIONS
        })
      })
      
      if (embeddingResponse.ok) {
        const data = await embeddingResponse.json()
        results.tests.googleEmbedding = {
          success: true,
          model: AI_CONFIG.EMBEDDING_MODEL,
          dimensions: data.embedding?.values?.length || 0
        }
      } else {
        const errorText = await embeddingResponse.text()
        results.tests.googleEmbedding = {
          success: false,
          model: AI_CONFIG.EMBEDDING_MODEL,
          status: embeddingResponse.status,
          error: errorText
        }
      }
    } catch (e) {
      results.tests.googleEmbedding = { success: false, model: AI_CONFIG.EMBEDDING_MODEL, error: e.message }
    }

    // Test Google Chat API
    try {
      const chatUrl = GOOGLE_ENDPOINTS.chat(AI_CONFIG.CHAT_MODEL, GOOGLE_API_KEY)
      const chatResponse = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Say "test successful" in 3 words or less' }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 20 }
        })
      })
      
      if (chatResponse.ok) {
        const data = await chatResponse.json()
        results.tests.googleChat = {
          success: true,
          model: AI_CONFIG.CHAT_MODEL,
          response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'no response'
        }
      } else {
        const errorText = await chatResponse.text()
        results.tests.googleChat = {
          success: false,
          model: AI_CONFIG.CHAT_MODEL,
          status: chatResponse.status,
          error: errorText
        }
      }
    } catch (e) {
      results.tests.googleChat = { success: false, model: AI_CONFIG.CHAT_MODEL, error: e.message }
    }

    // Test Upstash Vector - get info
    try {
      const infoResponse = await fetch(`${UPSTASH_VECTOR_REST_URL}/info`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_VECTOR_REST_TOKEN}`
        }
      })

      if (infoResponse.ok) {
        const data = await infoResponse.json()
        
        // Upstash Vector returns an object, not a string like Redis
        // Check for vector database specific fields
        if (data.result && typeof data.result === 'object') {
          // This is a proper Vector database
          results.tests.upstashVector = {
            success: true,
            vectorCount: data.result.vectorCount ?? data.result.vector_count ?? 0,
            dimension: data.result.dimension ?? AI_CONFIG.EMBEDDING_DIMENSIONS,
            expectedDimension: AI_CONFIG.EMBEDDING_DIMENSIONS,
            dimensionMatch: (data.result.dimension ?? AI_CONFIG.EMBEDDING_DIMENSIONS) === AI_CONFIG.EMBEDDING_DIMENSIONS,
            namespaceCount: data.result.namespaceCount ?? 1,
            raw: data.result
          }
        } else if (typeof data.result === 'string' && data.result.includes('redis_version')) {
          // This is a Redis database, not Vector
          results.tests.upstashVector = {
            success: false,
            error: 'WRONG DATABASE TYPE: This is a Redis database. You need an Upstash VECTOR database. Go to console.upstash.com and create a Vector database with 768 dimensions.',
            isRedisNotVector: true
          }
        } else {
          // Unknown format - show raw data for debugging
          results.tests.upstashVector = {
            success: true,
            note: 'Response format unclear, showing raw data',
            raw: data
          }
        }
      } else {
        const errorText = await infoResponse.text()
        results.tests.upstashVector = {
          success: false,
          status: infoResponse.status,
          error: errorText
        }
      }
    } catch (e) {
      results.tests.upstashVector = { success: false, error: e.message }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
