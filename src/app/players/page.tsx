'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Player = {
    id: number
    documentId: string
    full_name: string
    country: string | null
    city: string | null
}

export default function PlayersPage() {
    const router = useRouter()
    const [players, setPlayers] = useState<Player[]>([])
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchPlayers = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const params = new URLSearchParams()
                params.set('pagination[pageSize]', '100')
                params.set('sort[0]', 'full_name:asc')
                params.set('fields[0]', 'full_name')
                params.set('fields[1]', 'country')
                params.set('fields[2]', 'city')
                
                if (search.trim()) {
                    params.set('filters[$or][0][full_name][$containsi]', search)
                    params.set('filters[$or][1][country][$containsi]', search)
                }

                const response = await fetch(`/api/admin/tournament/players?${params.toString()}`)
                if (response.ok) {
                    const data = await response.json()
                    setPlayers(data.data || [])
                } else {
                    setError('Αποτυχία φόρτωσης παικτών')
                }
            } catch (err) {
                setError('Σφάλμα σύνδεσης')
                console.error('Failed to fetch players:', err)
            } finally {
                setIsLoading(false)
            }
        }

        const timer = setTimeout(fetchPlayers, 300)
        return () => clearTimeout(timer)
    }, [search])

    const handlePlayerClick = (documentId: string) => {
        router.push(`/players/${documentId}`)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Κατάλογος Παικτών
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Αναζητήστε και δείτε το ιστορικό των αθλητών
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-2xl mx-auto">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Αναζήτηση παίκτη (όνομα ή χώρα)..."
                            className="w-full px-6 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-lg"
                        />
                        {isLoading && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="text-center py-12">
                        <div className="text-red-600 dark:text-red-400 text-lg">{error}</div>
                    </div>
                )}

                {/* Players Grid */}
                {!error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {players.map((player) => (
                            <button
                                key={player.documentId}
                                onClick={() => handlePlayerClick(player.documentId)}
                                className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-blue-500 text-left"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar Placeholder */}
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                                        {player.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    
                                    {/* Player Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {player.full_name}
                                        </h3>
                                        <div className="flex flex-col gap-1 mt-1">
                                            {player.country && (
                                                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                    <span>🌍</span>
                                                    <span>{player.country}</span>
                                                </div>
                                            )}
                                            {player.city && (
                                                <div className="text-sm text-gray-500 dark:text-gray-500">
                                                    {player.city}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow Icon */}
                                    <div className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && players.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-gray-500 dark:text-gray-400 text-lg">
                            {search ? 'Δεν βρέθηκαν παίκτες' : 'Δεν υπάρχουν παίκτες στη βάση'}
                        </div>
                    </div>
                )}

                {/* Footer Info */}
                <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    {!isLoading && players.length > 0 && (
                        <p>Εμφανίζονται {players.length} παίκτες</p>
                    )}
                </div>
            </div>
        </div>
    )
}