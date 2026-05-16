import { NextRequest, NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/serverEnv'

export const runtime = 'nodejs'

const IS_PRODUCTION = (getServerEnv('NODE_ENV') || process.env.NODE_ENV) === 'production'
const STRAPI_URL =
    getServerEnv('STRAPI_API_URL') ||
    (IS_PRODUCTION ? 'http://127.0.0.1:1337' : getServerEnv('NEXT_PUBLIC_STRAPI_URL')) ||
    'http://localhost:1337'
const STRAPI_API_TOKEN = getServerEnv('STRAPI_API_TOKEN') || process.env.STRAPI_API_TOKEN

const fetchWithOptionalAuth = async (url: string): Promise<Response> => {
    const withAuth = await fetch(url, {
        headers: STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : undefined,
        cache: 'no-store',
    })

    if (
        STRAPI_API_TOKEN &&
        !withAuth.ok &&
        (withAuth.status === 401 || withAuth.status === 403)
    ) {
        return fetch(url, { cache: 'no-store' })
    }

    return withAuth
}

const fetchStoredStageResults = async (stageId: string): Promise<Record<string, unknown>[] | null> => {
    const url = new URL(`${STRAPI_URL}/api/bt-results`)
    url.searchParams.set('filters[event_stage][documentId][$eq]', stageId)
    url.searchParams.set('populate[player][fields][0]', 'full_name')
    url.searchParams.set('populate[player][fields][1]', 'documentId')
    url.searchParams.set('populate[player][fields][2]', 'full_name_en')
    url.searchParams.set('populate[player][fields][3]', 'country')
    url.searchParams.set('fields[0]', 'match_points')
    url.searchParams.set('fields[1]', 'points')
    url.searchParams.set('fields[2]', 'innings')
    url.searchParams.set('fields[3]', 'best_average')
    url.searchParams.set('fields[4]', 'high_run')
    url.searchParams.set('fields[5]', 'high_run_2')
    url.searchParams.set('fields[6]', 'group_number')
    url.searchParams.set('fields[7]', 'group_position')
    url.searchParams.set('fields[8]', 'final_position')
    url.searchParams.set('fields[9]', 'documentId')
    url.searchParams.set('fields[10]', 'qualified')
    url.searchParams.set('fields[11]', 'qualification_type')
    url.searchParams.set('fields[12]', 'source')
    url.searchParams.set('pagination[pageSize]', '1000')
    url.searchParams.set('sort[0]', 'group_number:asc')
    url.searchParams.set('sort[1]', 'final_position:asc')
    url.searchParams.set('sort[2]', 'group_position:asc')

    const res = await fetchWithOptionalAuth(url.toString())
    if (!res.ok) return null
    const payload = (await res.json().catch(() => null)) as { data?: unknown[] } | null
    const rows = Array.isArray(payload?.data)
        ? payload.data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
        : []
    return rows.length > 0 ? rows : null
}

const toText = (value: unknown): string | null => {
    const text = String(value ?? '').trim()
    return text || null
}

const asObject = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : null

const asArray = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value)
        ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        : []

const fetchStageMatches = async (stageId: string): Promise<Record<string, unknown>[] | null> => {
    const fetchMatches = (id: string) =>
        fetchWithOptionalAuth(`${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(id)}/matches`)

    let res = await fetchMatches(stageId)
    if (!res.ok && res.status === 404) {
        const resolveUrl = `${STRAPI_URL}/api/bt-event-stages?filters[documentId][$eq]=${encodeURIComponent(stageId)}&fields[0]=id&pagination[limit]=1`
        const resolveRes = await fetchWithOptionalAuth(resolveUrl)
        if (resolveRes.ok) {
            const resolvePayload = (await resolveRes.json().catch(() => null)) as { data?: Array<{ id?: number | string }> } | null
            const numericId = resolvePayload?.data?.[0]?.id
            if (numericId !== undefined && numericId !== null) {
                res = await fetchMatches(String(numericId))
            }
        }
    }

    if (!res.ok) return null
    const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null
    const matches = asArray(payload?.matches)
    return matches.length > 0 ? matches : null
}

const hasMatchResult = (match: Record<string, unknown>): boolean =>
    [
        'player1_points',
        'player2_points',
        'player1_innings',
        'player2_innings',
        'player1_high_run',
        'player2_high_run',
        'player1_high_run_2',
        'player2_high_run_2',
        'player1_high_run2',
        'player2_high_run2',
    ].some((field) => toFiniteNumber(match[field]) > 0)

