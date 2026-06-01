'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { normalizeKeyboardMode, type KeyboardMode } from '@/lib/keyboardModes'

export interface ScoreUpdate {
  type: 'score:update'
  screenId: string
  activePlayer?: 1 | 2
  keyboardMode?: KeyboardMode
  tableName?: string | null
  tableNumber?: string | null
  ts?: number
  players: Array<{
    id: string
    name: string
    score?: number
    points?: number
    run?: number
    innings?: number
    isActive?: boolean
  }>
  timestamp?: string
}

export interface LiveScoreState {
  screenId: string
  isConnected: boolean
  lastUpdate: string | null
  keyboardMode: ScoreUpdate['keyboardMode'] | null
  tableName: string | null
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

export function normalizeWebSocketUrl(rawUrl: string) {
  const url = new URL(rawUrl)

  if (url.pathname === '/' || url.pathname === '') {
    url.pathname = '/ws'
  }

  return url
}

export function useLiveScore({
  screenId,
  wsUrl = 'wss://ws.billiardtoday.com/ws',
  token = '',
  reconnectInterval = 3000,
  maxReconnectAttempts = 5
}: UseLiveScoreOptions) {
  const [state, setState] = useState<LiveScoreState>({
    screenId,
    isConnected: false,
    lastUpdate: null,
    keyboardMode: null,
    tableName: null,
    players: [],
    error: null
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const normalizePlayers = useCallback((data: ScoreUpdate) => {
    const activePlayer = data.activePlayer === 2 ? 2 : 1

    return Array.isArray(data.players)
      ? data.players.map((player, index) => ({
          ...player,
          score:
            typeof player.score === 'number'
              ? player.score
              : typeof player.points === 'number'
                ? player.points
                : 0,
          isActive:
            typeof player.isActive === 'boolean'
              ? player.isActive
              : activePlayer === index + 1,
        }))
      : []
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const url = normalizeWebSocketUrl(wsUrl)
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
              lastUpdate:
                data.timestamp ||
                (typeof data.ts === 'number'
                  ? new Date(data.ts).toISOString()
                  : new Date().toISOString()),
              keyboardMode: normalizeKeyboardMode(data.keyboardMode) ?? prev.keyboardMode,
              tableName:
                typeof data.tableName === 'string' && data.tableName.trim().length > 0
                  ? data.tableName.trim()
                  : prev.tableName,
              players: normalizePlayers(data),
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
  }, [screenId, wsUrl, token, reconnectInterval, maxReconnectAttempts, normalizePlayers])

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
        keyboardMode: null,
        tableName: null,
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
