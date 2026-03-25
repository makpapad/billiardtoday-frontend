"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { getCountryFlagPath } from "@/lib/countryFlags"
import { getGameTypeLabel, normalizeGameTypeOrFallback, type GameType } from "@/lib/gameTypes"
import { t } from "@/lib/i18n"
import { buildTournamentSlug } from "@/lib/tournaments"
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
    photo_alt?:
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
    career_stats?: {
        overall?: {
            totalMatches?: number
            totalWins?: number
            totalLosses?: number
            winPercentage?: number | string
            avgPerInning?: number | string
            bestAverageFromWins?: number | string
            highestRun?: number
        }
        byGameType?: Record<
            string,
            {
                totalMatches?: number
                totalWins?: number
                totalLosses?: number
                winPercentage?: number | string
                avgPerInning?: number | string
                bestAverageFromWins?: number | string
                highestRun?: number
            }
        >
    } | null
}

// Helper function to get Strapi base URL
const getStrapiBaseUrl = (): string => {
    // In production on billiardtoday.com, always use the public Strapi URL
    if (typeof window !== 'undefined') {
        const host = window.location.hostname
        if (host === 'billiardtoday.com' || host === 'www.billiardtoday.com') {
            return 'https://app.billiardtoday.com'
        }
    }

    // Fallback to configured env or localhost for local development
    return process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
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
        const strapiBase = getStrapiBaseUrl()
        return `${strapiBase}${url}`
    }

    return url
}

const parseAverageValue = (value: unknown) => {
    const normalized = Number(String(value ?? '0').replace(',', '.'))
    return Number.isFinite(normalized) ? normalized : 0
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
    tournamentType: string | null
    matches: Match[]
    totalMatches: number
    wins: number
    losses: number
    totalPoints: number
    avgPerInning: number
    highestRun: number
}

const getTournamentTypeLabel = (value: string) => {
    const labels: Record<string, string> = {
        'E.C': 'European Championship',
        'W.C': 'World Championship',
        'W.Cup': 'World Cup',
        'N.C': 'National Championship',
        'T.C': 'Team Competition National',
        'T.C.I': 'Team Competition International',
        'O.T': 'Open Tournament',
        Invitational: 'Invitational',
        Other: 'Other',
    }

    return labels[value] || value
}

// Helper function to get gradient colors based on position
const getPositionGradient = (position: string): string => {
    const pos = position.toLowerCase().trim()

    // 1st place - Gold
    if (pos === "1" || pos === "1st" || pos === "1η" || pos === "1η θέση") {
        return "from-yellow-500 to-amber-600"
    }
    // 2nd place - Silver
    if (pos === "2" || pos === "2nd" || pos === "2η" || pos === "2η θέση") {
        return "from-gray-300 to-gray-500"
    }
    // 3rd place - Bronze
    if (pos === "3" || pos === "3rd" || pos === "3η" || pos === "3η θέση") {
        return "from-orange-500 to-amber-700"
    }
    // Default - Blue gradient
    return "from-blue-600 to-indigo-600"
}

const buildPlayerSlug = (id: string, name: string): string => {
    const trimmedId = id.trim()
    const baseName = name.trim()
    const slugName = baseName ? baseName.replace(/\s+/g, "-") : ""
    return slugName ? `${trimmedId}-${slugName}` : trimmedId
}

const formatSafeDecimal = (value: number | null | undefined, digits = 3): string => {
    const numericValue =
        typeof value === 'number' && Number.isFinite(value) ? value : null
    if (numericValue === null) {
        return digits === 1 ? '0.0' : '0.000'
    }
    
    // Truncate instead of round
    const factor = Math.pow(10, digits)
    const truncated = Math.floor(numericValue * factor) / factor
    return truncated.toFixed(digits).replace('.', ',')
}

const formatSafeAverage = (
    score: number | null | undefined,
    innings: number | null | undefined,
): string => {
    const validScore =
        typeof score === 'number' && Number.isFinite(score) ? score : null
    const validInnings =
        typeof innings === 'number' && Number.isFinite(innings) && innings > 0
            ? innings
            : null

    if (validScore === null || validInnings === null) {
        return '0,000'
    }

    return formatSafeDecimal(validScore / validInnings, 3)
}

