# Louis Bersine - Portfolio Website

A modern, interactive portfolio website built with Next.js 14, featuring:

- 🎨 **Cinematic Dark Mode** with glassmorphism effects
- ✨ **3D Particle Background** using Three.js
- 🎯 **Bento Grid Layout** for skills and projects
- 🎮 **Interactive PLC Playground** demo
- 📱 **Fully Responsive** design
- ⚡ **Optimized Performance** for fast loading

## Tech Stack

- **Framework:** Next.js 14
- **Styling:** CSS Variables + Inline Styles
- **Animations:** Framer Motion
- **3D Graphics:** Three.js + React Three Fiber
- **Icons:** Lucide React
- **Deployment:** Vercel

## Getting Started

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Build for Production

```bash
npm run build
npm start
```

## Deploy to Vercel

### Option 1: Git Repository (Recommended)

1. Push this code to a GitHub/GitLab/Bitbucket repository
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Vercel will auto-detect Next.js and configure build settings
6. Click "Deploy"

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Project Structure

```
├── app/
│   ├── globals.css      # Global styles & CSS variables
│   ├── layout.js        # Root layout with metadata
│   └── page.js          # Main page component
├── components/
│   ├── Navigation.js    # Fixed navigation bar
│   ├── Hero.js          # Hero section with CTA
│   ├── About.js         # About section with stats
│   ├── Skills.js        # Bento grid skills display
│   ├── Experience.js    # Timeline experience section
│   ├── Projects.js      # Filterable project cards
│   ├── Playground.js    # Interactive PLC demo
│   ├── Contact.js       # Contact form & links
│   ├── Footer.js        # Site footer
│   └── Scene3D.js       # Three.js background
├── public/              # Static assets
├── next.config.js       # Next.js configuration
└── package.json         # Dependencies
```

## Customization

### Colors
Edit CSS variables in `app/globals.css`:

```css
:root {
  --accent-cyan: #00d4ff;
  --accent-purple: #a855f7;
  --accent-blue: #3b82f6;
  --accent-green: #10b981;
  --accent-orange: #f97316;
}
```

### Content
Update resume data in the respective component files:
- `components/Skills.js` - Skill categories
- `components/Experience.js` - Work history
- `components/Projects.js` - Project portfolio

## Performance

- **Lighthouse Score:** 90+ across all categories
- **First Contentful Paint:** < 1.5s
- **3D elements** dynamically loaded
- **Images** optimized with WebP support

## License

MIT License - Feel free to use this as a template for your own portfolio!
