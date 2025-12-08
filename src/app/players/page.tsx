'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCountryFlagPath } from '@/lib/countryFlags'

type Player = {
    id: number
    documentId: string
    full_name: string
    full_name_en?: string | null
    country: string | null
    city: string | null
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

const getPlayerDisplayName = (player: Player): string => {
    const nameEn = typeof player.full_name_en === 'string' ? player.full_name_en.trim() : ''
    const native = player.full_name.trim()
    return nameEn || native
}

const getPlayerNativeName = (player: Player): string | null => {
    const native = player.full_name.trim()
    const preferred = getPlayerDisplayName(player)
    if (!native || native === preferred) return null
    return native
}

export default function PlayersPage() {
    const router = useRouter()
    const [players, setPlayers] = useState<Player[]>([])
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

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
                params.set('fields[3]', 'full_name_en')
                params.set('populate[photo_main][fields][0]', 'url')

                if (search.trim()) {
                    params.set('filters[$or][0][full_name][$containsi]', search)
                    params.set(
                        'filters[$or][1][full_name_en][$containsi]',
                        search,
                    )
                    params.set('filters[$or][2][country][$containsi]', search)
                }

                const response = await fetch(
                    `${basePath}/api/admin/tournament/players?${params.toString()}`,
                )
                if (response.ok) {
                    const data = await response.json()
                    setPlayers(data.data || [])
                } else {
                    setError('Failed to load players')
                }
            } catch (err) {
                setError('Connection error')
                console.error('Failed to fetch players:', err)
            } finally {
                setIsLoading(false)
            }
        }

        const timer = setTimeout(fetchPlayers, 300)
        return () => clearTimeout(timer)
    }, [search, basePath])

    const handlePlayerClick = (player: Player) => {
        const pathId = String(player.id)
        const baseName = getPlayerDisplayName(player)
        const slugName = baseName.replace(/\s+/g, '-')
        const slug = slugName ? `${pathId}-${slugName}` : pathId
        const url = `/players/${slug}`
        router.push(url)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Players Directory
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Browse and view player profiles and history
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-2xl mx-auto">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search player (name or country)..."
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
                        <div className="text-red-600 dark:text-red-400 text-lg">
                            {error}
                        </div>
                    </div>
                )}

                {/* Players Grid */}
                {!error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {players.map((player) => (
                            <button
                                key={player.documentId}
                                onClick={() => handlePlayerClick(player)}
                                className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-blue-500 text-left"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Player Photo */}
                                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600">
                                        {(() => {
                                            const photoUrl = getPhotoUrl(
                                                player.photo_main,
                                            )
                                            return photoUrl ? (
                                                <img
                                                    src={photoUrl}
                                                    alt={getPlayerDisplayName(player)}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                                                    {getPlayerDisplayName(player)
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                            )
                                        })()}
                                    </div>

                                    {/* Player Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {getPlayerDisplayName(player)}
                                            </span>
                                            {getPlayerNativeName(player) && (
                                                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                    {getPlayerNativeName(player)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1 mt-1">
                                            {player.country && (
                                                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                    {(() => {
                                                        const flagPath =
                                                            getCountryFlagPath(
                                                                player.country,
                                                            )
                                                        return flagPath ? (
                                                            <img
                                                                src={flagPath}
                                                                alt={
                                                                    player.country
                                                                }
                                                                width={24}
                                                                height={18}
                                                                className="rounded shadow-sm"
                                                            />
                                                        ) : (
                                                            <span>🌍</span>
                                                        )
                                                    })()}
                                                    <span>
                                                        {player.country}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow Icon */}
                                    <div className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        <svg
                                            className="w-6 h-6"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                            />
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
                            {search
                                ? 'No players found for this search.'
                                : 'There are no players in the database yet.'}
                        </div>
                    </div>
                )}

                {/* Footer Info */}
                <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    {!isLoading && players.length > 0 && (
                        <p>Showing {players.length} players</p>
                    )}
                </div>
            </div>
        </div>
    )
}