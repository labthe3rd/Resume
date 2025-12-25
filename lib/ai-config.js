// ===========================================
// AI MODEL CONFIGURATION
// Change models here - no need to edit other files
// ===========================================

export const AI_CONFIG = {
  // -------------------------------------------
  // CHAT MODEL (Google Gemini)
  // -------------------------------------------
  // Free tier options:
  //   - 'gemini-2.5-flash-lite'    (Gemini 2.5 Flash Lite - RECOMMENDED, fast & cheap)
  //   - 'gemini-2.5-flash'         (Gemini 2.5 Flash - more capable)
  //   - 'gemini-2.0-flash'         (Gemini 2.0 Flash)
  //   - 'gemini-2.0-flash-lite'    (Gemini 2.0 Flash Lite - fastest)
  //
  CHAT_MODEL: 'gemini-2.5-flash-lite',

  // -------------------------------------------
  // EMBEDDING MODEL (Google)
  // -------------------------------------------
  // Options:
  //   - 'gemini-embedding-001'     (Stable, recommended - 768/1536/3072 dims)
  //
  EMBEDDING_MODEL: 'gemini-embedding-001',
  
  // Embedding dimensions - MUST match your Upstash Vector database setting
  // gemini-embedding-001 supports: 768, 1536, or 3072
  // Use 768 for good balance of quality and storage
  EMBEDDING_DIMENSIONS: 768,

  // -------------------------------------------
  // CHAT SETTINGS
  // -------------------------------------------
  CHAT_TEMPERATURE: 0.7,        // 0.0 = deterministic, 1.0 = creative
  CHAT_MAX_TOKENS: 1024,        // Max response length
  
  // -------------------------------------------
  // RAG SETTINGS
  // -------------------------------------------
  RAG_TOP_K: 5,                 // Number of chunks to retrieve
  RAG_MIN_SCORE: 0.7,           // Minimum similarity score (0-1)
  RAG_CHUNK_SIZE: 500,          // Characters per chunk
  RAG_CHUNK_OVERLAP: 50,        // Overlap between chunks
}

// API Endpoints
export const GOOGLE_ENDPOINTS = {
  chat: (model, apiKey) => 
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
  embedding: (model, apiKey) => 
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
}
