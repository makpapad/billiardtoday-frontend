'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { CmsAppearance, CmsTournamentListSection } from '@/lib/cms/types'
import { getCmsContainerStyle } from '@/lib/cms/layout'
import { getCmsSectionPaddingClass, getCmsSectionSurfaceStyle } from '@/lib/cms/sectionStyles'

type Tournament = {
    id: string
    documentId: string
    title: string
    season: number | null
    start_date: string | null
    end_date: string | null
}

type TournamentResponse = {
    data: Tournament[]
    meta?: {
        pagination?: {
            page: number
            pageSize: number
            pageCount: number
            total: number
        }
    }
}

type Props = {
    section: CmsTournamentListSection
    appearance: CmsAppearance
    embedded?: boolean
}

const EMPTY_PAGINATION = {
    page: 1,
    pageSize: 10,
    pageCount: 1,
    total: 0,
}

const toPositiveInt = (value: string | null, fallback: number) => {
    const parsed = Number.parseInt(value || '', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('el-GR')
}

const getStatus = (startDate: string | null, endDate: string | null) => {
    const now = new Date()
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    if (start && start > now) return 'Upcoming'
    if (end && end < now) return 'Completed'
    if (start || end) return 'Live'
    return 'Scheduled'
}

export function TournamentListSection({
    section,
    appearance,
    embedded = false,
}: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [items, setItems] = useState<Tournament[]>([])
    const [pagination, setPagination] = useState(EMPTY_PAGINATION)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [seasonInput, setSeasonInput] = useState('')

    const itemsPerPage = section.itemsPerPage && section.itemsPerPage > 0 ? section.itemsPerPage : 10
    const currentPage = toPositiveInt(searchParams.get('page'), 1)
    const currentSeason = searchParams.get('season') || ''
    const isCards = section.layout === 'cards'
    const { tokens } = appearance

    useEffect(() => {
        setSeasonInput(currentSeason)
    }, [currentSeason])

    useEffect(() => {
        let mounted = true

        const fetchTournaments = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const params = new URLSearchParams()
                params.set('page', String(currentPage))
                params.set('pageSize', String(itemsPerPage))
                if (currentSeason) params.set('season', currentSeason)

                const response = await fetch(`/api/tournaments?${params.toString()}`, {
                    cache: 'no-store',
                })
                if (!response.ok) {
                    const errorText = await response.text().catch(() => '')
                    throw new Error(errorText || 'Failed to fetch tournaments')
                }

                const payload = (await response.json()) as TournamentResponse
                if (!mounted) return

                setItems(Array.isArray(payload.data) ? payload.data : [])
                setPagination(payload.meta?.pagination || { ...EMPTY_PAGINATION, pageSize: itemsPerPage })
            } catch (fetchError) {
                if (!mounted) return
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch tournaments')
                setItems([])
                setPagination({ ...EMPTY_PAGINATION, pageSize: itemsPerPage })
            } finally {
                if (mounted) setIsLoading(false)
            }
        }

        fetchTournaments()

        return () => {
            mounted = false
        }
    }, [currentPage, currentSeason, itemsPerPage])

    const basePath = pathname || '/tournaments'
    const tournamentEventHref = (eventDocumentId: string) =>
        embedded
            ? `/embed/tournaments/events?eventId=${encodeURIComponent(eventDocumentId)}`
            : `/tournaments/events?eventId=${encodeURIComponent(eventDocumentId)}`

    const updateQuery = (nextPage: number, nextSeason: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', String(nextPage))
        if (nextSeason) {
            params.set('season', nextSeason)
        } else {
            params.delete('season')
        }

        const query = params.toString()
        router.push(query ? `${basePath}?${query}` : basePath)
    }

    const handleSearch = (event: React.FormEvent) => {
        event.preventDefault()
        updateQuery(1, seasonInput.trim())
    }

    const handlePageChange = (nextPage: number) => {
        updateQuery(nextPage, currentSeason)
    }

    const wrapperClass = embedded
        ? 'px-0 py-0'
        : `px-4 ${getCmsSectionPaddingClass(section.paddingY)} sm:px-6`

    const panelClass = embedded
        ? 'rounded-[24px] border border-black/5 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]'
        : 'rounded-[28px] border border-black/5 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.08)]'

    const statusTone = useMemo(
        () => ({
            Upcoming: 'bg-amber-100 text-amber-800',
            Live: 'bg-emerald-100 text-emerald-800',
            Completed: 'bg-slate-200 text-slate-700',
            Scheduled: 'bg-sky-100 text-sky-800',
        }),
        [],
    )

    return (
        <section className={wrapperClass} style={getCmsSectionSurfaceStyle(section, appearance)}>
            <div
                className="mx-auto"
                style={embedded ? { width: '100%', maxWidth: '100%' } : getCmsContainerStyle(appearance, 'page')}
            >
                {section.title || section.subtitle ? (
                    <div className="mb-8">
                        {section.title ? (
                            <h2
                                className="text-3xl font-semibold tracking-tight sm:text-4xl"
                                style={{ fontFamily: tokens.headingFont }}
                            >
                                {section.title}
                            </h2>
                        ) : null}
                        {section.subtitle ? (
                            <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
                                {section.subtitle}
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {section.showSeasonFilter ? (
                    <form
                        onSubmit={handleSearch}
                        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
                        style={{ alignItems: 'flex-end' }}
                    >
                        <div
                            className="w-full sm:flex-none"
                            style={{ width: '220px', maxWidth: '100%', flex: '0 0 220px' }}
                        >
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Season
                            </label>
                            <input
                                type="number"
                                value={seasonInput}
                                onChange={(event) => setSeasonInput(event.target.value)}
                                placeholder="e.g. 2025"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div
                            className="flex flex-wrap gap-2 sm:flex-none"
                            style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}
                        >
                            <button
                                type="submit"
                                className="inline-flex min-w-[110px] items-center justify-center whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                                style={{ background: tokens.primary, minWidth: '110px', height: '48px', flexShrink: 0 }}
                            >
                                Filter
                            </button>
                            {currentSeason ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSeasonInput('')
                                        updateQuery(1, '')
                                    }}
                                    className="inline-flex min-w-[110px] items-center justify-center whitespace-nowrap rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    style={{ minWidth: '110px', height: '48px', flexShrink: 0 }}
                                >
                                    Clear
                                </button>
                            ) : null}
                        </div>
                    </form>
                ) : null}

                {isLoading ? (
                    <div className={`${panelClass} px-6 py-10 text-center text-sm text-slate-500`}>
                        Loading tournaments...
                    </div>
                ) : error ? (
                    <div className={`${panelClass} px-6 py-10 text-center text-sm text-red-600`}>
                        {error}
                    </div>
                ) : items.length === 0 ? (
                    <div className={`${panelClass} px-6 py-10 text-center text-sm text-slate-500`}>
                        {section.emptyStateText || 'No tournaments found.'}
                    </div>
                ) : isCards ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((item) => {
                            const status = getStatus(item.start_date, item.end_date)
                            return (
                                <article
                                    key={item.documentId}
                                    className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3
                                                className="text-xl font-semibold tracking-tight text-slate-950"
                                                style={{ fontFamily: tokens.headingFont }}
                                            >
                                                {item.title}
                                            </h3>
                                            <p className="mt-2 text-sm text-slate-500">
                                                Season {item.season || '-'}
                                            </p>
                                        </div>
                                        {section.showStatus ? (
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[status]}`}>
                                                {status}
                                            </span>
                                        ) : null}
                                    </div>
                                    {section.showDate ? (
                                        <div className="mt-4 space-y-1 text-sm text-slate-600">
                                            <div>Start: {formatDate(item.start_date)}</div>
                                            <div>End: {formatDate(item.end_date)}</div>
                                        </div>
                                    ) : null}
                                    {section.showResultsLink ? (
                                        <div className="mt-5">
                                            <Link
                                                href={tournamentEventHref(item.documentId)}
                                                className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                            >
                                                View tournament
                                            </Link>
                                        </div>
                                    ) : null}
                                </article>
                            )
                        })}
                    </div>
                ) : (
                    <div className={`${panelClass} overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            Title
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            Season
                                        </th>
                                        {section.showDate ? (
                                            <>
                                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                    Start
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                    End
                                                </th>
                                            </>
                                        ) : null}
                                        {section.showStatus ? (
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Status
                                            </th>
                                        ) : null}
                                        {section.showResultsLink ? (
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Action
                                            </th>
                                        ) : null}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {items.map((item) => {
                                        const status = getStatus(item.start_date, item.end_date)
                                        return (
                                            <tr key={item.documentId} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                                    {item.title}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {item.season || '-'}
                                                </td>
                                                {section.showDate ? (
                                                    <>
                                                        <td className="px-6 py-4 text-sm text-slate-600">
                                                            {formatDate(item.start_date)}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600">
                                                            {formatDate(item.end_date)}
                                                        </td>
                                                    </>
                                                ) : null}
                                                {section.showStatus ? (
                                                    <td className="px-6 py-4 text-sm">
                                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[status]}`}>
                                                            {status}
                                                        </span>
                                                    </td>
                                                ) : null}
                                                {section.showResultsLink ? (
                                                    <td className="px-6 py-4 text-sm">
                                                        <Link
                                                            href={tournamentEventHref(item.documentId)}
                                                            className="font-semibold text-sky-700 transition hover:text-sky-900"
                                                        >
                                                            View tournament
                                                        </Link>
                                                    </td>
                                                ) : null}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {pagination.pageCount > 1 ? (
                    <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-black/5 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            Page <span className="font-semibold">{pagination.page}</span> of{' '}
                            <span className="font-semibold">{pagination.pageCount}</span>
                            {' · '}
                            {pagination.total} tournaments
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.pageCount}
                                className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </section>
    )
}