const matchPointsForSide = (match: Record<string, unknown>, side: 1 | 2) => {
    if (!hasMatchResult(match)) return 0
    const playerPoints = toFiniteNumber(match[`player${side}_points`])
    const opponentPoints = toFiniteNumber(match[`player${side === 1 ? 2 : 1}_points`])
    if (playerPoints > opponentPoints) return 2
    if (playerPoints < opponentPoints) return 0
    return 1
}

const compareGroupRows = (a: Record<string, unknown>, b: Record<string, unknown>) => {
    const matchPointsDiff = toFiniteNumber(b.match_points) - toFiniteNumber(a.match_points)
    if (matchPointsDiff !== 0) return matchPointsDiff

    const averageA = toFiniteNumber(a.innings) > 0 ? Math.trunc((toFiniteNumber(a.points) / toFiniteNumber(a.innings)) * 1000) / 1000 : 0
    const averageB = toFiniteNumber(b.innings) > 0 ? Math.trunc((toFiniteNumber(b.points) / toFiniteNumber(b.innings)) * 1000) / 1000 : 0
    if (averageA !== averageB) return averageB - averageA

    const highRunDiff = toFiniteNumber(b.high_run) - toFiniteNumber(a.high_run)
    if (highRunDiff !== 0) return highRunDiff

    const bestAverageDiff = toFiniteNumber(b.best_average) - toFiniteNumber(a.best_average)
    if (bestAverageDiff !== 0) return bestAverageDiff

    const highRun2Diff = toFiniteNumber(b.high_run_2) - toFiniteNumber(a.high_run_2)
    if (highRun2Diff !== 0) return highRun2Diff

    return toFiniteNumber(b.points) - toFiniteNumber(a.points)
}

const buildComputedGroupStandings = (matches: Record<string, unknown>[]): Record<string, unknown>[] => {
    const rows = new Map<string, Record<string, unknown>>()
    const ensureRow = (
        player: Record<string, unknown>,
        groupNumber: number,
        fallbackKey: string,
    ) => {
        const key = toText(player.documentId) ?? fallbackKey
        if (!rows.has(key)) {
            rows.set(key, {
                id: `computed:${key}`,
                documentId: `computed:${key}`,
                match_points: 0,
                points: 0,
                innings: 0,
                best_average: 0,
                high_run: 0,
                high_run_2: 0,
                group_number: groupNumber,
                group_position: 0,
                final_position: null,
                source: 'computed-stage-results',
                player,
            })
        }
        return rows.get(key)!
    }

    matches.forEach((match, index) => {
        if (!hasMatchResult(match)) return
        const groupNumber = Math.max(toFiniteNumber(match.number, 1), 1)
        const player1 = asObject(match.player1) ?? {}
        const player2 = asObject(match.player2) ?? {}
        const p1 = ensureRow(player1, groupNumber, `match-${index}-p1`)
        const p2 = ensureRow(player2, groupNumber, `match-${index}-p2`)
        const p1Points = toFiniteNumber(match.player1_points)
        const p2Points = toFiniteNumber(match.player2_points)
        const p1Innings = toFiniteNumber(match.player1_innings)
        const p2Innings = toFiniteNumber(match.player2_innings)
        const p1Average = p1Innings > 0 ? Math.trunc((p1Points / p1Innings) * 1000) / 1000 : 0
        const p2Average = p2Innings > 0 ? Math.trunc((p2Points / p2Innings) * 1000) / 1000 : 0

        p1.match_points = toFiniteNumber(p1.match_points) + matchPointsForSide(match, 1)
        p1.points = toFiniteNumber(p1.points) + p1Points
        p1.innings = toFiniteNumber(p1.innings) + p1Innings
        p1.best_average = Math.max(toFiniteNumber(p1.best_average), p1Average)
        p1.high_run = Math.max(toFiniteNumber(p1.high_run), toFiniteNumber(match.player1_high_run))
        p1.high_run_2 = Math.max(
            toFiniteNumber(p1.high_run_2),
            toFiniteNumber(match.player1_high_run_2 ?? match.player1_high_run2),
        )

        p2.match_points = toFiniteNumber(p2.match_points) + matchPointsForSide(match, 2)
        p2.points = toFiniteNumber(p2.points) + p2Points
        p2.innings = toFiniteNumber(p2.innings) + p2Innings
        p2.best_average = Math.max(toFiniteNumber(p2.best_average), p2Average)
        p2.high_run = Math.max(toFiniteNumber(p2.high_run), toFiniteNumber(match.player2_high_run))
        p2.high_run_2 = Math.max(
            toFiniteNumber(p2.high_run_2),
            toFiniteNumber(match.player2_high_run_2 ?? match.player2_high_run2),
        )
    })

    const groupedRows = new Map<number, Record<string, unknown>[]>()
    Array.from(rows.values()).forEach((row) => {
        const groupNumber = Math.max(toFiniteNumber(row.group_number, 1), 1)
        const groupRows = groupedRows.get(groupNumber) ?? []
        groupRows.push(row)
        groupedRows.set(groupNumber, groupRows)
    })

    const rankedRows = Array.from(groupedRows.entries()).flatMap(([groupNumber, groupRows]) =>
        [...groupRows].sort(compareGroupRows).map((row, index) => ({
            ...row,
            group_number: groupNumber,
            group_position: index + 1,
        })),
    )

    return rankedRows
        .sort((a, b) => {
            const positionDiff = toFiniteNumber(a.group_position, 9999) - toFiniteNumber(b.group_position, 9999)
            if (positionDiff !== 0) return positionDiff
            const metricDiff = compareGroupRows(a, b)
            if (metricDiff !== 0) return metricDiff
            return toFiniteNumber(a.group_number, 1) - toFiniteNumber(b.group_number, 1)
        })
        .map((row, index) => ({ ...row, final_position: index + 1 }))
}