const normalizeCareerStats = (
    stats:
        | {
              totalMatches?: number
              totalWins?: number
              totalLosses?: number
              winPercentage?: number | string
              avgPerInning?: number | string
              bestAverageFromWins?: number | string
              highestRun?: number
          }
        | null
        | undefined,
) => {
    if (!stats) return null

    const winPercentageValue =
        typeof stats.winPercentage === 'number'
            ? stats.winPercentage.toFixed(1)
            : typeof stats.winPercentage === 'string'
              ? stats.winPercentage
              : '0.0'

    const avgValue =
        typeof stats.avgPerInning === 'number'
            ? formatSafeDecimal(stats.avgPerInning, 3)
            : typeof stats.avgPerInning === 'string'
              ? stats.avgPerInning.replace('.', ',')
              : '0,000'
    const bestAverageFromWinsValue =
        typeof stats.bestAverageFromWins === 'number'
            ? formatSafeDecimal(stats.bestAverageFromWins, 3)
            : typeof stats.bestAverageFromWins === 'string'
              ? stats.bestAverageFromWins.replace('.', ',')
              : avgValue

    return {
        totalMatches: Number(stats.totalMatches) || 0,
        totalWins: Number(stats.totalWins) || 0,
        totalLosses: Number(stats.totalLosses) || 0,
        winPercentage: winPercentageValue,
        avgPerInning: avgValue,
        bestAverageFromWins: bestAverageFromWinsValue,
        highestRun: Number(stats.highestRun) || 0,
    }
}

