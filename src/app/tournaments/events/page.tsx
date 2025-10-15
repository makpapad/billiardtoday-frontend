'use client'

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import type { EventApiResponse, NormalizedEventStage, StageMatchGroup } from './types'
import {
    toRelationArray,
    normalizeEntity,
    normalizeGroup,
    normalizeResult,
    toNumber,
    formatDateRange,
    formatDateForTable,
    formatNumberValue,
    formatAverage,
    formatOutcomeLabel,
    getMatchRowClass,
    getDateCellClass,
    buildStageMatchGroups,
    buildGroupStandings,
} from './utils'
import GroupStandingsTable from './GroupStandingsTable'

const fetchEvent = async (eventId: string): Promise<EventApiResponse> => {
    const url = `/api/events/${eventId}`
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to fetch event')
    }
    return response.json()
}

function TournamentEventsContent() {
    const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})
    const [eventData, setEventData] = useState<EventApiResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const searchParams = useSearchParams()
    const eventId = searchParams?.get('eventId') ?? null

    // Fetch event data
    useEffect(() => {
        if (!eventId) {
            setEventData(null)
            setError(null)
            return
        }

        console.log('[TournamentEvents] Fetching event:', eventId)
        setIsLoading(true)
        setError(null)

        fetchEvent(eventId)
            .then((data) => {
                console.log('[TournamentEvents] Event data received:', data)
                setEventData(data)
                setIsLoading(false)
            })
            .catch((err) => {
                console.error('[TournamentEvents] Error fetching event:', err)
                setError(err instanceof Error ? err.message : 'Failed to fetch event')
                setIsLoading(false)
            })
    }, [eventId])

    const eventStages = useMemo<NormalizedEventStage[]>(() => {
        if (!eventData?.data?.event_stages) return []

        const stagesArray = toRelationArray(eventData.data.event_stages)

        return stagesArray
            .map((stage, index) => {
                const normalizedStage = normalizeEntity(stage, `stage-${index}`)

                const title = typeof normalizedStage.title === 'string' ? normalizedStage.title.trim() : ''
                const startDate = typeof normalizedStage.start_date === 'string' ? normalizedStage.start_date : null
                const endDate = typeof normalizedStage.end_date === 'string' ? normalizedStage.end_date : null
                const order = toNumber(normalizedStage.order)
                const isFinal = Boolean(normalizedStage.is_final)

                const groupsRaw = toRelationArray(normalizedStage.groups)
                const resultsRaw = toRelationArray(normalizedStage.results)

                const groups = groupsRaw
                    .map((group, groupIndex) => normalizeGroup(group, `${normalizedStage.id}-group-${groupIndex}`))
                    .sort((a, b) => {
                        if (a.number !== null && b.number !== null) return a.number - b.number
                        if (a.number !== null) return -1
                        if (b.number !== null) return 1
                        return a.id.localeCompare(b.id)
                    })

                const results = resultsRaw
                    .map((result, resultIndex) =>
                        normalizeResult(result, `${normalizedStage.id}-result-${resultIndex}`)
                    )
                    .sort((a, b) => {
                        if (a.finalPosition !== null && b.finalPosition !== null)
                            return a.finalPosition - b.finalPosition
                        if (a.finalPosition !== null) return -1
                        if (b.finalPosition !== null) return 1
                        if (a.groupNumber !== null && b.groupNumber !== null) return a.groupNumber - b.groupNumber
                        if (a.groupNumber !== null) return -1
                        if (b.groupNumber !== null) return 1
                        return a.id.localeCompare(b.id)
                    })

                return {
                    id: normalizedStage.id,
                    documentId: normalizedStage.documentId,
                    title,
                    startDate,
                    endDate,
                    order,
                    isFinal,
                    groups,
                    results,
                }
            })
            .sort((a, b) => {
                if (a.order !== null && b.order !== null) return a.order - b.order
                if (a.order !== null) return -1
                if (b.order !== null) return 1
                return a.id.localeCompare(b.id)
            })
    }, [eventData])

    const stageMatchGroups = useMemo<Record<string, StageMatchGroup[]>>(
        () =>
            eventStages.reduce<Record<string, StageMatchGroup[]>>((acc, stage) => {
                acc[stage.id] = buildStageMatchGroups(stage.groups)
                return acc
            }, {}),
        [eventStages]
    )

    const toggleStage = useCallback((stageId: string) => {
        setExpandedStages((prev) => ({ ...prev, [stageId]: !prev[stageId] }))
    }, [])

    const eventInfo = useMemo(() => {
        if (!eventData?.data) return null
        const event = eventData.data
        return {
            title: typeof event.title === 'string' ? event.title : '',
            season: typeof event.season === 'number' ? event.season : null,
            startDate: typeof event.start_date === 'string' ? event.start_date : null,
            endDate: typeof event.end_date === 'string' ? event.end_date : null,
        }
    }, [eventData])

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col gap-4">
                <h1 className="text-2xl font-semibold">Tournament Events</h1>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                    {isLoading && <div className="text-sm text-gray-500 dark:text-gray-400">Φόρτωση...</div>}
                    {error && <div className="text-sm text-red-500 dark:text-red-400">{error}</div>}
                    {!isLoading && !error && !eventId && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Επιλέξτε ένα event από τη λίστα για να δείτε τα στάδια.
                        </div>
                    )}
                    {!isLoading && !error && eventId && eventStages.length === 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Δεν βρέθηκαν stages για αυτό το event.
                        </div>
                    )}
                    {eventInfo && eventStages.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                                <div className="flex flex-col gap-1 mb-4">
                                    <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                        {eventInfo.title}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                        {eventInfo.season && <span>Season {eventInfo.season}</span>}
                                        {formatDateRange(eventInfo.startDate, eventInfo.endDate) && (
                                            <span>{formatDateRange(eventInfo.startDate, eventInfo.endDate)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {eventStages.map((stage: NormalizedEventStage) => {
                                        const stageDateRange = formatDateRange(stage.startDate, stage.endDate)
                                        const displayTitle =
                                            stage.title || (stage.order !== null ? `Stage #${stage.order}` : 'Untitled stage')
                                        const isExpanded = expandedStages[stage.id] ?? false

                                        return (
                                            <div
                                                key={stage.id}
                                                className={clsx(
                                                    'rounded-lg border p-3 transition-colors',
                                                    'border-gray-100 dark:border-gray-800',
                                                    isExpanded
                                                        ? 'bg-blue-50 dark:bg-blue-900/20'
                                                        : 'bg-gray-50 dark:bg-gray-800/60'
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                        {displayTitle}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                        {stage.order !== null && <span>#{stage.order}</span>}
                                                        {stage.isFinal && (
                                                            <span className="font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                                                                Final
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {stageDateRange && (
                                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        {stageDateRange}
                                                    </div>
                                                )}
                                                <div className="mt-3 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleStage(stage.id)}
                                                        className={clsx(
                                                            'inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                                            isExpanded
                                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                                : 'bg-white text-blue-600 hover:bg-blue-50 dark:bg-gray-900 dark:text-blue-400'
                                                        )}
                                                    >
                                                        {isExpanded ? 'Απόκρυψη' : 'Εμφάνιση'}
                                                    </button>
                                                </div>
                                                {isExpanded && (
                                                    <div className="mt-4 flex flex-col gap-6">
                                                        <div className="flex flex-col gap-3">
                                                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                                Αγώνες - {stage.title || stage.order || ''}
                                                            </div>
                                                            {(stageMatchGroups[stage.id] ?? []).length === 0 ? (
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                    Δεν υπάρχουν αγώνες
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-6">
                                                                    {(stageMatchGroups[stage.id] ?? []).map((group) => (
                                                                        <div key={group.key} className="flex flex-col gap-2">
                                                                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                                                <div className="font-semibold text-gray-700 dark:text-gray-200">
                                                                                    Όμιλος {group.number ?? '?'}
                                                                                </div>
                                                                            </div>
                                                                            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                                                                <table className="min-w-full text-xs">
                                                                                    <thead className="bg-blue-600 text-white">
                                                                                        <tr>
                                                                                            <th className="px-4 py-2 font-medium">Παίκτης</th>
                                                                                            <th className="px-4 py-2 font-medium">Ημερομηνία</th>
                                                                                            <th className="px-4 py-2 font-medium">Νικητής</th>
                                                                                            <th className="px-4 py-2 font-medium">Πόντοι</th>
                                                                                            <th className="px-4 py-2 font-medium">Innings</th>
                                                                                            <th className="px-4 py-2 font-medium">Μέσος</th>
                                                                                            <th className="px-4 py-2 font-medium">High Run</th>
                                                                                            <th className="px-4 py-2 font-medium">High Run 2</th>
                                                                                            <th className="px-4 py-2 font-medium">Βαθμοί</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {group.matches.map((match) => (
                                                                                            <Fragment key={match.key}>
                                                                                                <tr
                                                                                                    className={clsx(
                                                                                                        'border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200',
                                                                                                        getMatchRowClass(match.top.outcome)
                                                                                                    )}
                                                                                                >
                                                                                                    <td className="px-4 py-2 font-medium">
                                                                                                        {match.top.player.name || 'Άγνωστος'}
                                                                                                    </td>
                                                                                                    <td
                                                                                                        className={clsx('px-4 py-2', getDateCellClass())}
                                                                                                        rowSpan={2}
                                                                                                    >
                                                                                                        {formatDateForTable(match.dateTime)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center font-semibold">
                                                                                                        {formatOutcomeLabel(match.top.outcome)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatNumberValue(match.top.player.points)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatNumberValue(match.top.player.innings)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatAverage(
                                                                                                            match.top.player.points,
                                                                                                            match.top.player.innings
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatNumberValue(match.top.player.highRun)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatNumberValue(match.top.player.highRun2)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatNumberValue(match.top.player.matchPoints)}
                                                                                                    </td>
                                                                                                </tr>
                                                                                                <tr
                                                                                                    className={clsx(
                                                                                                        'border-t-2 border-b-4 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200',
                                                                                                        getMatchRowClass(match.bottom.outcome)
                                                                                                    )}
                                                                                                >
                                                                                                    <td className="px-4 py-2 font-medium">
                                                                                                        {match.bottom.player.name || 'Άγνωστος'}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center font-semibold">
                                                                                                        {formatOutcomeLabel(match.bottom.outcome)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatNumberValue(match.bottom.player.points)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatNumberValue(match.bottom.player.innings)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatAverage(
                                                                                                            match.bottom.player.points,
                                                                                                            match.bottom.player.innings
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatNumberValue(match.bottom.player.highRun)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatNumberValue(match.bottom.player.highRun2)}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-center">
                                                                                                        {formatNumberValue(match.bottom.player.matchPoints)}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            </Fragment>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                            <GroupStandingsTable
                                                                                standings={buildGroupStandings(group.matches)}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function TournamentEventsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8">Φόρτωση...</div>}>
            <TournamentEventsContent />
        </Suspense>
    )
}
