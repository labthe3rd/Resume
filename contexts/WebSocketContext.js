'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const [connected, setConnected] = useState(false)
  const [controlData, setControlData] = useState(null)
  const [tankData, setTankData] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const listenersRef = useRef({ control: [], tank: [] })

  const connect = useCallback(() => {
    // Clear any pending reconnect
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ||
      (isLocal ? 'ws://localhost:3101/ws' : 'wss://api.louisbersine.com/ws')

    console.log('[WebSocket] Connecting to:', wsUrl)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocket] Connected')
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'control') {
          setControlData(data)
          // Notify all control listeners
          listenersRef.current.control.forEach(callback => callback(data))
        } else if (data.type === 'tank') {
          setTankData(data)
          // Notify all tank listeners
          listenersRef.current.tank.forEach(callback => callback(data))
        }
      } catch (e) {
        console.error('[WebSocket] Parse error:', e)
      }
    }

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected')
      setConnected(false)
      wsRef.current = null
      // Reconnect after 2 seconds
      reconnectTimerRef.current = setTimeout(connect, 2000)
    }

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      console.log('[WebSocket] Cleanup')
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const subscribe = useCallback((type, callback) => {
    if (type === 'control') {
      listenersRef.current.control.push(callback)
    } else if (type === 'tank') {
      listenersRef.current.tank.push(callback)
    }

    // Return unsubscribe function
    return () => {
      if (type === 'control') {
        listenersRef.current.control = listenersRef.current.control.filter(cb => cb !== callback)
      } else if (type === 'tank') {
        listenersRef.current.tank = listenersRef.current.tank.filter(cb => cb !== callback)
      }
    }
  }, [])

  const value = {
    connected,
    controlData,
    tankData,
    subscribe
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  return context
}