export default function PlayerProfilePage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const rawId = params?.id as string
    const extractPlayerIdentifier = (slug: string) => {
        const clean = String(slug || '').trim()
        if (!clean) return ''

        const numeric = clean.match(/^(\d+)(?:-|$)/)
        if (numeric?.[1]) return numeric[1]

        const documentUuid = clean.match(
            /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:-|$)/,
        )
        if (documentUuid?.[1]) return documentUuid[1]

        return clean.split('-')[0] || ''
    }
    const playerId = extractPlayerIdentifier(rawId)
    const isNumericPlayerId = /^\d+$/.test(playerId)
    const tournamentContextSlug = (searchParams?.get('tournament') || '').trim()

    const [player, setPlayer] = useState<Player | null>(null)
    const [participations, setParticipations] = useState<TournamentParticipation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedYear, setSelectedYear] = useState<string>('all')
    const [availableYears, setAvailableYears] = useState<number[]>([])
    const [selectedGameType, setSelectedGameType] = useState<GameType | 'all'>('all')
    const [availableGameTypes, setAvailableGameTypes] = useState<GameType[]>([])
    const [selectedTournamentType, setSelectedTournamentType] =
        useState<string>('all')
    const [availableTournamentTypes, setAvailableTournamentTypes] = useState<
        string[]
    >([])
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
    const [yearsToShow, setYearsToShow] = useState(3) // Show last 3 years initially
    const [hasMoreYears, setHasMoreYears] = useState(false)
    const [tournamentsToShow, setTournamentsToShow] = useState(3) // Show first 3 tournaments per year
    const [hasMoreTournaments, setHasMoreTournaments] = useState(false)
    const [allParticipations, setAllParticipations] = useState<
        TournamentParticipation[]
    >([]) // Store all participations for metadata (stats, charts, H2H)
    const [historyTotalCount, setHistoryTotalCount] = useState<number | null>(
        null,
    )
    const [careerStats, setCareerStats] = useState<{
        totalMatches: number
        totalWins: number
        totalLosses: number
        winPercentage: string
        avgPerInning: string
        bestAverageFromWins: string
        highestRun: number
    } | null>(null)
    const [selectedOpponentId, setSelectedOpponentId] = useState<string>('')
    const [opponentQuery, setOpponentQuery] = useState<string>('')
    const [isOpponentOpen, setIsOpponentOpen] = useState<boolean>(false)
    const [opponentHighlight, setOpponentHighlight] = useState<number>(0)
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    const buildApiUrl = (path: string) => `${basePath}${path}`
    const buildPlayerUrl = (id: string, name: string) => {
        const baseUrl = `/players/${buildPlayerSlug(id, name)}`
        return tournamentContextSlug
            ? `${baseUrl}?tournament=${encodeURIComponent(tournamentContextSlug)}`
            : baseUrl
    }

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
            return
        }

        router.push('/players')
    }

    const navigateToPlayer = async (opponentId: string, displayName: string) => {
        const trimmedId = opponentId?.trim()
        if (!trimmedId) return

        // Αν μοιάζει ήδη με numeric id, πήγαινε κατευθείαν
        if (/^\d+$/.test(trimmedId)) {
            router.push(buildPlayerUrl(trimmedId, displayName))
            return
        }

        try {
            const params = new URLSearchParams()
            params.set('filters[documentId][$eq]', trimmedId)
            params.set('pagination[pageSize]', '1')

            const response = await fetch(
                buildApiUrl(`/api/admin/tournament/players?${params.toString()}`),
            )

            if (!response.ok) {
                throw new Error('Failed to resolve opponent by documentId')
            }

            const payload = await response.json()
            const first =
                Array.isArray(payload?.data) && payload.data.length > 0
                    ? payload.data[0]
                    : null

            const numericId = first?.id ? String(first.id) : trimmedId
            const nameFromApi = first?.full_name || displayName

            router.push(buildPlayerUrl(numericId, nameFromApi))
        } catch {
            // Fallback: χρησιμοποίησε όπως είναι το opponentId αν κάτι πάει στραβά
            router.push(buildPlayerUrl(trimmedId, displayName))
        }
    }

    useEffect(() => {
        const abortController = new AbortController()
        let isActive = true

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
                if (isNumericPlayerId) {
                    params.set('filters[id][$eq]', playerId)
                } else {
                    params.set('filters[documentId][$eq]', playerId)
                }
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
                if (selectedTournamentType !== 'all') {
                    historyParams.set('tournamentType', selectedTournamentType)
                }

                const historyLimit =
                    selectedYear !== 'all'
                        ? Math.max(tournamentsToShow + 6, 12)
                        : tournamentContextSlug
                          ? 1000
                          : Math.max(yearsToShow * 12, 24)
                historyParams.set('limit', String(historyLimit))

                if (selectedYear !== 'all') {
                    historyParams.set('year', selectedYear)
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
                        { signal: abortController.signal },
                    ),
                    fetch(buildApiUrl(historyUrl), {
                        signal: abortController.signal,
                    }),
                ]

                // Fetch unfiltered metadata when filters are missing.
                // Keep allParticipations warm for non-all game type views only.
                const shouldFetchMetadata =
                    availableGameTypes.length === 0 ||
                    availableYears.length === 0 ||
                    availableTournamentTypes.length === 0 ||
                    (selectedGameType !== 'all' &&
                        allParticipations.length === 0)

                if (shouldFetchMetadata) {
                    fetchPromises.push(
                        fetch(
                            buildApiUrl(
                                `/api/players/${playerId}/history?limit=1000`,
                            ),
                            { signal: abortController.signal },
                        ),
                    )
                }

                const responses = await Promise.all(fetchPromises)
                if (!isActive) return
                const [playerResponse, historyResponse, metadataResponse] =
                    responses

                // Process player data immediately
                if (playerResponse.ok) {
                    const data = await playerResponse.json()
                    if (data.data && data.data.length > 0) {
                        const playerData = data.data[0]
                        setPlayer(playerData)

                        if (!isNumericPlayerId && playerData?.id) {
                            const canonicalId = String(playerData.id)
                            const canonicalName =
                                playerData.full_name ||
                                playerData.full_name_en ||
                                playerData.name ||
                                playerId
                            const canonicalUrl = buildPlayerUrl(canonicalId, canonicalName)
                            router.replace(canonicalUrl)
                        }

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
                            setCareerStats(normalizeCareerStats(stats))
                        }

                        setIsLoading(false) // Show player info immediately
                    } else {
                        setError(t('players.profile.error.notFound'))
                    }
                } else {
                    const errorText = await playerResponse
                        .text()
                        .catch(() => '')
                    setError(errorText || t('players.profile.error.generic'))
                }

                // Process filtered history data (new format: { data, availableYears, availableGameTypes })
                if (historyResponse.ok) {
                    const historyPayload = await historyResponse.json()
                    const historyData = historyPayload.data || historyPayload
                    setParticipations(historyData)
                    setHistoryTotalCount(
                        Number.isFinite(historyPayload?.totalCount)
                            ? Number(historyPayload.totalCount)
                            : historyData.length,
                    )

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
                    const historyErrorText = await historyResponse
                        .text()
                        .catch(() => '')
                    console.warn(
                        'Failed to fetch history:',
                        historyErrorText || historyResponse.status,
                    )
                    setParticipations([])
                    setHistoryTotalCount(null)
                }

                // Process metadata (all game types and years + full participations) on first load
                if (metadataResponse && metadataResponse.ok) {
                    const metadataData = await metadataResponse.json()
                    if (metadataData.availableGameTypes) {
                        setAvailableGameTypes(metadataData.availableGameTypes)
                    }
                    if (metadataData.availableTournamentTypes) {
                        setAvailableTournamentTypes(
                            metadataData.availableTournamentTypes,
                        )
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
                if (
                    err instanceof DOMException &&
                    err.name === 'AbortError'
                ) {
                    return
                }
                setError(t('players.profile.error.generic'))
                console.warn('Failed to fetch player data:', err)
            } finally {
                if (!isActive) return
                setIsLoading(false)
                setIsLoadingHistory(false)
            }
        }

        fetchPlayerData()
        return () => {
            isActive = false
            abortController.abort()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerId, isNumericPlayerId, selectedYear, selectedGameType, selectedTournamentType, yearsToShow, tournamentsToShow, tournamentContextSlug])

    const loadMoreYears = () => {
        setYearsToShow(prev => prev + 3) // Load 3 more years
    }

    const matchesSelectedGameType = (value: unknown) => {
        if (selectedGameType === 'all') return true
        return normalizeGameTypeOrFallback(value) === selectedGameType
    }

    const resolveCareerStatsForGameType = (gameType: GameType) => {
        const byGameType = player?.career_stats?.byGameType
        if (!byGameType) return null

        if (byGameType[gameType]) {
            return byGameType[gameType]
        }

        for (const [rawType, stats] of Object.entries(byGameType)) {
            if (normalizeGameTypeOrFallback(rawType) === gameType) {
                return stats
            }
        }

        return null
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
        setSelectedTournamentType('all')
        setSelectedYear('all')
        setTournamentsToShow(3)
    }

    const handleTournamentTypeChange = (tournamentType: string) => {
        setSelectedTournamentType(tournamentType)
        setSelectedYear('all')
        setTournamentsToShow(3)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <img
                        src={`${basePath}/img/logo/logo-light-full.png`}
                        alt={t('players.profile.logoAlt')}
                        className="mx-auto mb-6 h-10 sm:h-12 md:h-14 w-auto"
                    />
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
                        onClick={handleBack}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {t('players.profile.back')}
                    </button>
                </div>
            </div>
        )
    }

    const tournamentScopedParticipations = tournamentContextSlug
        ? participations.filter((participation) =>
              buildTournamentSlug('', participation.tournament, participation.year) === tournamentContextSlug,
          )
        : participations

    // Filter participations by selected game type
    const filteredParticipations =
        tournamentScopedParticipations.filter((p) => {
            if (!matchesSelectedGameType(p.gameType)) return false
            if (
                selectedTournamentType !== 'all' &&
                p.tournamentType !== selectedTournamentType
            ) {
                return false
            }
            return true
        })

    const filteredAvailableTournamentTypes =
        selectedGameType === 'all'
            ? availableTournamentTypes
            : Array.from(
                  new Set(
                      (tournamentContextSlug
                          ? tournamentScopedParticipations
                          : allParticipations
                      )
                          .filter((p) => matchesSelectedGameType(p.gameType))
                          .map((p) => p.tournamentType)
                          .filter((value): value is string => Boolean(value)),
                  ),
              ).sort()

    // Get available years for the selected game type using allParticipations metadata
    const filteredAvailableYears = Array.from(
        new Set(
            (tournamentContextSlug
                ? tournamentScopedParticipations
                : allParticipations.length > 0
                  ? allParticipations
                  : participations
            )
                .filter((p) => {
                    if (!matchesSelectedGameType(p.gameType)) return false
                    if (
                        selectedTournamentType !== 'all' &&
                        p.tournamentType !== selectedTournamentType
                    ) {
                        return false
                    }
                    return true
                })
                .map((p) => p.year),
        ),
    ).sort((a, b) => b - a)

    // Calculate stats based on filters (overall + per game type/year) – mirrors admin logic
    const calculateFilteredStats = () => {
        const eventsSource = (() => {
            if (selectedYear === 'all') {
                const source = tournamentContextSlug
                    ? tournamentScopedParticipations
                    : allParticipations.length > 0
                      ? allParticipations
                      : participations
                if (
                    selectedGameType === 'all' &&
                    selectedTournamentType === 'all'
                ) {
                    return source
                }
                return source.filter(
                    (p) =>
                        matchesSelectedGameType(p.gameType) &&
                        (selectedTournamentType === 'all' ||
                            p.tournamentType === selectedTournamentType),
                )
            }
            return filteredParticipations
        })()
        const eventsCount =
            selectedYear === 'all' &&
            !tournamentContextSlug &&
            historyTotalCount !== null
                ? historyTotalCount
                : eventsSource.length

        // Use pre-calculated career stats only for "all game types".
        // For specific game type we rely on participations, to stay aligned
        // with the event list and avoid mixing in team-board stats.
        if (
            selectedYear === 'all' &&
            selectedGameType === 'all' &&
            selectedTournamentType === 'all' &&
            effectiveCareerStats
        ) {
            return {
                totalMatches: effectiveCareerStats.totalMatches,
                totalWins: effectiveCareerStats.totalWins,
                totalLosses: effectiveCareerStats.totalLosses,
                winPercentage: effectiveCareerStats.winPercentage,
                avgPerInning: effectiveCareerStats.avgPerInning,
                bestAverageFromWins:
                    effectiveCareerStats.bestAverageFromWins ||
                    effectiveCareerStats.avgPerInning,
                highestRun: effectiveCareerStats.highestRun,
                eventsCount,
            }
        }

        const sourceParticipations =
            selectedYear === 'all' &&
            (selectedGameType !== 'all' || selectedTournamentType !== 'all')
                ? allParticipations.filter(
                      (p) =>
                          matchesSelectedGameType(p.gameType) &&
                          (selectedTournamentType === 'all' ||
                              p.tournamentType === selectedTournamentType),
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
        let weightedAvgSum = 0
        let weightedAvgMatches = 0
        sourceParticipations.forEach((p) => {
            if (Array.isArray(p.matches) && p.matches.length > 0) {
                p.matches.forEach((m) => {
                    totalPointsSum += m.scoreFor
                    totalInningsSum += m.innings
                })
                return
            }

            const avgValue = parseAverageValue(p.avgPerInning)
            const matchesWeight = Number(p.totalMatches) || 0
            if (matchesWeight > 0) {
                weightedAvgSum += avgValue * matchesWeight
                weightedAvgMatches += matchesWeight
            }
        })
        const avgPerInning =
            totalInningsSum > 0
                ? (totalPointsSum / totalInningsSum)
                      .toFixed(3)
                      .replace('.', ',')
                : weightedAvgMatches > 0
                  ? (weightedAvgSum / weightedAvgMatches)
                        .toFixed(3)
                        .replace('.', ',')
                : '0,000'

        const highestRun = sourceParticipations.reduce(
            (max, p) => Math.max(max, p.highestRun),
            0,
        )
        let bestAverageFromWins = 0
        sourceParticipations.forEach((p) => {
            if (!Array.isArray(p.matches)) return
            p.matches.forEach((m) => {
                if (m.result !== 'win') return
                const innings = Number(m.innings) || 0
                if (innings <= 0) return
                const avg = (Number(m.scoreFor) || 0) / innings
                if (avg > bestAverageFromWins) {
                    bestAverageFromWins = avg
                }
            })
        })

        return {
            totalMatches,
            totalWins,
            totalLosses,
            winPercentage,
            avgPerInning,
            bestAverageFromWins: formatSafeDecimal(bestAverageFromWins, 3),
            highestRun,
            eventsCount,
        }
    }

    const preloadedCareerStats =
        selectedGameType !== 'all' &&
        resolveCareerStatsForGameType(selectedGameType)
            ? normalizeCareerStats(
                  resolveCareerStatsForGameType(selectedGameType),
              )
            : normalizeCareerStats(player?.career_stats?.overall)

    const effectiveCareerStats = careerStats ?? preloadedCareerStats
    const stats = calculateFilteredStats()
    const overallMatches = stats.totalMatches
    const overallWins = stats.totalWins
    const overallLosses = stats.totalLosses
    const overallWinPercentage = stats.winPercentage
    const overallAvg = stats.avgPerInning
    const overallBestAverageFromWins =
        stats.bestAverageFromWins || stats.avgPerInning
    const overallHighestRun = stats.highestRun
    const overallEvents = stats.eventsCount
    const overallDraws = Math.max(
        0,
        overallMatches - overallWins - overallLosses,
    )
    const gameTypeCareerBoxes = (() => {
        if (selectedGameType === 'all') return null
        const source = tournamentContextSlug
            ? tournamentScopedParticipations
            : allParticipations.length > 0
              ? allParticipations
              : participations
        const filtered = source.filter((p) => matchesSelectedGameType(p.gameType))
        const byTournamentType = filtered.filter(
            (p) =>
                selectedTournamentType === 'all' ||
                p.tournamentType === selectedTournamentType,
        )
        let bestAverageFromWins = 0
        let highestRun = 0
        byTournamentType.forEach((p) => {
            if (Number(p.highestRun) > highestRun) {
                highestRun = Number(p.highestRun) || 0
            }
            if (!Array.isArray(p.matches)) return
            p.matches.forEach((m) => {
                if (m.result !== 'win') return
                const innings = Number(m.innings) || 0
                if (innings <= 0) return
                const avg = (Number(m.scoreFor) || 0) / innings
                if (avg > bestAverageFromWins) {
                    bestAverageFromWins = avg
                }
                const hr = Number(m.highRun) || 0
                if (hr > highestRun) highestRun = hr
            })
        })
        return {
            bestAverageFromWins: formatSafeDecimal(bestAverageFromWins, 3),
            highestRun,
        }
    })()

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
                  const createYearAggregate = () => ({
                      totalPoints: 0,
                      totalInnings: 0,
                      weightedAvgSum: 0,
                      weightedAvgMatches: 0,
                      wins: 0,
                      losses: 0,
                  })

                  const yearData = new Map<
                      number,
                      {
                          totalPoints: number
                          totalInnings: number
                          weightedAvgSum: number
                          weightedAvgMatches: number
                          wins: number
                          losses: number
                      }
                  >()

                  allParticipations
                      .filter(
                          (p) =>
                              normalizeGameTypeOrFallback(p.gameType) ===
                              selectedGameType,
                      )
                      .forEach((p) => {
                          const existing = yearData.get(p.year) || createYearAggregate()

                          if (!Array.isArray(p.matches) || p.matches.length === 0) {
                              const avgValue = parseAverageValue(p.avgPerInning)
                              const matchWeight = Number(p.totalMatches) || 0
                              yearData.set(p.year, {
                                  totalPoints: existing.totalPoints,
                                  totalInnings: existing.totalInnings,
                                  weightedAvgSum:
                                      existing.weightedAvgSum +
                                      avgValue * matchWeight,
                                  weightedAvgMatches:
                                      existing.weightedAvgMatches + matchWeight,
                                  wins: existing.wins + (Number(p.wins) || 0),
                                  losses:
                                      existing.losses +
                                      (Number(p.losses) || 0),
                              })
                              return
                          }

                          p.matches.forEach((m) => {
                              const running =
                                  yearData.get(p.year) || existing
                              yearData.set(p.year, {
                                  totalPoints: running.totalPoints + m.scoreFor,
                                  totalInnings:
                                      running.totalInnings + m.innings,
                                  weightedAvgSum: running.weightedAvgSum,
                                  weightedAvgMatches:
                                      running.weightedAvgMatches,
                                  wins:
                                      running.wins +
                                      (m.result === 'win' ? 1 : 0),
                                  losses:
                                      running.losses +
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
                                  : data.weightedAvgMatches > 0
                                    ? data.weightedAvgSum /
                                      data.weightedAvgMatches
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
        typeof rawId === 'string'
            ? rawId
                  .split('-')
                  .slice(1)
                  .join(' ')
                  .trim()
            : ''

    const decodedSlugName = (() => {
        if (!slugNameFromPath) return ''
        try {
            // Αν το slug είναι URL-encoded (περιέχει %), κάνε decode, αλλιώς άφησέ το ως έχει
            return slugNameFromPath.includes('%')
                ? decodeURIComponent(slugNameFromPath)
                : slugNameFromPath
        } catch {
            return slugNameFromPath
        }
    })()

    const primaryName = (decodedSlugName || player.full_name || '').trim()
    const nativeName = (player.full_name || '').trim()

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6 flex flex-wrap items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('players.profile.back')}
                    </button>
                    {tournamentContextSlug ? (
                        <button
                            type="button"
                            onClick={() => router.push(`/players/${buildPlayerSlug(playerId, player.full_name)}`)}
                            className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Show all tournaments
                        </button>
                    ) : null}
                </div>

                {/* Player Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6">
                        {/* Player Photo */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600">
                            {(() => {
                                const photoUrl = getPhotoUrl(
                                    player.photo_main ??
                                        player.photo_alt ??
                                        null,
                                )
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
                        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-start md:justify-between md:gap-6">
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
                            {selectedGameType !== 'all' && gameTypeCareerBoxes && (
                            <div className="mt-3 md:mt-0 grid grid-cols-2 gap-3 w-full md:w-auto md:min-w-[320px]">
                                <div className="rounded-xl bg-gray-100/90 dark:bg-gray-700/60 px-5 py-4 text-center min-h-[108px] flex flex-col items-center justify-center">
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                                        Best Average (wins only)
                                    </div>
                                    <div className="text-2xl md:text-3xl font-extrabold text-purple-700 dark:text-purple-300 leading-none">
                                        {gameTypeCareerBoxes.bestAverageFromWins}
                                    </div>
                                </div>
                                <div className="rounded-xl bg-gray-100/90 dark:bg-gray-700/60 px-5 py-4 text-center min-h-[108px] flex flex-col items-center justify-center">
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                                        Highest Run
                                    </div>
                                    <div className="text-2xl md:text-3xl font-extrabold text-orange-700 dark:text-orange-300 leading-none">
                                        {gameTypeCareerBoxes.highestRun}
                                    </div>
                                </div>
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
                                {effectiveCareerStats ? (
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
                                {effectiveCareerStats ? (
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
                                {effectiveCareerStats ? (
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
                                {effectiveCareerStats ? (
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
                                {effectiveCareerStats ? (
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
                                {effectiveCareerStats ? (
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
                                {effectiveCareerStats ? (
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

                            {filteredAvailableTournamentTypes.length > 0 && (
                                <select
                                    value={selectedTournamentType}
                                    onChange={(e) =>
                                        handleTournamentTypeChange(
                                            e.target.value,
                                        )
                                    }
                                    disabled={isLoadingHistory}
                                    className="px-4 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="all">
                                        All tournament types
                                    </option>
                                    {filteredAvailableTournamentTypes.map(
                                        (tournamentType) => (
                                            <option
                                                key={tournamentType}
                                                value={tournamentType}
                                            >
                                                {getTournamentTypeLabel(
                                                    tournamentType,
                                                )}
                                            </option>
                                        ),
                                    )}
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
                                            {formatSafeDecimal(Number(h2hStats.avgPerInning), 3)}
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
                                                                        onClick={() => {
                                                                            const opponentId = match.opponentId
                                                                            if (!opponentId) return
                                                                            void navigateToPlayer(opponentId, match.opponent)
                                                                        }}
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
                                                                    formatSafeAverage(
                                                                        match.scoreFor,
                                                                        match.innings,
                                                                    ),
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
                                                    return `${formatSafeDecimal(value, 1)}%`
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
                                    <div className={`bg-gradient-to-r ${getPositionGradient(participation.position)} p-6 text-white`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-2xl font-bold flex items-center gap-2">
                                                    <a
                                                        href={`/tournaments/${buildTournamentSlug('', participation.tournament, participation.year)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 hover:text-blue-100 transition-colors"
                                                    >
                                                        <span>{participation.tournament}</span>
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="h-5 w-5"
                                                            aria-hidden="true"
                                                        >
                                                            <path d="M14 3h7v7" />
                                                            <path d="M10 14L21 3" />
                                                            <path d="M21 14v7h-7" />
                                                            <path d="M3 10V3h7" />
                                                            <path d="M3 21h7" />
                                                            <path d="M3 14v7" />
                                                        </svg>
                                                    </a>
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
                                                <div className="text-2xl font-bold text-yellow-300">{formatSafeDecimal(participation.avgPerInning, 3)}</div>
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
                                                                        onClick={() => {
                                                                            const opponentId = match.opponentId
                                                                            if (!opponentId) return
                                                                            void navigateToPlayer(opponentId, match.opponent)
                                                                        }}
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
                                                                    {formatSafeAverage(
                                                                        match.scoreFor,
                                                                        match.innings,
                                                                    )}
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
                                        {formatSafeAverage(
                                            selectedMatch.scoreFor,
                                            selectedMatch.innings,
                                        )}
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
                                                const opponentId = selectedMatch.opponentId
                                                if (!opponentId) return
                                                setSelectedMatch(null)
                                                void navigateToPlayer(opponentId, selectedMatch.opponent)
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
                                        {formatSafeAverage(
                                            selectedMatch.scoreAgainst,
                                            selectedMatch.innings,
                                        )}
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
