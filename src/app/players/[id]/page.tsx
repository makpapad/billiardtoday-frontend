"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { getCountryFlagPath } from "@/lib/countryFlags"
import { getGameTypeLabel, type GameType } from "@/lib/gameTypes"
import { t } from "@/lib/i18n"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"

type Player = {
    id: number
    documentId: string
    full_name: string
    country: string | null
    city: string | null
    date_of_birth: string | null
    email: string | null
    phone_main: string | null
    photo_main?:
        | {
              url: string
          }
        | {
              data: {
                  attributes: {
                      url: string
                  }
              }
          }
        | null
}

// Helper function to get photo URL from different Strapi structures
const getPhotoUrl = (photo: Player['photo_main']): string | null => {
    if (!photo) return null

    let url: string | null = null

    // Check if it's the direct structure with url
    if ('url' in photo && typeof photo.url === 'string') {
        url = photo.url
    }
    // Check if it's the Strapi v4 structure with data.attributes
    else if ('data' in photo && photo.data?.attributes?.url) {
        url = photo.data.attributes.url
    }

    if (!url) return null

    // If URL is relative (starts with /uploads), prepend Strapi base URL
    if (url.startsWith('/uploads')) {
        const strapiBase =
            process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
        return `${strapiBase}${url}`
    }

    return url
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
    highRun?: number
}

