import { NextResponse } from 'next/server'
import { AI_CONFIG, GOOGLE_ENDPOINTS } from '../../../../lib/ai-config'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

// Extract text from image using Gemini Vision
async function extractTextFromImage(base64Data, mimeType) {
  const url = GOOGLE_ENDPOINTS.chat(AI_CONFIG.CHAT_MODEL, GOOGLE_API_KEY)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: 'Extract ALL text from this image. Return only the extracted text, nothing else. If there is no text, return "NO_TEXT_FOUND".'
          }
        ]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 4096
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Vision API error: ${error}`)
  }

  const data = await response.json()
  const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  if (extractedText === 'NO_TEXT_FOUND') {
    throw new Error('No text found in image')
  }
  
  return extractedText
}

// Extract text from PDF using Gemini Vision (convert pages to images conceptually)
async function extractTextFromPDF(base64Data) {
  const url = GOOGLE_ENDPOINTS.chat(AI_CONFIG.CHAT_MODEL, GOOGLE_API_KEY)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data
            }
          },
          {
            text: 'Extract ALL text content from this PDF document. Return only the extracted text in a clean, readable format. Preserve paragraph structure. Do not add any commentary or explanations.'
          }
        ]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PDF extraction error: ${error}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Parse CSV to text
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) return ''
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const rows = lines.slice(1)
  
  let result = `CSV Data with columns: ${headers.join(', ')}\n\n`
  
  rows.forEach((row, index) => {
    const values = row.split(',').map(v => v.trim().replace(/"/g, ''))
    result += `Row ${index + 1}: `
    headers.forEach((header, i) => {
      if (values[i]) {
        result += `${header}: ${values[i]}; `
      }
    })
    result += '\n'
  })
  
  return result
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const password = formData.get('password')
    const file = formData.get('file')

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name
    const fileType = file.type
    const fileExt = fileName.split('.').pop().toLowerCase()
    
    let extractedText = ''
    let processingMethod = ''

    // Handle different file types
    if (fileExt === 'txt' || fileExt === 'md') {
      // Plain text files
      extractedText = await file.text()
      processingMethod = 'direct-text'
    } 
    else if (fileExt === 'csv' || fileType === 'text/csv') {
      // CSV files
      const csvText = await file.text()
      extractedText = parseCSV(csvText)
      processingMethod = 'csv-parse'
    }
    else if (fileExt === 'pdf' || fileType === 'application/pdf') {
      // PDF files - use Gemini to extract text
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      extractedText = await extractTextFromPDF(base64)
      processingMethod = 'gemini-pdf-extract'
    }
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) || fileType.startsWith('image/')) {
      // Image files - use Gemini Vision for OCR
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      extractedText = await extractTextFromImage(base64, fileType)
      processingMethod = 'gemini-vision-ocr'
    }
    else {
      return NextResponse.json({ 
        error: `Unsupported file type: ${fileExt}. Supported: txt, md, csv, pdf, jpg, jpeg, png, gif, webp` 
      }, { status: 400 })
    }

    // Clean up extracted text
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json({ 
        error: 'Could not extract meaningful text from file',
        extractedLength: extractedText.length
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      fileName,
      fileType,
      processingMethod,
      textLength: extractedText.length,
      text: extractedText,
      preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
    })

  } catch (error) {
    console.error('File processing error:', error)
    return NextResponse.json({ 
      error: 'Failed to process file', 
      details: error.message 
    }, { status: 500 })
  }
}
