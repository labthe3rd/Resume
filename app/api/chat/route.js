import { NextResponse } from 'next/server'
import { AI_CONFIG, GOOGLE_ENDPOINTS } from '../../../lib/ai-config'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const UPSTASH_VECTOR_REST_URL = process.env.UPSTASH_VECTOR_REST_URL
const UPSTASH_VECTOR_REST_TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN

// Base context about Louis - always included
const BASE_CONTEXT = `
You are an AI assistant on Louis Bersine's portfolio website. You help visitors learn about Louis's professional background, skills, and experience.

Core Information:
- Louis Bersine is a Controls Engineer & OT Security Specialist
- Education: BSEE from Michigan Technological University, Class of 2015
- Current Role: Controls Engineer at Kellanova (Kellogg) in Grand Rapids, MI since Dec 2023
- Email: Labthe3rd@gmail.com
- LinkedIn: louis-bersine-iii
- Website: louisbersine.com

Skills:
- Controls Engineering: Studio 5000, RSLogix 500, FTView ME/SE, FT Assetcentre, Osisoft PI, Ignition, Kepware, Siemens S7
- Robotics: Fanuc, IAI Robots, Denso Robots
- Drives: Kinnetix, Powerflex
- Vision: Keyence Vision, Cognex Vision
- OT/Networking: TCP/IP, PTP, NTP, EIP, Canbus, VPNs, Firewalls, Active Directory, Claroty
- Programming: Python, PowerShell, C#, C++, JavaScript, VBA, AutoLISP, Batch, Bash, Power Automate

Work History:
1. Kellanova/Kellogg (Dec 2023 - Present): Managing controls infrastructure on OT Network, equipment upgrades
2. Proficient Machine & Automation (Sep 2019 - Sep 2023): AutoCAD Electrical drawings, PLC programming, commissioning
3. Roman Manufacturing (Aug 2018 - Sep 2019): Project management, metal refinery modernization
4. Altron Automation (Dec 2016 - Aug 2018): Robotic cell design, automotive assembly systems

Notable Projects:
- PTP Master Clock Recovery: Diagnosed and fixed line downtime caused by PLC sending PTP messages, completed in one shift
- OT System Overhaul: Restored OPC communication, created disaster recovery, automated backups, full documentation
- Guard Link Safety System: Saved $170,000 by implementing safety upgrade internally vs $200k contractor quote
- VR Theatrical Performance: Built autonomous VR system with AI-generated dialog for Dennison University

Be helpful, professional, and concise. If asked about something not in your knowledge, say you don't have that specific information and suggest contacting Louis directly.
`

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
    console.error('Embedding error:', await response.text())
    return null
  }
  
  const data = await response.json()
  return data.embedding?.values || null
}

async function queryVectorDB(embedding) {
  if (!UPSTASH_VECTOR_REST_URL || !UPSTASH_VECTOR_REST_TOKEN) {
    return []
  }

  try {
    const response = await fetch(`${UPSTASH_VECTOR_REST_URL}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_VECTOR_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector: embedding,
        topK: AI_CONFIG.RAG_TOP_K,
        includeMetadata: true
      })
    })

    if (!response.ok) {
      console.error('Vector query error:', await response.text())
      return []
    }

    const data = await response.json()
    return data.result || []
  } catch (error) {
    console.error('Vector DB error:', error)
    return []
  }
}

async function chat(message, context) {
  const url = GOOGLE_ENDPOINTS.chat(AI_CONFIG.CHAT_MODEL, GOOGLE_API_KEY)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${context}\n\nUser Question: ${message}` }]
        }
      ],
      generationConfig: {
        temperature: AI_CONFIG.CHAT_TEMPERATURE,
        maxOutputTokens: AI_CONFIG.CHAT_MAX_TOKENS
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Gemini error:', error)
    throw new Error('Failed to generate response')
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'
}

export async function POST(request) {
  try {
    if (!GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'API not configured' },
        { status: 500 }
      )
    }

    const { message, debug } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get embedding for the user's message
    const embedding = await getEmbedding(message)
    
    // Query vector DB for relevant context
    let ragContext = ''
    let ragDebug = { embeddingGenerated: !!embedding, resultsFound: 0, chunks: [] }
    
    if (embedding) {
      const results = await queryVectorDB(embedding)
      ragDebug.resultsFound = results.length
      
      if (results.length > 0) {
        const relevantResults = results.filter(r => r.score > AI_CONFIG.RAG_MIN_SCORE)
        ragDebug.relevantResults = relevantResults.length
        ragDebug.chunks = relevantResults.map(r => ({
          score: r.score,
          preview: (r.metadata?.text || '').substring(0, 100) + '...',
          title: r.metadata?.title
        }))
        
        ragContext = '\n\nAdditional Context from Knowledge Base:\n' +
          relevantResults
            .map(r => r.metadata?.text || '')
            .join('\n\n')
      }
    }

    // Combine base context with RAG context
    const fullContext = BASE_CONTEXT + ragContext

    // Generate response
    const response = await chat(message, fullContext)

    // Include debug info if requested
    if (debug) {
      return NextResponse.json({ response, ragDebug })
    }

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
