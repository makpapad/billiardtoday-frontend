'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface ScoreUpdate {
  type: 'score:update'
  screenId: string
  players: Array<{
    id: string
    name: string
    score: number
    innings?: number
    isActive?: boolean
  }>
  timestamp?: string
}

export interface LiveScoreState {
  screenId: string
  isConnected: boolean
  lastUpdate: string | null
  players: ScoreUpdate['players']
  error: string | null
}

interface UseLiveScoreOptions {
  screenId: string
  wsUrl?: string
  token?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useLiveScore({
  screenId,
  wsUrl = 'wss://ws.billiardtoday.com',
  token = '',
  reconnectInterval = 3000,
  maxReconnectAttempts = 5
}: UseLiveScoreOptions) {
  const [state, setState] = useState<LiveScoreState>({
    screenId,
    isConnected: false,
    lastUpdate: null,
    players: [],
    error: null
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const url = new URL(wsUrl)
      if (token) {
        url.searchParams.set('token', token)
      }
      url.searchParams.set('screenId', screenId)

      console.log('[LiveScore] Connecting to:', url.toString())
      
      wsRef.current = new WebSocket(url.toString())

      wsRef.current.onopen = () => {
        console.log(`[LiveScore] Connected to screen ${screenId}`)
        setState(prev => ({
          ...prev,
          isConnected: true,
          error: null
        }))
        reconnectAttemptsRef.current = 0
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data: ScoreUpdate = JSON.parse(event.data.toString())
          
          if (data.type === 'score:update' && data.screenId === screenId) {
            setState(prev => ({
              ...prev,
              lastUpdate: data.timestamp || new Date().toISOString(),
              players: data.players || [],
              error: null
            }))
          }
        } catch (error) {
          console.error('[LiveScore] Failed to parse message:', error)
          setState(prev => ({
            ...prev,
            error: 'Failed to parse score update'
          }))
        }
      }

      wsRef.current.onclose = (event) => {
        console.log(`[LiveScore] Disconnected from screen ${screenId}:`, event.code, event.reason)
        setState(prev => ({
          ...prev,
          isConnected: false
        }))

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`[LiveScore] Reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else {
          setState(prev => ({
            ...prev,
            error: 'Max reconnection attempts reached'
          }))
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('[LiveScore] WebSocket error:', error)
        console.error('[LiveScore] WebSocket readyState:', wsRef.current?.readyState)
        console.error('[LiveScore] WebSocket URL:', wsUrl)
        console.error('[LiveScore] Screen ID:', screenId)
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error'
        }))
      }

    } catch (error) {
      console.error('[LiveScore] Failed to create WebSocket connection:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection'
      }))
    }
  }, [screenId, wsUrl, token, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      error: null
    }))
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectAttemptsRef.current = 0
    connect()
  }, [disconnect, connect])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    ...state,
    reconnect,
    disconnect
  }
}

// Hook για πολλαπλές οθόνες ταυτόχρονα
export function useMultipleLiveScores(screenIds: string[], options?: Omit<UseLiveScoreOptions, 'screenId'>) {
  const [scores, setScores] = useState<Record<string, LiveScoreState>>(() => 
    screenIds.reduce((acc: Record<string, LiveScoreState>, screenId: string) => ({
      ...acc,
      [screenId]: {
        screenId,
        isConnected: false,
        lastUpdate: null,
        players: [],
        error: null
      }
    }), {})
  )

  const updateScore = useCallback((screenId: string, newState: Partial<LiveScoreState>) => {
    setScores(prev => ({
      ...prev,
      [screenId]: {
        ...prev[screenId],
        ...newState
      }
    }))
  }, [])

  useEffect(() => {
    const hooks = screenIds.map(screenId => {
      const scoreState = useLiveScore({ screenId, ...options })
      
      // Update the combined state when individual screen state changes
      Object.keys(scoreState).forEach(key => {
        if (key !== 'reconnect' && key !== 'disconnect') {
          updateScore(screenId, { [key]: (scoreState as any)[key] })
        }
      })

      return scoreState
    })

    return () => {
      // Cleanup handled by individual hooks
    }
  }, [screenIds, options, updateScore])

  // For now, return a simplified version - the full implementation would need
  // more complex state management for multiple WebSocket connections
  return {
    scores,
    reconnectAll: () => {},
    disconnectAll: () => {},
    isConnected: Object.values(scores).some(s => s.isConnected),
    activeScreens: Object.values(scores).filter(s => s.isConnected).length
  }
}
