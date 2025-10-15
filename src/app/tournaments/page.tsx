'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Tournament = {
    id: string
    documentId: string
    title: string
    season: number | null
    start_date: string | null
    end_date: string | null
}

type TournamentsResponse = {
    data: Tournament[]
    meta: {
        pagination: {
            page: number
            pageSize: number
            pageCount: number
            total: number
        }
    }
}

function TournamentsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10, pageCount: 1, total: 0 })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchSeason, setSearchSeason] = useState('')

    const currentPage = parseInt(searchParams?.get('page') || '1')
    const currentSeason = searchParams?.get('season') || ''

    useEffect(() => {
        setSearchSeason(currentSeason)
    }, [currentSeason])

    useEffect(() => {
        const fetchTournaments = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const params = new URLSearchParams()
                params.set('page', currentPage.toString())
                params.set('pageSize', '10')
                if (currentSeason) {
                    params.set('season', currentSeason)
                }

                const response = await fetch(`/api/tournaments?${params.toString()}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch tournaments')
                }

                const data: TournamentsResponse = await response.json()
                setTournaments(data.data || [])
                setPagination(data.meta?.pagination || { page: 1, pageSize: 10, pageCount: 1, total: 0 })
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch tournaments')
            } finally {
                setIsLoading(false)
            }
        }

        fetchTournaments()
    }, [currentPage, currentSeason])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams()
        params.set('page', '1')
        if (searchSeason) {
            params.set('season', searchSeason)
        }
        router.push(`/tournaments?${params.toString()}`)
    }

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams()
        params.set('page', newPage.toString())
        if (currentSeason) {
            params.set('season', currentSeason)
        }
        router.push(`/tournaments?${params.toString()}`)
    }

    const formatDate = (date: string | null) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('el-GR')
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Τουρνουά</h1>
                </div>

                {/* Search Form */}
                <form onSubmit={handleSearch} className="flex gap-4 items-end">
                    <div className="flex-1 max-w-xs">
                        <label htmlFor="season" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Αναζήτηση ανά έτος
                        </label>
                        <input
                            type="number"
                            id="season"
                            value={searchSeason}
                            onChange={(e) => setSearchSeason(e.target.value)}
                            placeholder="π.χ. 2019"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Αναζήτηση
                    </button>
                    {currentSeason && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchSeason('')
                                router.push('/tournaments?page=1')
                            }}
                            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Καθαρισμός
                        </button>
                    )}
                </form>

                {/* Loading State */}
                {isLoading && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Φόρτωση...
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="text-center py-8 text-red-500 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Tournaments List */}
                {!isLoading && !error && tournaments.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Τίτλος
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Έτος
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Ημερομηνία Έναρξης
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Ημερομηνία Λήξης
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Ενέργειες
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {tournaments.map((tournament) => (
                                    <tr key={tournament.documentId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {tournament.title}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {tournament.season || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(tournament.start_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(tournament.end_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <Link
                                                href={`/tournaments/events?eventId=${tournament.documentId}`}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                Προβολή
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && tournaments.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Δεν βρέθηκαν τουρνουά
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && !error && tournaments.length > 0 && pagination.pageCount > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Σελίδα <span className="font-medium">{pagination.page}</span> από{' '}
                            <span className="font-medium">{pagination.pageCount}</span>
                            {' '}(Σύνολο: {pagination.total} τουρνουά)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Προηγούμενη
                            </button>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.pageCount}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Επόμενη
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function TournamentsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8">Φόρτωση...</div>}>
            <TournamentsContent />
        </Suspense>
    )
}
