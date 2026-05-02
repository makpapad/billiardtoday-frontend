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

const fetchDirectStageStandings = async (stageId: string): Promise<Response> => {
    const directUrl = `${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(stageId)}/standings?populate[player][fields][0]=full_name&populate[player][fields][1]=documentId&populate[player][fields][2]=full_name_en&populate[player][fields][3]=country`
    let res = await fetchWithOptionalAuth(directUrl)

    if (!res.ok && res.status === 404) {
        const resolveUrl = `${STRAPI_URL}/api/bt-event-stages?filters[documentId][$eq]=${encodeURIComponent(stageId)}&fields[0]=id&pagination[limit]=1`
        const resolveRes = await fetchWithOptionalAuth(resolveUrl)
        if (resolveRes.ok) {
            const resolvePayload = await resolveRes.json().catch(() => null)
            const first = Array.isArray(resolvePayload?.data) ? resolvePayload.data[0] : null
            const numericId = first?.id
            if (numericId !== undefined && numericId !== null) {
                const fallbackUrl = `${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(String(numericId))}/standings?populate[player][fields][0]=full_name&populate[player][fields][1]=documentId&populate[player][fields][2]=full_name_en&populate[player][fields][3]=country`
                res = await fetchWithOptionalAuth(fallbackUrl)
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

    const sortedRows = sortKnockoutRows(sourceRows)
    return {
        ...record,
        results: sortedRows,
        standings: sortedRows,
        overallRankings: sortedRows,
    }
}

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ stageId: string }> },
) {
    try {
        const { stageId } = await context.params
        if (!stageId) {
            return NextResponse.json({ error: 'stageId is required' }, { status: 400 })
        }

        const stageMeta = await fetchStageMeta(stageId)
        const isKnockout = isKnockoutStageType(stageMeta?.stage_type)

        if (!isKnockout) {
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

        const res = await fetchDirectStageStandings(stageId)
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

        if (isKnockout) {
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