type TournamentParticipation = {
    id: string
    tournament: string
    year: number
    position: string
    gameType?: GameType
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
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathParam = params?.id as string
    const queryId = searchParams.get('id')
    const playerId = (queryId ?? (pathParam ? pathParam.split('-')[0] : '')) as string

    const [player, setPlayer] = useState<Player | null>(null)
    const [participations, setParticipations] = useState<TournamentParticipation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedYear, setSelectedYear] = useState<string>('all')
    const [availableYears, setAvailableYears] = useState<number[]>([])
    const [selectedGameType, setSelectedGameType] = useState<GameType | 'all'>('all')
    const [availableGameTypes, setAvailableGameTypes] = useState<GameType[]>([])
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
    const [yearsToShow, setYearsToShow] = useState(3) // Show last 3 years initially
    const [hasMoreYears, setHasMoreYears] = useState(false)
    const [tournamentsToShow, setTournamentsToShow] = useState(3) // Show first 3 tournaments per year
    const [hasMoreTournaments, setHasMoreTournaments] = useState(false)
    const [allParticipations, setAllParticipations] = useState<
        TournamentParticipation[]
    >([]) // Store all participations for metadata (stats, charts, H2H)
    const [careerStats, setCareerStats] = useState<{
        totalMatches: number
        totalWins: number
        totalLosses: number
        winPercentage: string
        avgPerInning: string
        highestRun: number
    } | null>(null)
    const [selectedOpponentId, setSelectedOpponentId] = useState<string>('')
    const [opponentQuery, setOpponentQuery] = useState<string>('')
    const [isOpponentOpen, setIsOpponentOpen] = useState<boolean>(false)
    const [opponentHighlight, setOpponentHighlight] = useState<number>(0)
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
                params.set('filters[id][$eq]', playerId)
                params.set('pagination[pageSize]', '1')
                params.set('populate[photo_main][fields][0]', 'url')
                // Cache buster to avoid stale revalidated response when backend just changed
                params.set('_cb', Date.now().toString())

                // Build history URL with filters & pagination
                let historyUrl = `/api/players/${playerId}/history`
                const historyParams = new URLSearchParams()

                // Add game type filter
                if (selectedGameType !== 'all') {
                    historyParams.set('gameType', selectedGameType)
                }

                if (selectedYear !== 'all') {
                    historyParams.set('year', selectedYear)
                    // Don't limit - fetch all events for the year (usually few)
                    // We'll paginate on frontend
                } else {
                    // Fetch limited events for initial load - ultra-minimal for instant response
                    historyParams.set('limit', '3') // Start with just 3 most recent tournaments
                }

                if (historyParams.toString()) {
                    historyUrl += `?${historyParams.toString()}`
                }

                // Fetch ALL data in parallel for maximum speed
                const fetchPromises: Promise<Response>[] = [
                    fetch(
                        buildApiUrl(
                            `/api/admin/tournament/players?${params.toString()}`,
                        ),
                    ),
                    fetch(buildApiUrl(historyUrl)),
                ]

                // Fetch unfiltered history once to get ALL game types & years + allParticipations
                if (
                    availableGameTypes.length === 0 ||
                    availableYears.length === 0 ||
                    allParticipations.length === 0
                ) {
                    fetchPromises.push(
                        fetch(
                            buildApiUrl(
                                `/api/players/${playerId}/history?limit=1000`,
                            ),
                        ),
                    )
                }

                const responses = await Promise.all(fetchPromises)
                const [playerResponse, historyResponse, metadataResponse] =
                    responses

                // Process player data immediately
                if (playerResponse.ok) {
                    const data = await playerResponse.json()
                    if (data.data && data.data.length > 0) {
                        const playerData = data.data[0]
                        setPlayer(playerData)

                        // Set career stats from player.career_stats (pre-calculated in DB)
                        if (playerData.career_stats) {
                            // Use game type specific stats if available, otherwise use overall
                            const stats =
                                selectedGameType !== 'all' &&
                                playerData.career_stats.byGameType?.[
                                    selectedGameType
                                ]
                                    ? playerData.career_stats.byGameType[
                                          selectedGameType
                                      ]
                                    : playerData.career_stats.overall ||
                                      playerData.career_stats
                            setCareerStats(stats)
                        }

                        setIsLoading(false) // Show player info immediately
                    } else {
                        setError(t('players.profile.error.notFound'))
                    }
                } else {
                    setError(t('players.profile.error.generic'))
                }

                // Process filtered history data (new format: { data, availableYears, availableGameTypes })
                if (historyResponse.ok) {
                    const historyPayload = await historyResponse.json()
                    const historyData = historyPayload.data || historyPayload
                    setParticipations(historyData)

                    // Initialize available years from history payload if not already set
                    if (
                        historyPayload.availableYears &&
                        availableYears.length === 0
                    ) {
                        setAvailableYears(historyPayload.availableYears)
                    }

                    if (selectedYear === 'all') {
                        // Check if there are more years to load
                        const yearSet = new Set<number>(
                            historyData.map((p: { year: number }) => p.year),
                        )
                        const loadedYears = Array.from(yearSet)
                        setHasMoreYears(loadedYears.length >= yearsToShow)
                        setHasMoreTournaments(false)
                    } else {
                        // Check if there are more tournaments for this specific year (frontend pagination)
                        setHasMoreTournaments(
                            historyData.length > tournamentsToShow,
                        )
                        setHasMoreYears(false)
                    }
                } else {
                    console.error('Failed to fetch history')
                    setParticipations([])
                }

                // Process metadata (all game types and years + full participations) on first load
                if (metadataResponse && metadataResponse.ok) {
                    const metadataData = await metadataResponse.json()
                    if (metadataData.availableGameTypes) {
                        setAvailableGameTypes(metadataData.availableGameTypes)
                    }
                    if (metadataData.availableYears) {
                        setAvailableYears(metadataData.availableYears)
                    }
                    if (metadataData.data) {
                        setAllParticipations(metadataData.data)
                    }
                }

                setIsLoadingHistory(false)
            } catch (err) {
                setError(t('players.profile.error.generic'))
                console.error('Failed to fetch player data:', err)
            } finally {
                setIsLoading(false)
                setIsLoadingHistory(false)
            }
        }

        fetchPlayerData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerId, selectedYear, selectedGameType, yearsToShow, tournamentsToShow])

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

    // Reset filters when game type changes
    const handleGameTypeChange = (gameType: GameType | 'all') => {
        setSelectedGameType(gameType)
        setSelectedYear('all')
        setTournamentsToShow(3)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">{t('players.profile.loading')}</p>
                </div>
            </div>
        )
    }

    if (error || !player) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 dark:text-red-400 text-xl mb-4">{error || t('players.profile.error.notFound')}</div>
                    <button
                        onClick={() => router.push('/players')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {t('players.profile.back')}
                    </button>
                </div>
            </div>
        )
    }

    // Filter participations by selected game type
    const filteredParticipations =
        selectedGameType === 'all'
            ? participations
            : participations.filter((p) => p.gameType === selectedGameType)

    // Get available years for the selected game type using allParticipations metadata
    const filteredAvailableYears =
        selectedGameType === 'all'
            ? availableYears
            : Array.from(
                  new Set(
                      allParticipations
                          .filter((p) => p.gameType === selectedGameType)
                          .map((p) => p.year),
                  ),
              ).sort((a, b) => b - a)

    // Calculate stats based on filters (overall + per game type/year) – mirrors admin logic
    const calculateFilteredStats = () => {
        const eventsSource = (() => {
            if (selectedYear === 'all') {
                if (selectedGameType === 'all') return allParticipations
                return allParticipations.filter(
                    (p) => p.gameType === selectedGameType,
                )
            }
            return filteredParticipations
        })()
        const eventsCount = eventsSource.length

        // When showing ALL games and we have pre-calculated career stats from backend, use them
        if (selectedGameType === 'all' && careerStats) {
            return {
                totalMatches: careerStats.totalMatches,
                totalWins: careerStats.totalWins,
                totalLosses: careerStats.totalLosses,
                winPercentage: careerStats.winPercentage,
                avgPerInning: careerStats.avgPerInning,
                highestRun: careerStats.highestRun,
                eventsCount,
            }
        }

        const sourceParticipations =
            selectedYear === 'all' && selectedGameType !== 'all'
                ? allParticipations.filter(
                      (p) => p.gameType === selectedGameType,
                  )
                : filteredParticipations

        const totalMatches = sourceParticipations.reduce(
            (sum, p) => sum + p.totalMatches,
            0,
        )
        const totalWins = sourceParticipations.reduce(
            (sum, p) => sum + p.wins,
            0,
        )
        const totalLosses = sourceParticipations.reduce(
            (sum, p) => sum + p.losses,
            0,
        )
        const winPercentage =
            totalMatches > 0
                ? ((totalWins / totalMatches) * 100).toFixed(1)
                : '0.0'

        let totalPointsSum = 0
        let totalInningsSum = 0
        sourceParticipations.forEach((p) => {
            p.matches.forEach((m) => {
                totalPointsSum += m.scoreFor
                totalInningsSum += m.innings
            })
        })
        const avgPerInning =
            totalInningsSum > 0
                ? (totalPointsSum / totalInningsSum)
                      .toFixed(3)
                      .replace('.', ',')
                : '0,000'

        const highestRun = sourceParticipations.reduce(
            (max, p) => Math.max(max, p.highestRun),
            0,
        )

        return {
            totalMatches,
            totalWins,
            totalLosses,
            winPercentage,
            avgPerInning,
            highestRun,
            eventsCount,
        }
    }

    const stats = calculateFilteredStats()
    const overallMatches = stats.totalMatches
    const overallWins = stats.totalWins
    const overallLosses = stats.totalLosses
    const overallWinPercentage = stats.winPercentage
    const overallAvg = stats.avgPerInning
    const overallHighestRun = stats.highestRun
    const overallEvents = stats.eventsCount
    const overallDraws = Math.max(
        0,
        overallMatches - overallWins - overallLosses,
    )

    // Frontend pagination for specific year (when year filter is applied)
    const displayedParticipations =
        selectedYear !== 'all'
            ? filteredParticipations.slice(0, tournamentsToShow)
            : filteredParticipations

    // Head-to-Head (H2H) derived data based on current filters
    type H2HMatch = Match & { tournament: string; year: number }

    const baseParticipationsForH2H =
        selectedGameType === 'all'
            ? []
            : filteredParticipations.filter((p) =>
                  selectedYear === 'all' ? true : p.year === Number(selectedYear),
              )

    const opponentMap = (() => {
        const map = new Map<string, string>()
        baseParticipationsForH2H.forEach((p) => {
            p.matches.forEach((m) => {
                if (m.opponentId) {
                    if (!map.has(m.opponentId)) map.set(m.opponentId, m.opponent)
                }
            })
        })
        return map
    })()

    const opponentsList = Array.from(opponentMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name))

    const filteredOpponents = opponentQuery
        ? opponentsList.filter((op) =>
              op.name.toLowerCase().includes(opponentQuery.toLowerCase()),
          )
        : opponentsList

    const h2hMatches: H2HMatch[] = selectedOpponentId
        ? baseParticipationsForH2H.flatMap((p) =>
              p.matches
                  .filter((m) => m.opponentId === selectedOpponentId)
                  .map((m) => ({
                      ...m,
                      tournament: p.tournament,
                      year: p.year,
                  })),
          )
        : []

    const h2hStats = (() => {
        if (!selectedOpponentId || h2hMatches.length === 0) return null
        const totalMatches = h2hMatches.length
        const wins = h2hMatches.filter((m) => m.result === 'win').length
        const losses = totalMatches - wins
        const winPercentage =
            totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0'
        let totalPoints = 0
        let totalInnings = 0
        let highestRun = 0
        h2hMatches.forEach((m) => {
            totalPoints += m.scoreFor
            totalInnings += m.innings
            if ((m.highRun ?? 0) > highestRun) highestRun = m.highRun ?? 0
        })
        const avgPerInning =
            totalInnings > 0 ? (totalPoints / totalInnings).toFixed(3) : '0.000'
        return {
            totalMatches,
            wins,
            losses,
            winPercentage,
            avgPerInning,
            highestRun,
        }
    })()

    // Performance chart data (per year) for selected game type
    const performanceData =
        selectedGameType === 'all'
            ? []
            : (() => {
                  const yearData = new Map<
                      number,
                      {
                          totalPoints: number
                          totalInnings: number
                          wins: number
                          losses: number
                      }
                  >()

                  allParticipations
                      .filter((p) => p.gameType === selectedGameType)
                      .forEach((p) => {
                          p.matches.forEach((m) => {
                              const existing =
                                  yearData.get(p.year) || {
                                      totalPoints: 0,
                                      totalInnings: 0,
                                      wins: 0,
                                      losses: 0,
                                  }
                              yearData.set(p.year, {
                                  totalPoints: existing.totalPoints + m.scoreFor,
                                  totalInnings:
                                      existing.totalInnings + m.innings,
                                  wins:
                                      existing.wins +
                                      (m.result === 'win' ? 1 : 0),
                                  losses:
                                      existing.losses +
                                      (m.result === 'loss' ? 1 : 0),
                              })
                          })
                      })

                  return Array.from(yearData.entries())
                      .map(([year, data]) => ({
                          year,
                          avg:
                              data.totalInnings > 0
                                  ? data.totalPoints / data.totalInnings
                                  : 0,
                          winPct:
                              data.wins + data.losses > 0
                                  ? (data.wins / (data.wins + data.losses)) * 100
                                  : 0,
                          wins: data.wins,
                      }))
                      .sort((a, b) => a.year - b.year)
              })()

    const slugNameFromPath =
        typeof pathParam === 'string'
            ? pathParam
                  .split('-')
                  .slice(1)
                  .join(' ')
                  .trim()
            : ''
    const primaryName =
        (slugNameFromPath || player.full_name || '').trim()
    const nativeName = (player.full_name || '').trim()

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
                    {t('players.profile.back')}
                </button>

                {/* Player Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6">
                        {/* Player Photo */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600">
                            {(() => {
                                const photoUrl = getPhotoUrl(player.photo_main)
                                return photoUrl ? (
                                    <img
                                        src={photoUrl}
                                        alt={primaryName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white text-2xl sm:text-3xl md:text-4xl font-bold">
                                        {primaryName.charAt(0).toUpperCase()}
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                            <div className="mb-2 md:mb-4">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                                    {primaryName}
                                </h1>
                                {nativeName && nativeName !== primaryName && (
                                    <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400 truncate">
                                        {nativeName}
                                    </div>
                                )}
                            </div>
                            {player.country && (
                                <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                    {(() => {
                                        const flagPath = getCountryFlagPath(
                                            player.country,
                                        )
                                        return flagPath ? (
                                            <img
                                                src={flagPath}
                                                alt={player.country}
                                                width={28}
                                                height={21}
                                                className="rounded shadow-sm"
                                            />
                                        ) : (
                                            <span className="text-base sm:text-lg">
                                                🌍
                                            </span>
                                        )
                                    })()}
                                    <span className="truncate">
                                        {player.country}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards - Lazy Loaded */}
                <div className="mb-6 md:mb-8">
                    {(() => {
                        const gameTypeLabel =
                            selectedGameType === 'all'
                                ? 'All Games'
                                : getGameTypeLabel(selectedGameType)
                        const statsTitle =
                            selectedYear === 'all'
                                ? `Overall Stats - (${gameTypeLabel})`
                                : `Year ${selectedYear} Stats - (${gameTypeLabel})`
                        return (
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                                {statsTitle}
                            </h2>
                        )
                    })()}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-2 sm:gap-2 md:gap-3">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4 text-center">
                            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {t('players.profile.stats.events')}
                            </div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {overallEvents}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4 text-center">
                            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {t('players.profile.stats.matches')}
                            </div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {careerStats ? (
                                    overallMatches
                                ) : (
                                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-12 rounded"></div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4 text-center">
                            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {t('players.profile.stats.wins')}
                            </div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
                                {careerStats ? (
                                    overallWins
                                ) : (
                                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-12 rounded"></div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4 text-center">
                            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {t('players.profile.stats.draws')}
                            </div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {careerStats ? (
                                    overallDraws
                                ) : (
                                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-12 rounded"></div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4 text-center">
                            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {t('players.profile.stats.losses')}
                            </div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">
                                {careerStats ? (
                                    overallLosses
                                ) : (
                                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-12 rounded"></div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4 text-center">
                            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {t('players.profile.stats.winPct')}
                            </div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {careerStats ? (
                                    `${overallWinPercentage}%`
                                ) : (
                                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4 text-center">
                            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {t('players.profile.stats.avg')}
                            </div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {careerStats ? (
                                    overallAvg
                                ) : (
                                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-3 md:p-4 text-center">
                            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {t('players.profile.stats.highRunShort')}
                            </div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {careerStats ? (
                                    overallHighestRun
                                ) : (
                                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-12 rounded"></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tournament History */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                            {t('players.profile.history.title')}
                            {isLoadingHistory && (
                                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            )}
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Game Type Filter */}
                            {availableGameTypes.length > 0 && (
                                <select
                                    value={selectedGameType}
                                    onChange={(e) =>
                                        handleGameTypeChange(
                                            e.target.value as GameType | 'all',
                                        )
                                    }
                                    disabled={isLoadingHistory}
                                    className="px-4 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="all">{t('players.profile.history.filter.gameType.all')}</option>
                                    {availableGameTypes.map((gameType) => (
                                        <option key={gameType} value={gameType}>
                                            {getGameTypeLabel(gameType)}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Year Filter - Only show after game type is selected */}
                            {selectedGameType !== 'all' &&
                                filteredAvailableYears.length > 0 && (
                                    <select
                                        value={selectedYear}
                                        onChange={(e) =>
                                            handleYearChange(e.target.value)
                                        }
                                        disabled={isLoadingHistory}
                                        className="px-4 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="all">{t('players.profile.history.filter.year.all')}</option>
                                        {filteredAvailableYears.map((year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            {/* Opponent Filter (Head-to-Head) - custom smart autocomplete */}
                            {selectedGameType !== 'all' && (
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder={t('players.profile.h2h.searchPlaceholder')}
                                        value={opponentQuery}
                                        onFocus={() => setIsOpponentOpen(true)}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            setOpponentQuery(val)
                                            setIsOpponentOpen(true)
                                            setOpponentHighlight(0)
                                            const exact = opponentsList.find(
                                                (op) =>
                                                    op.name.toLowerCase() ===
                                                    val.toLowerCase(),
                                            )
                                            setSelectedOpponentId(
                                                exact ? exact.id : '',
                                            )
                                        }}
                                        onKeyDown={(e) => {
                                            if (!isOpponentOpen) return
                                            const max = Math.max(
                                                0,
                                                Math.min(
                                                    filteredOpponents.length,
                                                    20,
                                                ) - 1,
                                            )
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault()
                                                setOpponentHighlight((h) =>
                                                    h < max ? h + 1 : h,
                                                )
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault()
                                                setOpponentHighlight((h) =>
                                                    h > 0 ? h - 1 : 0,
                                                )
                                            } else if (e.key === 'Enter') {
                                                e.preventDefault()
                                                const list =
                                                    filteredOpponents.slice(
                                                        0,
                                                        20,
                                                    )
                                                const pick =
                                                    list[opponentHighlight]
                                                if (pick) {
                                                    setOpponentQuery(pick.name)
                                                    setSelectedOpponentId(pick.id)
                                                    setIsOpponentOpen(false)
                                                }
                                            } else if (e.key === 'Escape') {
                                                setIsOpponentOpen(false)
                                            }
                                        }}
                                        disabled={
                                            isLoadingHistory ||
                                            opponentsList.length === 0
                                        }
                                        className="px-4 pr-8 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-72"
                                    />
                                    {opponentQuery && (
                                        <button
                                            type="button"
                                            aria-label="Clear opponent"
                                            onMouseDown={(e) => {
                                                e.preventDefault()
                                            }}
                                            onClick={() => {
                                                setOpponentQuery('')
                                                setSelectedOpponentId('')
                                                setIsOpponentOpen(false)
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                className="w-4 h-4"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.28-10.28a.75.75 0 10-1.06-1.06L10 7.94 8.78 6.66a.75.75 0 10-1.06 1.06L8.94 9l-1.22 1.22a.75.75 0 101.06 1.06L10 10.06l1.22 1.22a.75.75 0 101.06-1.06L11.06 9l1.22-1.22z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                    {isOpponentOpen &&
                                        filteredOpponents.length > 0 && (
                                            <div className="absolute z-20 mt-1 w-full max-w-full max-height-64 overflow-auto rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                                                {filteredOpponents
                                                    .slice(0, 20)
                                                    .map((op, idx) => (
                                                        <button
                                                            key={op.id}
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault()
                                                            }}
                                                            onClick={() => {
                                                                setOpponentQuery(
                                                                    op.name,
                                                                )
                                                                setSelectedOpponentId(
                                                                    op.id,
                                                                )
                                                                setIsOpponentOpen(
                                                                    false,
                                                                )
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-sm truncate ${idx === opponentHighlight ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                                        >
                                                            <span
                                                                className="truncate block"
                                                                title={op.name}
                                                            >
                                                                {op.name}
                                                            </span>
                                                        </button>
                                                    ))}
                                                {filteredOpponents.length > 20 && (
                                                    <div className="px-3 py-2 text-xs text-gray-500">
                                                        {t('players.profile.h2h.moreResults')}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Head-to-Head Summary */}
                    {selectedGameType !== 'all' &&
                        selectedOpponentId &&
                        h2hStats && (
                            <div className="mb-6">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    {t('players.profile.h2h.title')}{' '}
                                    {opponentMap.get(selectedOpponentId)}{' '}
                                    {selectedYear === 'all'
                                        ? `(${t('players.profile.h2h.title.yearAll')})`
                                        : `(${t('players.profile.h2h.title.yearSpecific').replace('{year}', selectedYear)})`}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
                                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {t('players.profile.h2h.matches')}
                                        </div>
                                        <div className="text-lg sm:text-xl font-bold">
                                            {h2hStats.totalMatches}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
                                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {t('players.profile.h2h.wins')}
                                        </div>
                                        <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                                            {h2hStats.wins}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
                                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {t('players.profile.h2h.losses')}
                                        </div>
                                        <div className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                                            {h2hStats.losses}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
                                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {t('players.profile.h2h.winPct')}
                                        </div>
                                        <div className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                            {h2hStats.winPercentage}%
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
                                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {t('players.profile.h2h.avg')}
                                        </div>
                                        <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                                            {h2hStats.avgPerInning
                                                .toString()
                                                .replace('.', ',')}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
                                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {t('players.profile.h2h.highRunShort')}
                                        </div>
                                        <div className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">
                                            {h2hStats.highestRun}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Head-to-Head Matches List */}
                    {selectedGameType !== 'all' &&
                        selectedOpponentId &&
                        h2hMatches.length > 0 && (
                            <div className="mb-8">
                                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    {t('players.profile.h2h.listTitle')}
                                </h4>
                                <div className="space-y-3">
                                    {[...h2hMatches]
                                        .sort(
                                            (a, b) =>
                                                new Date(a.date).getTime() -
                                                new Date(b.date).getTime(),
                                        )
                                        .map((match) => (
                                            <div
                                                key={match.id}
                                                className={`border-2 rounded-lg p-4 transition-all ${
                                                    match.result === 'win'
                                                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                                        : match.scoreFor ===
                                                              match.scoreAgainst
                                                          ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                                                          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                                match.result ===
                                                                'win'
                                                                    ? 'bg-green-600 text-white'
                                                                    : match.scoreFor ===
                                                                          match.scoreAgainst
                                                                      ? 'bg-yellow-600 text-white'
                                                                      : 'bg-red-600 text-white'
                                                            }`}>
                                                                {match.result ===
                                                                'win'
                                                                    ? t('players.profile.modal.badge.win')
                                                                    : match.scoreFor ===
                                                                          match.scoreAgainst
                                                                      ? t('players.profile.modal.badge.draw')
                                                                      : t('players.profile.modal.badge.loss')}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {match.stage}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {new Date(
                                                                    match.date,
                                                                ).toLocaleDateString(
                                                                    'en-GB',
                                                                )}
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
                                                        <div
                                                            className={`text-2xl font-bold ${
                                                                match.scoreFor ===
                                                                match.scoreAgainst
                                                                    ? 'text-yellow-600 dark:text-yellow-400'
                                                                    : 'text-gray-900 dark:text-white'
                                                            }`}
                                                        >
                                                            {match.scoreFor} -{' '}
                                                            {match.scoreAgainst}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 space-x-2 mt-1">
                                                            <span>
                                                                {t('players.profile.h2h.innings').replace('{innings}', String(match.innings))}
                                                            </span>
                                                            <span>
                                                                {t('players.profile.h2h.avgValue').replace(
                                                                    '{avg}',
                                                                    (
                                                                        match.scoreFor /
                                                                        (match.innings || 1)
                                                                    )
                                                                        .toFixed(3)
                                                                        .replace('.', ','),
                                                                )}
                                                            </span>
                                                            {typeof match.highRun === 'number' && (
                                                                <span>
                                                                    {t('players.profile.h2h.highRun').replace('{value}', String(match.highRun))}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {match.tournament} • {match.year}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedMatch(match)}
                                                            className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                                                        >
                                                            {t('players.profile.h2h.viewDetails')}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                    {/* Performance Chart */}
                    {selectedGameType !== 'all' &&
                        performanceData.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                                    {t('players.profile.performance.title')}
                                </h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart
                                        data={performanceData}
                                        margin={{
                                            top: 5,
                                            right: 30,
                                            left: 20,
                                            bottom: 5,
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="year" />
                                        <YAxis yAxisId="left" />
                                        <YAxis yAxisId="right" orientation="right" />
                                        <Tooltip
                                            formatter={(value: number, name: string) => {
                                                if (name === t('players.profile.performance.avgPerInning')) {
                                                    return value.toLocaleString('en-US', {
                                                        minimumFractionDigits: 3,
                                                        maximumFractionDigits: 3,
                                                    })
                                                }
                                                if (name === t('players.profile.performance.winPct')) {
                                                    return `${value.toFixed(1)}%`
                                                }
                                                return value
                                            }}
                                            labelFormatter={(label) => `${t('players.profile.performance.yearLabel')} ${label}`}
                                        />
                                        <Legend />
                                        <Line
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="avg"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            name={t('players.profile.performance.avgPerInning')}
                                            dot={{ fill: '#3b82f6', r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="winPct"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            name={t('players.profile.performance.winPct')}
                                            dot={{ fill: '#10b981', r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="wins"
                                            stroke="#f59e0b"
                                            strokeWidth={2}
                                            name={t('players.profile.performance.wins')}
                                            dot={{ fill: '#f59e0b', r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                    {isLoadingHistory && participations.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-300">{t('players.profile.history.loading')}</p>
                        </div>
                    ) : participations.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            {t('players.profile.history.empty')}
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
                                                <div className="text-sm text-blue-100">{t('players.profile.history.tournament.positionLabel')}</div>
                                            </div>
                                        </div>

                                        {/* Tournament Stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center bg-white/10 rounded-lg p-4">
                                            <div>
                                                <div className="text-2xl font-bold">{participation.totalMatches}</div>
                                                <div className="text-xs text-blue-100">{t('players.profile.stats.matches')}</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-green-300">{participation.wins}</div>
                                                <div className="text-xs text-blue-100">{t('players.profile.stats.wins')}</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-red-300">{participation.losses}</div>
                                                <div className="text-xs text-blue-100">{t('players.profile.stats.losses')}</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-yellow-300">{participation.avgPerInning.toFixed(3)}</div>
                                                <div className="text-xs text-blue-100">{t('players.profile.stats.avg')}</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-orange-300">{participation.highestRun}</div>
                                                <div className="text-xs text-blue-100">{t('players.profile.stats.highRunShort')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Matches List */}
                                    <div className="p-6 bg-white dark:bg-gray-800">
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                            {t('players.profile.history.tournament.detailsTitle').replace('{count}', String(participation.matches.length))}
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
                                                                    {match.result === 'win'
                                                                        ? t('players.profile.modal.badge.win')
                                                                        : match.scoreFor === match.scoreAgainst
                                                                        ? t('players.profile.modal.badge.draw')
                                                                        : t('players.profile.modal.badge.loss')}
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
                                                            <div
                                                                className={`text-2xl font-bold ${
                                                                    match.scoreFor === match.scoreAgainst
                                                                        ? 'text-yellow-600 dark:text-yellow-400'
                                                                        : 'text-gray-900 dark:text-white'
                                                                }`}
                                                            >
                                                                {match.scoreFor} - {match.scoreAgainst}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 space-x-2 mt-1">
                                                                <span>
                                                                    Innings: {match.innings}
                                                                </span>
                                                                <span>
                                                                    AVG:{' '}
                                                                    {(
                                                                        match.scoreFor /
                                                                        (match.innings || 1)
                                                                    )
                                                                        .toFixed(3)
                                                                        .replace('.', ',')}
                                                                </span>
                                                                {typeof match.highRun === 'number' && (
                                                                    <span>
                                                                        H.R.: {match.highRun}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                {participation.tournament} • {participation.year}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedMatch(match)}
                                                                className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                                                            >
                                                                View details
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
                                        {t('players.profile.loadMoreYears')}
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
                                        {t('players.profile.loadMoreTournaments').replace('{year}', selectedYear)}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Note about data */}
                <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>{t('players.profile.note.data')}</p>
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
                                    {new Date(selectedMatch.date).toLocaleDateString('en-GB', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
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
                            {selectedMatch.result === 'win'
                                ? t('players.profile.modal.badge.win')
                                : selectedMatch.scoreFor === selectedMatch.scoreAgainst
                                ? t('players.profile.modal.badge.draw')
                                : t('players.profile.modal.badge.loss')}
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
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('players.profile.modal.avgLabel')}</div>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {(selectedMatch.scoreFor / selectedMatch.innings).toFixed(3).replace('.', ',')}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-400 dark:text-gray-500 mb-2">
                                    VS
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{t('players.profile.modal.inningsLabel')}</div>
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
                                {t('players.profile.modal.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
