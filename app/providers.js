// file: ./app/providers.js
'use client'

import { WebSocketProvider } from '../contexts/WebSocketContext'

export default function Providers({ children }) {
  return <WebSocketProvider>{children}</WebSocketProvider>
}
