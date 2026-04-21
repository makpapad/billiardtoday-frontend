'use client'

import { normalizeWebSocketUrl, useLiveScore } from '@/hooks/useLiveScore'
import { LiveScoreState } from '@/hooks/useLiveScore'

interface LiveScoreDisplayProps {
  screenId: string
  screenName: string
  isActive: boolean
}

const WS_URL = normalizeWebSocketUrl(
  process.env.NEXT_PUBLIC_WS_URL || 'wss://ws.billiardtoday.com/ws'
).toString()
const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || 'BT_WS_RELAY_TOKEN_2025'

function PlayerScore({ player }: { player: any }) {
  return (
    <div className={`flex justify-between items-center p-3 rounded-lg ${
      player.isActive 
        ? 'bg-blue-50 border-2 border-blue-300' 
        : 'bg-gray-50 border border-gray-200'
    }`}>
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${
          player.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`}></div>
        <span className="font-medium text-gray-900">{player.name}</span>
      </div>
      <div className="flex items-center space-x-4">
        {player.innings !== undefined && (
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{player.innings}</div>
            <div className="text-xs text-gray-500">Innings</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{player.score}</div>
          <div className="text-xs text-gray-500">Score</div>
        </div>
      </div>
    </div>
  )
}

export default function LiveScoreDisplay({ screenId, screenName, isActive }: LiveScoreDisplayProps) {
  const { isConnected, lastUpdate, players, error, reconnect } = useLiveScore({ 
    screenId,
    wsUrl: WS_URL,
    token: WS_TOKEN
  })

  if (!isActive) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">{screenName}</div>
          <div className="text-sm">This screen is not active</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">{screenName}</h3>
            <p className="text-sm text-gray-300">Screen ID: {screenId}</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-sm">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="border-b border-gray-200 p-3 bg-gray-50">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-4">
            <span className={`font-medium ${
              isConnected ? 'text-green-600' : 'text-red-600'
            }`}>
              {isConnected ? 'Live Connection' : 'No Connection'}
            </span>
            {lastUpdate && (
              <span className="text-gray-500">
                Last update: {new Date(lastUpdate).toLocaleTimeString('el-GR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
            )}
          </div>
          {!isConnected && (
            <button
              onClick={reconnect}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Reconnect
            </button>
          )}
        </div>
        {error && (
          <div className="mt-2 text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Players Score */}
      <div className="p-4">
        {players.length > 0 ? (
          <div className="space-y-3">
            {players.map((player, index) => (
              <PlayerScore key={player.id || index} player={player} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg font-medium mb-2">Waiting for score data...</div>
            <div className="text-sm">
              {isConnected 
                ? 'Connected, waiting for updates from scoreboard'
                : 'Please check WebSocket connection'
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