const isKnockoutStageType = (value: unknown): boolean => {
    if (typeof value !== 'string') return false
    const normalized = value.toLowerCase()
    return (
        normalized === 'single_elimination' ||
        normalized === 'double_elimination' ||
        normalized === 'knockout' ||
        normalized === 'brackets' ||
        normalized === 'bracket' ||
        normalized.includes('bracket')
    )
}

const fetchStageMeta = async (stageId: string): Promise<Record<string, unknown> | null> => {
    const url = new URL(`${STRAPI_URL}/api/bt-event-stages`)
    url.searchParams.set('filters[documentId][$eq]', stageId)
    url.searchParams.set('fields[0]', 'id')
    url.searchParams.set('fields[1]', 'documentId')
    url.searchParams.set('fields[2]', 'stage_type')
    url.searchParams.set('pagination[limit]', '1')

    const res = await fetchWithOptionalAuth(url.toString())
    if (!res.ok) return null
    const payload = await res.json().catch(() => null)
    const first = Array.isArray(payload?.data) ? payload.data[0] : null
    return first && typeof first === 'object' ? first : null
}

const fetchDirectStageStandings = async (
    stageId: string,
    round: string | null,
    mode: string | null,
): Promise<Response> => {
    const directUrl = `${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(stageId)}/standings?populate[player][fields][0]=full_name&populate[player][fields][1]=documentId&populate[player][fields][2]=full_name_en&populate[player][fields][3]=country`
    const direct = new URL(directUrl)
    if (round) direct.searchParams.set('round', round)
    if (mode) direct.searchParams.set('mode', mode)
    let res = await fetchWithOptionalAuth(direct.toString())

    if (!res.ok && res.status === 404) {
        const resolveUrl = `${STRAPI_URL}/api/bt-event-stages?filters[documentId][$eq]=${encodeURIComponent(stageId)}&fields[0]=id&pagination[limit]=1`
        const resolveRes = await fetchWithOptionalAuth(resolveUrl)
        if (resolveRes.ok) {
            const resolvePayload = await resolveRes.json().catch(() => null)
            const first = Array.isArray(resolvePayload?.data) ? resolvePayload.data[0] : null
            const numericId = first?.id
            if (numericId !== undefined && numericId !== null) {
                const fallbackUrl = new URL(`${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(String(numericId))}/standings?populate[player][fields][0]=full_name&populate[player][fields][1]=documentId&populate[player][fields][2]=full_name_en&populate[player][fields][3]=country`)
                if (round) fallbackUrl.searchParams.set('round', round)
                if (mode) fallbackUrl.searchParams.set('mode', mode)
                res = await fetchWithOptionalAuth(fallbackUrl.toString())
            }
        }
    }

    return res
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
}

