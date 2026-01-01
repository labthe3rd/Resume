'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const WebSocketContext = createContext(null)

function getBaseUrl() {
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  // IMPORTANT: this should be the HTTP(S) origin, NOT a ws:// URL.
  // Socket.IO will upgrade to WebSocket automatically.
  return (
    process.env.NEXT_PUBLIC_WS_BASE_URL ||
    (isLocal ? 'http://localhost:3101' : 'https://api.louisbersine.com')
  )
}

export function WebSocketProvider({ children }) {
  const [connected, setConnected] = useState(false)

  // Last payloads received (optional cache)
  const [controlData, setControlData] = useState(null)
  const [tankData, setTankData] = useState(null)

  // Socket.IO instance
  const socketRef = useRef(null)

  // Subscription counters (reference-counted feature toggles)
  const subsRef = useRef({ control: 0, tank: 0 })

  // Listener registries
  const listenersRef = useRef({ control: new Set(), tank: new Set() })

  // Whether socket is actually connected
  const isConnectedRef = useRef(false)

  const baseUrl = useMemo(() => getBaseUrl(), [])

  const ensureConnected = useCallback(() => {
    // Only connect when at least one stream is needed.
    const needAny = subsRef.current.control > 0 || subsRef.current.tank > 0
    if (!needAny) return

    if (socketRef.current) return

    const socket = io(baseUrl, {
      path: '/ws',
      transports: ['websocket'],     // force websocket (optional)
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 4000,
      timeout: 6000,
      withCredentials: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      isConnectedRef.current = true
      setConnected(true)

      // Tell edge server what we want right now.
      // This requires edge support (see note below). Harmless if ignored.
      socket.emit('subscribe', {
        control: subsRef.current.control > 0,
        tank: subsRef.current.tank > 0,
      })
    })

    socket.on('disconnect', () => {
      isConnectedRef.current = false
      setConnected(false)
    })

    // Edge server should emit these events (per your updated edge ws):
    socket.on('control', (data) => {
      setControlData(data)
      for (const cb of listenersRef.current.control) cb(data)
    })

    socket.on('tank', (data) => {
      setTankData(data)
      for (const cb of listenersRef.current.tank) cb(data)
    })

    socket.on('connect_error', (err) => {
      // Keep console logging minimal but useful
      console.error('[Socket.IO] connect_error:', err?.message || err)
    })
  }, [baseUrl])

  const maybeDisconnect = useCallback(() => {
    const needAny = subsRef.current.control > 0 || subsRef.current.tank > 0
    if (needAny) {
      // Update subscription intent if already connected
      const s = socketRef.current
      if (s && isConnectedRef.current) {
        s.emit('subscribe', {
          control: subsRef.current.control > 0,
          tank: subsRef.current.tank > 0,
        })
      }
      return
    }

    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
      } catch {}
      socketRef.current = null
      isConnectedRef.current = false
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    // No auto-connect on mount. Connect only when something subscribes.
    return () => {
      // Cleanup on provider unmount
      if (socketRef.current) {
        try {
          socketRef.current.removeAllListeners()
          socketRef.current.disconnect()
        } catch {}
        socketRef.current = null
      }
      isConnectedRef.current = false
      setConnected(false)
      listenersRef.current.control.clear()
      listenersRef.current.tank.clear()
      subsRef.current.control = 0
      subsRef.current.tank = 0
    }
  }, [])

  /**
   * Subscribe to "control" or "tank" stream.
   * This is page-driven: only pages that subscribe will cause the socket to connect.
   */
  const subscribe = useCallback(
    (type, callback) => {
      if (type !== 'control' && type !== 'tank') {
        throw new Error(`subscribe(type): invalid type "${type}"`)
      }

      listenersRef.current[type].add(callback)
      subsRef.current[type] += 1

      // Connect (or update intent) when first subscriber arrives.
      ensureConnected()

      // If already connected, update server about needed streams.
      if (socketRef.current && isConnectedRef.current) {
        socketRef.current.emit('subscribe', {
          control: subsRef.current.control > 0,
          tank: subsRef.current.tank > 0,
        })
      }

      // Return unsubscribe
      return () => {
        listenersRef.current[type].delete(callback)
        subsRef.current[type] = Math.max(0, subsRef.current[type] - 1)

        // If still connected, update intent. If nobody needs anything, disconnect.
        if (socketRef.current && isConnectedRef.current) {
          socketRef.current.emit('subscribe', {
            control: subsRef.current.control > 0,
            tank: subsRef.current.tank > 0,
          })
        }

        maybeDisconnect()
      }
    },
    [ensureConnected, maybeDisconnect]
  )

  const value = useMemo(
    () => ({
      connected,
      controlData,
      tankData,
      subscribe,
    }),
    [connected, controlData, tankData, subscribe]
  )

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) throw new Error('useWebSocket must be used within WebSocketProvider')
  return context
}
