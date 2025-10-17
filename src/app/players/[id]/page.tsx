'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Player = {
    id: number
    documentId: string
    full_name: string
    country: string | null
}

type Match = {
    id: string
    opponent: string
    opponentId: string | null
    result: 'win' | 'loss'
    scoreFor: number
    scoreAgainst: number
    date: string
    stage: string
    innings: number
}

type TournamentParticipation = {
    id: string
    tournament: string
    year: number
    position: string
    matches: Match[]
    totalMatches: number
    wins: number
    losses: number
    totalPoints: number
    avgPerInning: number
    highestRun: number
}

export default function PlayerProfilePage() {
    const params = useParams()
    const router = useRouter()
    const playerId = params?.id as string

    const [player, setPlayer] = useState<Player | null>(null)
    const [participations, setParticipations] = useState<TournamentParticipation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedYear, setSelectedYear] = useState<string>('all')
    const [availableYears, setAvailableYears] = useState<number[]>([])
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
    const [yearsToShow, setYearsToShow] = useState(3) // Show last 3 years initially
    const [hasMoreYears, setHasMoreYears] = useState(false)
    const [tournamentsToShow, setTournamentsToShow] = useState(3) // Show first 3 tournaments per year
    const [hasMoreTournaments, setHasMoreTournaments] = useState(false)
    const [careerStats, setCareerStats] = useState<{
        totalMatches: number
        totalWins: number
        totalLosses: number
        winPercentage: string
        avgPerInning: string
        highestRun: number
    } | null>(null)
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    const buildApiUrl = (path: string) => `${basePath}${path}`

    useEffect(() => {
        const fetchPlayerData = async () => {
            if (!playerId) return

            // Only show full loading on first load
            if (!player) {
                setIsLoading(true)
            } else {
                setIsLoadingHistory(true)
            }
            setError(null)
            
            try {
                const params = new URLSearchParams()
                params.set('filters[documentId][$eq]', playerId)
                params.set('pagination[pageSize]', '1')

                // Build history URL with pagination
                let historyPath = `/api/players/${playerId}/history`
                const historyParams = new URLSearchParams()
                
                if (selectedYear !== 'all') {
                    historyParams.set('year', selectedYear)
                    // Don't limit - fetch all events for the year (usually 5-20)
                    // We'll paginate on frontend
                } else {
                    // Fetch limited events for initial load - reduced for faster response
                    historyParams.set('limit', '10') // Start with just 10 most recent tournaments
                }
                
                if (historyParams.toString()) {
                    historyPath += `?${historyParams.toString()}`
                }

                // Fetch ALL data in parallel for maximum speed
                const fetchPromises = [
                    fetch(buildApiUrl(`/api/admin/tournament/players?${params.toString()}`)),
                    fetch(buildApiUrl(historyPath))
                ]
                
                // Fetch years on first load only
                if (availableYears.length === 0) {
                    fetchPromises.push(fetch(buildApiUrl(`/api/players/${playerId}/years`)))
                }
                
                const responses = await Promise.all(fetchPromises)
                const [playerResponse, historyResponse, yearsResponse] = responses

                // Process player data immediately
                if (playerResponse.ok) {
                    const data = await playerResponse.json()
                    if (data.data && data.data.length > 0) {
                        const playerData = data.data[0]
                        setPlayer(playerData)
                        
                        // Set career stats from player.career_stats (pre-calculated in DB)
                        if (playerData.career_stats) {
                            setCareerStats(playerData.career_stats)
                        }
                        
                        setIsLoading(false) // Show player info immediately
                    } else {
                        setError('Ο παίκτης δεν βρέθηκε')
                    }
                } else {
                    setError('Αποτυχία φόρτωσης δεδομένων')
                }

                // Process history data
                if (historyResponse.ok) {
                    const historyData = await historyResponse.json()
                    setParticipations(historyData)
                    
                    if (selectedYear === 'all') {
                        // Check if there are more years to load
                        const yearSet = new Set<number>(historyData.map((p: { year: number }) => p.year))
                        const loadedYears = Array.from(yearSet)
                        setHasMoreYears(loadedYears.length >= yearsToShow)
                        setHasMoreTournaments(false)
                    } else {
                        // Check if there are more tournaments for this specific year (frontend pagination)
                        setHasMoreTournaments(historyData.length > tournamentsToShow)
                        setHasMoreYears(false)
                    }
                } else {
                    console.error('Failed to fetch history')
                    setParticipations([])
                }
                
                // Process years data (only on first load)
                if (yearsResponse && yearsResponse.ok) {
                    const yearsData = await yearsResponse.json()
                    setAvailableYears(yearsData)
                }
                
                setIsLoadingHistory(false)
            } catch (err) {
                setError('Σφάλμα σύνδεσης')
                console.error('Failed to fetch player data:', err)
            } finally {
                setIsLoading(false)
                setIsLoadingHistory(false)
            }
        }

        fetchPlayerData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerId, selectedYear, yearsToShow, tournamentsToShow])
    
    const loadMoreYears = () => {
        setYearsToShow(prev => prev + 3) // Load 3 more years
    }
    
    const loadMoreTournaments = () => {
        setTournamentsToShow(prev => prev + 3) // Load 3 more tournaments
    }
    
    // Reset tournament pagination when year changes
    const handleYearChange = (year: string) => {
        setSelectedYear(year)
        setTournamentsToShow(3) // Reset to 3 when changing year
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Φόρτωση...</p>
                </div>
            </div>
        )
    }

    if (error || !player) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 dark:text-red-400 text-xl mb-4">{error || 'Παίκτης δεν βρέθηκε'}</div>
                    <button
                        onClick={() => router.push('/players')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Επιστροφή στους Παίκτες
                    </button>
                </div>
            </div>
        )
    }

    // Use career stats from API (all-time stats)
    const overallMatches = careerStats?.totalMatches || 0
    const overallWins = careerStats?.totalWins || 0
    const overallLosses = careerStats?.totalLosses || 0
    const overallWinPercentage = careerStats?.winPercentage || '0.0'
    const overallAvg = careerStats?.avgPerInning || '0,000'
    const overallHighestRun = careerStats?.highestRun || 0
    
    // Frontend pagination for specific year
    const displayedParticipations = selectedYear !== 'all' 
        ? participations.slice(0, tournamentsToShow)
        : participations

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/players')}
                    className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Επιστροφή
                </button>

                {/* Player Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6">
                        {/* Avatar */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl sm:text-3xl md:text-4xl font-bold flex-shrink-0">
                            {player.full_name.charAt(0).toUpperCase()}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4 truncate">
                                {player.full_name}
                            </h1>
                            {player.country && (
                                <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                    <span className="text-base sm:text-lg">🌍</span>
                                    <span className="truncate">{player.country}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards - Lazy Loaded */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-6 md:mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4">
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">Αγώνες</div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {careerStats ? overallMatches : <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-12 rounded"></div>}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4">
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">Νίκες</div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
                            {careerStats ? overallWins : <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-12 rounded"></div>}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4">
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">Ήττες</div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">
                            {careerStats ? overallLosses : <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-12 rounded"></div>}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4">
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">Win %</div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {careerStats ? `${overallWinPercentage}%` : <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4">
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">AVG</div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {careerStats ? overallAvg : <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4">
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">H.R.</div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {careerStats ? overallHighestRun : <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-12 rounded"></div>}
                        </div>
                    </div>
                </div>

                {/* Tournament History */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                            Ιστορικό Τουρνουά
                            {isLoadingHistory && (
                                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            )}
                        </h2>
                        
                        {/* Year Filter */}
                        {availableYears.length > 0 && (
                            <select
                                value={selectedYear}
                                onChange={(e) => handleYearChange(e.target.value)}
                                disabled={isLoadingHistory}
                                className="px-4 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="all">Επιλογή έτους</option>
                                {availableYears.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {isLoadingHistory && participations.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-300">Φόρτωση ιστορικού...</p>
                        </div>
                    ) : participations.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            Δεν υπάρχουν συμμετοχές σε τουρνουά
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {displayedParticipations.map((participation) => (
                                <div
                                    key={participation.id}
                                    className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                                >
                                    {/* Tournament Header */}
                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-2xl font-bold">
                                                    {participation.tournament}
                                                </h3>
                                                <p className="text-blue-100">{participation.year}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-bold">
                                                    {participation.position}
                                                </div>
                                                <div className="text-sm text-blue-100">Τελική Θέση</div>
                                            </div>
                                        </div>

                                        {/* Tournament Stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center bg-white/10 rounded-lg p-4">
                                            <div>
                                                <div className="text-2xl font-bold">{participation.totalMatches}</div>
                                                <div className="text-xs text-blue-100">Αγώνες</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-green-300">{participation.wins}</div>
                                                <div className="text-xs text-blue-100">Νίκες</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-red-300">{participation.losses}</div>
                                                <div className="text-xs text-blue-100">Ήττες</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-yellow-300">{participation.avgPerInning.toFixed(3)}</div>
                                                <div className="text-xs text-blue-100">AVG</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-orange-300">{participation.highestRun}</div>
                                                <div className="text-xs text-blue-100">H.R.</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Matches List */}
                                    <div className="p-6 bg-white dark:bg-gray-800">
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                            Αναλυτικά Αποτελέσματα ({participation.matches.length} αγώνες)
                                        </h4>
                                        <div className="space-y-3">
                                            {participation.matches.map((match) => (
                                                <div
                                                    key={match.id}
                                                    className={`border-2 rounded-lg p-4 transition-all ${
                                                        match.result === 'win'
                                                            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                                            : match.scoreFor === match.scoreAgainst
                                                            ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                                                            : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                                    match.result === 'win'
                                                                        ? 'bg-green-600 text-white'
                                                                        : match.scoreFor === match.scoreAgainst
                                                                        ? 'bg-yellow-600 text-white'
                                                                        : 'bg-red-600 text-white'
                                                                }`}>
                                                                    {match.result === 'win' ? 'ΝΙΚΗ' : match.scoreFor === match.scoreAgainst ? 'ΙΣΟΠΑΛΙΑ' : 'ΗΤΤΑ'}
                                                                </span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {match.stage}
                                                                </span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {new Date(match.date).toLocaleDateString('el-GR')}
                                                                </span>
                                                            </div>
                                                            <div className="text-base font-semibold">
                                                                vs {match.opponentId ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => router.push(`/players/${match.opponentId}`)}
                                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                                                                    >
                                                                        {match.opponent}
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-gray-900 dark:text-white">{match.opponent}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-2xl font-bold ${
                                                                match.scoreFor === match.scoreAgainst
                                                                    ? 'text-yellow-600 dark:text-yellow-400'
                                                                    : 'text-gray-900 dark:text-white'
                                                            }`}>
                                                                {match.scoreFor} - {match.scoreAgainst}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedMatch(match)}
                                                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                                                            >
                                                                Match #{match.id.replace('M', '')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Load More Buttons */}
                    {!isLoadingHistory && (
                        <>
                            {/* Load More Years (for "all" filter) */}
                            {selectedYear === 'all' && hasMoreYears && (
                                <div className="mt-6 text-center">
                                    <button
                                        type="button"
                                        onClick={loadMoreYears}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-medium flex items-center gap-2 mx-auto"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-4-4m4 4l4-4" />
                                        </svg>
                                        Φόρτωση Προηγούμενων Ετών
                                    </button>
                                </div>
                            )}
                            
                            {/* Load More Tournaments (for specific year) */}
                            {selectedYear !== 'all' && hasMoreTournaments && (
                                <div className="mt-6 text-center">
                                    <button
                                        type="button"
                                        onClick={loadMoreTournaments}
                                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl font-medium flex items-center gap-2 mx-auto"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-4-4m4 4l4-4" />
                                        </svg>
                                        Φόρτωση Περισσότερων Τουρνουά ({selectedYear})
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Note about data */}
                <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>💡 Τα δεδομένα τουρνουά ενημερώνονται αυτόματα από τη βάση</p>
                </div>
            </div>

            {/* Match Details Modal */}
            {selectedMatch && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setSelectedMatch(null)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 animate-slideUp"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Match #{selectedMatch.id.replace('M', '')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(selectedMatch.date).toLocaleDateString('el-GR', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedMatch(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Match Result Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6 ${
                            selectedMatch.result === 'win'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : selectedMatch.scoreFor === selectedMatch.scoreAgainst
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                            {selectedMatch.result === 'win' ? '🏆 ΝΙΚΗ' : selectedMatch.scoreFor === selectedMatch.scoreAgainst ? '⚖️ ΙΣΟΠΑΛΙΑ' : '❌ ΗΤΤΑ'}
                        </div>

                        {/* Stage Info */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
                            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                {selectedMatch.stage}
                            </div>
                        </div>

                        {/* Players & Score */}
                        <div className="grid grid-cols-3 gap-4 items-center mb-6">
                            <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {player?.full_name}
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                                        {selectedMatch.scoreFor}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">AVG</div>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {(selectedMatch.scoreFor / selectedMatch.innings).toFixed(3).replace('.', ',')}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-400 dark:text-gray-500 mb-2">
                                    VS
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Στέκιες</div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {selectedMatch.innings}
                                </div>
                            </div>
                            
                            <div className="text-center">
                                <div className="text-lg font-semibold mb-2">
                                    {selectedMatch.opponentId ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedMatch(null)
                                                router.push(`/players/${selectedMatch.opponentId}`)
                                            }}
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                                        >
                                            {selectedMatch.opponent}
                                        </button>
                                    ) : (
                                        <span className="text-gray-900 dark:text-white">{selectedMatch.opponent}</span>
                                    )}
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className={`text-4xl font-bold mb-1 ${
                                        selectedMatch.scoreFor === selectedMatch.scoreAgainst
                                            ? 'text-yellow-600 dark:text-yellow-400'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {selectedMatch.scoreAgainst}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">AVG</div>
                                    <div className={`text-2xl font-bold ${
                                        selectedMatch.scoreFor === selectedMatch.scoreAgainst
                                            ? 'text-yellow-600 dark:text-yellow-400'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {(selectedMatch.scoreAgainst / selectedMatch.innings).toFixed(3).replace('.', ',')}
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Close Button */}
                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedMatch(null)}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Κλείσιμο
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
