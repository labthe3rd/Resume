import './globals.css'

export const metadata = {
  title: 'Louis Bersine | Controls & OT Expert',
  description: 'Controls Engineer & OT Security Specialist with a decade of experience in industrial automation, PLC programming, and OT network administration.',
  keywords: 'Controls Engineer, OT Security, PLC Programming, Industrial Automation, Rockwell, Siemens, SCADA',
  authors: [{ name: 'Louis Bersine' }],
  openGraph: {
    title: 'Louis Bersine | Controls & OT Expert',
    description: 'Controls Engineer & OT Security Specialist with a decade of experience',
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
        {children}
      </body>
    </html>
  )
}
