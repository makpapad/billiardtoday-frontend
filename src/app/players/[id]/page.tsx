'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Player = {
    id: number
    documentId: string
    full_name: string
    country: string | null
    city: string | null
    date_of_birth: string | null
    email: string | null
    phone_main: string | null
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
                let historyUrl = `/api/players/${playerId}/history`
                const historyParams = new URLSearchParams()
                
                if (selectedYear !== 'all') {
                    historyParams.set('year', selectedYear)
                    // Don't limit - fetch all events for the year (usually 5-20)
                    // We'll paginate on frontend
                } else {
                    // Fetch limited events for initial load
                    historyParams.set('limit', (yearsToShow * 10).toString()) // ~10 events per year
                }
                
                if (historyParams.toString()) {
                    historyUrl += `?${historyParams.toString()}`
                }

                // Fetch ALL data in parallel for maximum speed
                const fetchPromises = [
                    fetch(`/api/admin/tournament/players?${params.toString()}`),
                    fetch(historyUrl)
                ]
                
                // Fetch years on first load only
                if (availableYears.length === 0) {
                    fetchPromises.push(fetch(`/api/players/${playerId}/years`))
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

    // Placeholder - will add rest of the component
    return <div>Player Profile - To be completed</div>
}
