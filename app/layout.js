// file: ./app/layout.js (modified)
// Updated metadata to reflect your authority as an OT Infrastructure & Controls Architect
// and align with the streamlined, modern design. Includes the noise and gradient blobs
// defined in globals.css for subtle depth effects.

import './globals.css'
import Providers from './providers'

export const metadata = {
  title: 'Louis Bersine | OT Infrastructure & Controls Architect',
  description:
    'OT Infrastructure & Controls Architect specializing in brownfield network stabilization, cyber‑aligned governance and high‑availability manufacturing systems.',
  keywords: 'OT infrastructure, Controls Architect, industrial automation, OT governance, deterministic control, risk mitigation, Rockwell, SCADA',
  authors: [{ name: 'Louis Bersine' }],
  openGraph: {
    title: 'Louis Bersine | OT Infrastructure & Controls Architect',
    description: 'Architecting high‑availability OT environments and de‑risking industrial networks.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="noise-overlay" />
        <div className="gradient-blob blob-1" />
        <div className="gradient-blob blob-2" />
        <div className="gradient-blob blob-3" />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}