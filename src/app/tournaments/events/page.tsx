'use client'

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
import SingleElimBracket, { type BracketRoundView } from './SingleElimBracket'

type TournamentEventsContentProps = {
    eventIdOverride?: string | null
    embeddedOverride?: boolean
    showStandaloneTitle?: boolean
    showEventHeader?: boolean
    emptyStateMessage?: string
}

const fetchEvent = async (eventId: string): Promise<EventApiResponse> => {
    const url = `/api/events/${eventId}`
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to fetch event')
    }
    return response.json()
}

export function TournamentEventsContent({
    eventIdOverride = null,
    embeddedOverride,
    showStandaloneTitle = true,
    showEventHeader = true,
    emptyStateMessage = 'Select a tournament event from the list to view its stages.',
}: TournamentEventsContentProps = {}) {
    const [activeStageId, setActiveStageId] = useState<string | null>(null)
    const [eventData, setEventData] = useState<EventApiResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [brMatchesByStage, setBrMatchesByStage] = useState<Record<string, unknown[]>>({})
    const [brLoadingByStage, setBrLoadingByStage] = useState<Record<string, boolean>>({})
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const eventId = eventIdOverride ?? searchParams?.get('eventId') ?? null
    const embedded = embeddedOverride ?? (pathname?.startsWith('/embed/') ?? false)
    const playerProfileHref = (playerId: string | number, playerName: string) =>
        `${embedded ? '/embed' : ''}/players/${String(playerId)}-${playerName.trim().replace(/\s+/g, '-')}`

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
                const stageType =
                    typeof normalizedStage.stage_type === 'string'
                        ? normalizedStage.stage_type.trim()
                        : null

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
                    stageType,
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

    // Set first stage as active when stages load
    useEffect(() => {
        if (eventStages.length > 0 && !activeStageId) {
            setActiveStageId(eventStages[0].id)
        }
    }, [eventStages, activeStageId])

    const activeStage = useMemo(
        () => eventStages.find((stage) => stage.id === activeStageId) ?? null,
        [eventStages, activeStageId],
    )

    const normalizeBracketPlayer = useCallback((player: unknown): { name: string } => {
        try {
            const src =
                player && typeof player === 'object' && 'data' in (player as Record<string, unknown>)
                    ? ((player as { data?: unknown }).data ?? player)
                    : player
            const attr =
                src && typeof src === 'object' && 'attributes' in (src as Record<string, unknown>)
                    ? ((src as { attributes?: Record<string, unknown> }).attributes ?? src)
                    : src

            if (!attr || typeof attr !== 'object') return { name: '' }
            const fullName = (attr as Record<string, unknown>).full_name
            return { name: typeof fullName === 'string' ? fullName : '' }
        } catch {
            return { name: '' }
        }
    }, [])

    const fetchBracketMatches = useCallback(async (stageDocumentId: string) => {
        if (!stageDocumentId) return
        setBrLoadingByStage((prev) => ({ ...prev, [stageDocumentId]: true }))
        try {
            const res = await fetch(`/api/event-stages/${encodeURIComponent(stageDocumentId)}/matches`, {
                cache: 'no-store',
            })
            const text = await res.text()
            if (!res.ok) throw new Error(text || 'Failed to load bracket matches')
            const json = JSON.parse(text)
            const arr = Array.isArray(json?.matches) ? (json.matches as unknown[]) : []
            setBrMatchesByStage((prev) => ({ ...prev, [stageDocumentId]: arr }))
        } catch (e) {
            console.warn('[TournamentEvents] Failed to fetch bracket matches:', e)
            setBrMatchesByStage((prev) => ({ ...prev, [stageDocumentId]: [] }))
        } finally {
            setBrLoadingByStage((prev) => ({ ...prev, [stageDocumentId]: false }))
        }
    }, [])

    useEffect(() => {
        if (!activeStage || activeStage.stageType !== 'brackets') return
        if (brMatchesByStage[activeStage.documentId]) return
        void fetchBracketMatches(activeStage.documentId)
    }, [activeStage, brMatchesByStage, fetchBracketMatches])

    const activeBracketRounds = useMemo<BracketRoundView[]>(() => {
        if (!activeStage || activeStage.stageType !== 'brackets') return []
        const sourceRaw = brMatchesByStage[activeStage.documentId]
        const source = Array.isArray(sourceRaw) ? sourceRaw : []
        if (source.length === 0) return []

        const canonicalizeRound = (raw: string): string => {
            const upper = (raw || '').toUpperCase().trim()
            if (!upper) return ''
            if (upper === 'R32' || upper.includes('ROUND OF 32')) return 'R32'
            if (upper === 'R16' || upper.includes('ROUND OF 16') || upper.includes('LAST 16')) return 'R16'
            if (upper === 'R8' || upper.includes('QUARTER')) return 'QF'
            if (upper === 'R4' || upper.includes('SEMI')) return 'SF'
            if (upper === 'R2' || upper === 'F' || upper.includes('FINAL')) return 'F'
            const m = upper.match(/^R(\d+)$/)
            if (m) {
                const n = Number(m[1])
                if (n === 8) return 'QF'
                if (n === 4) return 'SF'
                if (n === 2) return 'F'
                return `R${n}`
            }
            return upper
        }

        const byRound = new Map<string, unknown[]>()
        source.forEach((m) => {
            const bracket = typeof (m as { bracket_type?: unknown }).bracket_type === 'string'
                ? (m as { bracket_type: string }).bracket_type
                : 'winners'
            if (bracket !== 'winners') return
            const rawRound = typeof (m as { round?: unknown }).round === 'string' ? (m as { round: string }).round : ''
            const label = canonicalizeRound(rawRound)
            if (!label) return
            const arr = byRound.get(label) ?? []
            arr.push(m)
            byRound.set(label, arr)
        })

        const roundPriority: Record<string, number> = { R32: 0, R16: 1, QF: 2, SF: 3, F: 4 }
        const orderedLabels = Array.from(byRound.keys()).sort((a, b) => {
            const pa = roundPriority[a] ?? 100
            const pb = roundPriority[b] ?? 100
            if (pa !== pb) return pa - pb
            return (byRound.get(b)?.length ?? 0) - (byRound.get(a)?.length ?? 0)
        })

        const idByRoundAndNumber = new Map<string, Map<number, string>>()
        orderedLabels.forEach((label) => {
            const inner = new Map<number, string>()
            const arr = (byRound.get(label) ?? [])
                .slice()
                .sort((a, b) => (toNumber((a as { match_number?: unknown }).match_number) ?? 0) - (toNumber((b as { match_number?: unknown }).match_number) ?? 0))
            arr.forEach((m) => {
                const num = toNumber((m as { match_number?: unknown }).match_number) ?? 0
                const id = (m as { id?: unknown }).id
                if (num > 0 && id !== undefined && id !== null) inner.set(num, String(id))
            })
            idByRoundAndNumber.set(label, inner)
        })

        return orderedLabels.map((label, idx) => {
            const nextLabel = orderedLabels[idx + 1] || null
            const nextMap = nextLabel ? idByRoundAndNumber.get(nextLabel) : undefined
            const arr = (byRound.get(label) ?? [])
                .slice()
                .sort((a, b) => (toNumber((a as { match_number?: unknown }).match_number) ?? 0) - (toNumber((b as { match_number?: unknown }).match_number) ?? 0))

            return {
                label,
                matches: arr.map((m) => {
                    const matchNumber = toNumber((m as { match_number?: unknown }).match_number) ?? 0
                    const sourceTag = (m as { source?: unknown }).source
                    const p1 = normalizeBracketPlayer((m as { player1?: unknown }).player1)
                    const p2 = normalizeBracketPlayer((m as { player2?: unknown }).player2)
                    return {
                        id: String((m as { id?: unknown }).id ?? ''),
                        player1: p1.name || '',
                        player2: p2.name || '',
                        score1: toNumber((m as { player1_points?: unknown; player1_match_points?: unknown }).player1_points)
                            ?? toNumber((m as { player1_match_points?: unknown }).player1_match_points),
                        score2: toNumber((m as { player2_points?: unknown; player2_match_points?: unknown }).player2_points)
                            ?? toNumber((m as { player2_match_points?: unknown }).player2_match_points),
                        innings1: toNumber((m as { player1_innings?: unknown }).player1_innings),
                        innings2: toNumber((m as { player2_innings?: unknown }).player2_innings),
                        tieBreak1: toNumber((m as { player1_tie_break?: unknown }).player1_tie_break),
                        tieBreak2: toNumber((m as { player2_tie_break?: unknown }).player2_tie_break),
                        date: typeof (m as { date_time?: unknown }).date_time === 'string'
                            ? ((m as { date_time: string }).date_time)
                            : null,
                        nextMatchId: nextMap && matchNumber > 0 ? nextMap.get(Math.ceil(matchNumber / 2)) : undefined,
                        byeTop: sourceTag === 'bye-1',
                        byeBottom: sourceTag === 'bye-2',
                        ffTop: sourceTag === 'ff-1' || sourceTag === 'double-ff',
                        ffBottom: sourceTag === 'ff-2' || sourceTag === 'double-ff',
                    }
                }),
            }
        })
    }, [activeStage, brMatchesByStage, normalizeBracketPlayer])

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
        <div className="mx-auto w-full px-4 py-8" style={{ maxWidth: 'var(--bt-page-width, 1280px)' }}>
            <div className="flex flex-col gap-4">
                {showStandaloneTitle ? <h1 className="text-2xl font-semibold">Tournament Events</h1> : null}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                    {isLoading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>}
                    {error && <div className="text-sm text-red-500 dark:text-red-400">{error}</div>}
                    {!isLoading && !error && !eventId && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {emptyStateMessage}
                        </div>
                    )}
                    {!isLoading && !error && eventId && eventStages.length === 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            No stages found for this event.
                        </div>
                    )}
                    {eventInfo && eventStages.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                                {showEventHeader ? (
                                    <div className="mb-4 flex flex-col gap-1">
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
                                ) : null}
                                {/* Tabs */}
                                <div className="border-b border-gray-200 dark:border-gray-700">
                                    <nav className="flex gap-2 overflow-x-auto" aria-label="Tabs">
                                        {eventStages.map((stage: NormalizedEventStage) => {
                                            const displayTitle =
                                                stage.title || (stage.order !== null ? `Stage #${stage.order}` : 'Untitled stage')
                                            const isActive = activeStageId === stage.id

                                            return (
                                                <button
                                                    key={stage.id}
                                                    onClick={() => setActiveStageId(stage.id)}
                                                    className={clsx(
                                                        'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                                                        isActive
                                                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span>{displayTitle}</span>
                                                        {stage.isFinal && (
                                                            <span className="text-xs font-semibold uppercase tracking-wide">
                                                                Final
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </nav>
                                </div>
                                {/* Tab Content */}
                                <div className="mt-4">
                                    {eventStages.map((stage: NormalizedEventStage) => {
                                        if (activeStageId !== stage.id) return null
                                        
                                        const stageDateRange = formatDateRange(stage.startDate, stage.endDate)

                                        return (
                                            <div key={stage.id} className="flex flex-col gap-4">
                                                {stageDateRange && (
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {stageDateRange}
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-6">
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex flex-col gap-3">
                                                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                                Matches - {stage.title || stage.order || ''}
                                                            </div>
                                                            {stage.stageType === 'brackets' ? (
                                                                brLoadingByStage[stage.documentId] ? (
                                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                        Loading bracket...
                                                                    </div>
                                                                ) : activeBracketRounds.length > 0 ? (
                                                                    <SingleElimBracket rounds={activeBracketRounds} />
                                                                ) : (
                                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                        No bracket matches
                                                                    </div>
                                                                )
                                                            ) : (stageMatchGroups[stage.id] ?? []).length === 0 ? (
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                    No matches
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
                                                                                            <th className="px-4 py-2 font-medium">Player</th>
                                                                                            <th className="px-4 py-2 font-medium">Date</th>
                                                                                            <th className="px-4 py-2 font-medium">Result</th>
                                                                                            <th className="px-4 py-2 font-medium">Points</th>
                                                                                            <th className="px-4 py-2 font-medium">Innings</th>
                                                                                            <th className="px-4 py-2 font-medium">Average</th>
                                                                                            <th className="px-4 py-2 font-medium">High Run</th>
                                                                                            <th className="px-4 py-2 font-medium">High Run 2</th>
                                                                                            <th className="px-4 py-2 font-medium">Match Points</th>
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
                                                                                                        {match.top.player.id ? (
                                                                                                            <Link
                                                                                                                href={playerProfileHref(match.top.player.id, match.top.player.name)}
                                                                                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                                                                                            >
                                                                                                                <div className="flex flex-col leading-tight">
                                                                                                                    <span>{match.top.player.name || 'Unknown'}</span>
                                                                                                                    {match.top.player.nativeName &&
                                                                                                                        match.top.player.nativeName.trim() !== match.top.player.name.trim() && (
                                                                                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                                                                                                {match.top.player.nativeName}
                                                                                                                            </span>
                                                                                                                        )}
                                                                                                                </div>
                                                                                                            </Link>
                                                                                                        ) : (
                                                                                                            <div className="flex flex-col leading-tight">
                                                                                                                <span>{match.top.player.name || 'Unknown'}</span>
                                                                                                                {match.top.player.nativeName &&
                                                                                                                    match.top.player.nativeName.trim() !== match.top.player.name.trim() && (
                                                                                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                                                                                            {match.top.player.nativeName}
                                                                                                                        </span>
                                                                                                                    )}
                                                                                                            </div>
                                                                                                        )}
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
                                                                                                        {match.bottom.player.id ? (
                                                                                                            <Link
                                                                                                                href={playerProfileHref(match.bottom.player.id, match.bottom.player.name)}
                                                                                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                                                                                            >
                                                                                                                <div className="flex flex-col leading-tight">
                                                                                                                    <span>{match.bottom.player.name || 'Unknown'}</span>
                                                                                                                    {match.bottom.player.nativeName &&
                                                                                                                        match.bottom.player.nativeName.trim() !== match.bottom.player.name.trim() && (
                                                                                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                                                                                                {match.bottom.player.nativeName}
                                                                                                                            </span>
                                                                                                                        )}
                                                                                                                </div>
                                                                                                            </Link>
                                                                                                        ) : (
                                                                                                            <div className="flex flex-col leading-tight">
                                                                                                                <span>{match.bottom.player.name || 'Unknown'}</span>
                                                                                                                {match.bottom.player.nativeName &&
                                                                                                                    match.bottom.player.nativeName.trim() !== match.bottom.player.name.trim() && (
                                                                                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                                                                                            {match.bottom.player.nativeName}
                                                                                                                        </span>
                                                                                                                    )}
                                                                                                            </div>
                                                                                                        )}
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
                                                                                embedded={embedded}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
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
