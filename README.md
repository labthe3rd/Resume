# Louis Bersine - Portfolio Website

Modern portfolio website with AI-powered chatbot using RAG (Retrieval-Augmented Generation).

## Features

- 🎨 **Cinematic Dark Mode** with glassmorphism effects
- ✨ **3D Particle Background** using Three.js
- 🎯 **Bento Grid Layout** for skills and projects
- 🎮 **Interactive PLC Playground** demo
- 🤖 **AI Chatbot with RAG** powered by Google Gemini
- 📁 **File Upload Support** - PDF, TXT, MD, CSV, Images (OCR)
- 📱 **Fully Responsive** design

## Tech Stack

- **Framework:** Next.js 14
- **AI:** Google Gemini API (Chat + Embeddings + Vision OCR)
- **Vector DB:** Upstash Vector (free tier)
- **Animations:** Framer Motion
- **3D Graphics:** Three.js + React Three Fiber
- **Deployment:** Vercel

## Setup

### 1. Create Upstash Vector Database

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new **Vector** database (NOT Redis!)
3. Set dimensions to **768**
4. Copy the REST URL and **Read-Write Token** (not read-only!)

### 2. Get Google API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create a new API key

### 3. Set Environment Variables

In Vercel (or `.env.local` for development):

```
GOOGLE_API_KEY=your_google_api_key
UPSTASH_VECTOR_REST_URL=https://xxx.upstash.io
UPSTASH_VECTOR_REST_TOKEN=xxx_read_write_token
ADMIN_PASSWORD=your_secure_password
```

### 4. Deploy

```bash
npm install
npm run build
npm start
```

Or push to GitHub and deploy on Vercel.

## Admin Panel

Access `/admin` with your password to:

- **Upload Files** - Drag & drop or click to browse
- **Manual Text Entry** - Paste text directly
- **Test RAG** - Verify retrieval is working
- **Test Config** - Debug API connections
- **Clear Database** - Reset all vectors

### Supported File Types

| Format | Processing Method |
|--------|-------------------|
| PDF | Gemini AI text extraction |
| TXT, MD | Direct text reading |
| CSV | Parsed to readable format |
| JPG, PNG, GIF, WebP | Gemini Vision OCR |

## Model Configuration

Edit `lib/ai-config.js` to change models:

```javascript
CHAT_MODEL: 'gemini-2.5-flash-lite',     // Chat responses
EMBEDDING_MODEL: 'gemini-embedding-001',  // Vector embeddings
EMBEDDING_DIMENSIONS: 768,                // Must match Upstash DB
```

### Available Chat Models

- `gemini-2.5-flash-lite` - Fast & cheap (recommended)
- `gemini-2.5-flash` - More capable
- `gemini-2.0-flash` - Previous generation
- `gemini-2.0-flash-lite` - Fastest

## API Key Security

Your API keys are **never exposed** to the client:

1. Keys stored as server-side environment variables only
2. All API routes run server-side
3. Client only communicates with `/api/*` endpoints
4. Vercel encrypts environment variables at rest

**Never commit `.env.local` to git!**

## Free Tier Limits

- **Upstash Vector:** 10,000 vectors, 10,000 queries/day
- **Gemini API:** 1,500 requests/day for embeddings
- **Gemini Vision:** Included in Gemini quota
- **Vercel:** 100GB bandwidth, serverless functions included

## License

MIT License
