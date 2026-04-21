'use client'

import { Suspense, useEffect, useState } from 'react'
import { getLiveScreens } from '@/lib/api'
import LiveScoreDisplay from '@/components/LiveScoreDisplay'

interface LiveScreen {
  screenId: string
  screenName: string
  isActive: boolean
  tournamentId: string
  lastUpdate?: string
}

interface TournamentScreens {
  tournamentId: string
  tournamentTitle: string
  liveScreens: LiveScreen[]
}

interface LiveScreensResponse {
  success: boolean
  data: TournamentScreens[]
  error?: string
}

function LiveTournamentsContent() {
  const [liveScreensData, setLiveScreensData] = useState<TournamentScreens[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedScreens, setSelectedScreens] = useState<Set<string>>(new Set())
  const [showScores, setShowScores] = useState(false)

  useEffect(() => {
    const fetchLiveScreens = async () => {
      try {
        setIsLoading(true)
        const data: LiveScreensResponse = await getLiveScreens()
        
        if (data.success) {
          setLiveScreensData(data.data)
          // Select active screens automatically.
          const activeScreenIds = data.data
            .flatMap(tournament => tournament.liveScreens)
            .filter(screen => screen.isActive)
            .map(screen => screen.screenId)
          setSelectedScreens(new Set(activeScreenIds))
        } else {
          setError(data.error || 'Failed to load live screens')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLiveScreens()
    
    // Refresh every 10 seconds.
    const interval = setInterval(fetchLiveScreens, 10000)
    return () => clearInterval(interval)
  }, [])

  const toggleScreen = (screenId: string) => {
    const newSelected = new Set(selectedScreens)
    if (newSelected.has(screenId)) {
      newSelected.delete(screenId)
    } else {
      newSelected.add(screenId)
    }
    setSelectedScreens(newSelected)
  }

  const getSelectedScreens = () => {
    return liveScreensData
      .flatMap(tournament => tournament.liveScreens)
      .filter(screen => selectedScreens.has(screen.screenId))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading live tournaments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (liveScreensData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No live tournaments</h2>
          <p className="text-gray-600">No active screens were found for live score display.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Tournaments</h1>
              <p className="text-sm text-gray-600 mt-1">
                Active screens: {selectedScreens.size} / {liveScreensData.flatMap(t => t.liveScreens).length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live</span>
              </div>
              {selectedScreens.size > 0 && (
                <button
                  onClick={() => setShowScores(!showScores)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {showScores ? 'Hide Scores' : 'Show Scores'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Score Display */}
      {showScores && selectedScreens.size > 0 && (
        <div className="bg-gray-100 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Live Score Display</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {getSelectedScreens().map((screen) => (
                <LiveScoreDisplay
                  key={screen.screenId}
                  screenId={screen.screenId}
                  screenName={screen.screenName}
                  isActive={screen.isActive}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tournament Screens */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {liveScreensData.map((tournament) => (
          <div key={tournament.tournamentId} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              {tournament.tournamentTitle}
              <span className="ml-3 text-sm text-gray-500">
                ({tournament.liveScreens.filter(s => s.isActive).length} active)
              </span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournament.liveScreens.map((screen) => (
                <div
                  key={screen.screenId}
                  className={`bg-white rounded-lg shadow-sm border-2 transition-all cursor-pointer ${
                    selectedScreens.has(screen.screenId)
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${!screen.isActive ? 'opacity-60' : ''}`}
                  onClick={() => screen.isActive && toggleScreen(screen.screenId)}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-gray-900">{screen.screenName}</h3>
                      <div className="flex items-center space-x-2">
                        {screen.isActive && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                        {selectedScreens.has(screen.screenId) && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p>Screen ID: {screen.screenId}</p>
                      {screen.lastUpdate && (
                        <p className="mt-1">
                          Last update: {new Date(screen.lastUpdate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </p>
                      )}
                    </div>
                    
                    {!screen.isActive && (
                      <div className="mt-3 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        Inactive screen
                      </div>
                    )}
                    
                    {selectedScreens.has(screen.screenId) && (
                      <div className="mt-3 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Selected for display
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LiveTournamentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <LiveTournamentsContent />
    </Suspense>
  )
}