const knockoutAverage = (row: Record<string, unknown>): number => {
    const explicitAverage = toFiniteNumber(row.average, Number.NaN)
    if (Number.isFinite(explicitAverage)) return explicitAverage

    const points = toFiniteNumber(row.points)
    const innings = toFiniteNumber(row.innings)
    return innings > 0 ? Math.trunc((points / innings) * 1000) / 1000 : 0
}

const sortKnockoutRows = (rows: unknown[]): Record<string, unknown>[] => {
    const normalizedRows = rows
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    const targetPoints = normalizedRows.reduce(
        (max, row) => Math.max(max, toFiniteNumber(row.points)),
        0,
    )

    return normalizedRows
        .sort((a, b) => {
            const completedA = targetPoints > 0 && toFiniteNumber(a.points) >= targetPoints ? 1 : 0
            const completedB = targetPoints > 0 && toFiniteNumber(b.points) >= targetPoints ? 1 : 0
            if (completedA !== completedB) return completedB - completedA

            const averageDiff = knockoutAverage(b) - knockoutAverage(a)
            if (averageDiff !== 0) return averageDiff

            const highRunDiff = toFiniteNumber(b.high_run) - toFiniteNumber(a.high_run)
            if (highRunDiff !== 0) return highRunDiff

            const highRun2Diff = toFiniteNumber(b.high_run_2) - toFiniteNumber(a.high_run_2)
            if (highRun2Diff !== 0) return highRun2Diff

            return toFiniteNumber(b.points) - toFiniteNumber(a.points)
        })
        .map((row, index) => ({
            ...row,
            match_points: targetPoints > 0 && toFiniteNumber(row.points) >= targetPoints ? 2 : 0,
            final_position: index + 1,
            stage_rank: index + 1,
            place: index + 1,
            position: index + 1,
        }))
}

const normalizeKnockoutStandingsPayload = (payload: unknown): unknown => {
    if (!payload || typeof payload !== 'object') return payload
    const record = payload as Record<string, unknown>
    const sourceRows =
        Array.isArray(record.overallRankings)
            ? record.overallRankings
            : Array.isArray(record.standings)
                ? record.standings
                : Array.isArray(record.results)
                    ? record.results
                    : null

    if (!sourceRows) return payload
    if (
        sourceRows.some(
            (row) =>
                row &&
                typeof row === 'object' &&
                (row as Record<string, unknown>).source === 'knockout-standings',
        )
    ) {
        return payload
    }

    const sortedRows = sortKnockoutRows(sourceRows)
    return {
        ...record,
        results: sortedRows,
        standings: sortedRows,
        overallRankings: sortedRows,
    }
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ stageId: string }> },
) {
    try {
        const { stageId } = await context.params
        if (!stageId) {
            return NextResponse.json({ error: 'stageId is required' }, { status: 400 })
        }

        const stageMeta = await fetchStageMeta(stageId)
        const isKnockout = isKnockoutStageType(stageMeta?.stage_type)
        const round = req.nextUrl.searchParams.get('round') || null
        const mode = req.nextUrl.searchParams.get('mode') || null

        if (!isKnockout) {
            const matches = await fetchStageMatches(stageId)
            const computedResults = matches ? buildComputedGroupStandings(matches) : []
            if (computedResults.length > 0) {
                return NextResponse.json({
                    source: 'computed-stage-results',
                    results: computedResults,
                    standings: computedResults,
                    overallRankings: computedResults,
                })
            }

            const storedResults = await fetchStoredStageResults(stageId)
            if (storedResults) {
                return NextResponse.json({
                    source: 'stored-results',
                    results: storedResults,
                    standings: storedResults,
                    overallRankings: storedResults,
                })
            }
        }

        const res = await fetchDirectStageStandings(stageId, round, mode)
        const text = await res.text()

        if (!res.ok && isKnockout) {
            const storedResults = await fetchStoredStageResults(stageId)
            if (storedResults) {
                return NextResponse.json({
                    source: 'stored-results-fallback',
                    results: storedResults,
                    standings: storedResults,
                    overallRankings: storedResults,
                })
            }
        }

        if (!res.ok) {
            return NextResponse.json({ error: text || 'Failed to fetch stage standings' }, { status: res.status })
        }

        if (isKnockout && !round && !mode) {
            const payload = JSON.parse(text)
            return NextResponse.json(normalizeKnockoutStandingsPayload(payload))
        }

        return new NextResponse(text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[event-stages.standings][GET]', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
