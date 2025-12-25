# Louis Bersine - Portfolio Website

A modern, interactive portfolio website built with Next.js 14, featuring:

- 🎨 **Cinematic Dark Mode** with glassmorphism effects
- ✨ **3D Particle Background** using Three.js
- 🎯 **Bento Grid Layout** for skills and projects
- 🎮 **Interactive PLC Playground** demo
- 🤖 **AI Chatbot with RAG** powered by Google Gemini
- 📱 **Fully Responsive** design
- ⚡ **Optimized Performance** for fast loading

## Tech Stack

- **Framework:** Next.js 14
- **Styling:** CSS Variables + Inline Styles
- **Animations:** Framer Motion
- **3D Graphics:** Three.js + React Three Fiber
- **Icons:** Lucide React
- **AI/Chat:** Google Gemini API
- **Vector DB:** Upstash Vector (free tier)
- **Deployment:** Vercel

## Getting Started

### 1. Set Up Upstash Vector (Free)

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a free account
3. Click "Create Database" → Select "Vector"
4. Name it (e.g., "louis-portfolio-rag")
5. Select region closest to you
6. **Important:** Set dimensions to `3072` (required for Gemini embedding model)
7. Copy the `UPSTASH_VECTOR_REST_URL` and `UPSTASH_VECTOR_REST_TOKEN`

### 2. Environment Variables

Create `.env.local` for local development:

```bash
cp .env.example .env.local
```

Fill in the values:
```env
GOOGLE_API_KEY=your_google_gemini_api_key
UPSTASH_VECTOR_REST_URL=https://your-db.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your_token_here
ADMIN_PASSWORD=choose_a_secure_password
```

### 3. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### 4. Deploy to Vercel

#### Option A: Git Repository (Recommended)

1. Push code to GitHub/GitLab
2. Go to [vercel.com](https://vercel.com)
3. Import repository
4. **Add Environment Variables** in project settings:
   - `GOOGLE_API_KEY`
   - `UPSTASH_VECTOR_REST_URL`
   - `UPSTASH_VECTOR_REST_TOKEN`
   - `ADMIN_PASSWORD`
5. Deploy

#### Option B: Vercel CLI

```bash
npm i -g vercel
vercel
# Add env vars when prompted or in dashboard
vercel --prod
```

## RAG Admin Panel

Access the admin panel at `/admin` to upload documents:

1. Navigate to `yoursite.com/admin`
2. Enter your `ADMIN_PASSWORD`
3. Upload text content about yourself
4. The chatbot will use this for enhanced responses

**Security Note:** The admin page is protected by password. The URL is not linked anywhere on the site, but for extra security you could:
- Use a complex password
- Add rate limiting
- Implement IP whitelisting via Vercel middleware

### What to Upload

Upload detailed information like:
- Extended work history details
- Project deep-dives
- Technical blog posts
- Certifications and training
- Personal interests/hobbies
- Anything you want the chatbot to know

## API Key Security

Your API keys are **never exposed** to the client:

1. Keys are stored as environment variables
2. API routes run server-side only
3. Client only communicates with your own `/api/*` endpoints
4. Vercel encrypts environment variables at rest

**Never commit `.env.local` to git!**

## Project Structure

```
├── app/
│   ├── admin/
│   │   └── page.js          # RAG upload admin panel
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.js     # Chat endpoint with RAG
│   │   └── admin/
│   │       └── upload/
│   │           └── route.js # Document upload endpoint
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   ├── Chatbot.js           # AI chat widget
│   ├── Navigation.js
│   ├── Hero.js
│   ├── About.js
│   ├── Skills.js
│   ├── Experience.js
│   ├── Projects.js
│   ├── Playground.js
│   ├── Contact.js
│   ├── Footer.js
│   └── Scene3D.js
├── .env.example
└── package.json
```

## Free Tier Limits

- **Upstash Vector:** 10,000 vectors, 10,000 queries/day
- **Google Gemini:** 15 RPM free tier (plenty for portfolio)
- **Vercel:** 100GB bandwidth, serverless functions included

## License

MIT License
