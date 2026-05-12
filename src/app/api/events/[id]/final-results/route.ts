import { NextRequest, NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/serverEnv'

export const runtime = 'nodejs'

const IS_PRODUCTION = (getServerEnv('NODE_ENV') || process.env.NODE_ENV) === 'production'
const STRAPI_URL =
    getServerEnv('STRAPI_API_URL') ||
    (IS_PRODUCTION ? 'http://127.0.0.1:1337' : getServerEnv('NEXT_PUBLIC_STRAPI_URL')) ||
    'http://localhost:1337'
const STRAPI_API_TOKEN = getServerEnv('STRAPI_API_TOKEN') || process.env.STRAPI_API_TOKEN

const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

const asObject = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : null

const asArray = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(asObject(item))) : []

const buildStageMatchPointsMap = async (
    eventStages: unknown[],
    headers: HeadersInit,
): Promise<Map<string, number>> => {
    const totals = new Map<string, number>()

    for (const stage of asArray(eventStages)) {
        const target =
            typeof stage.documentId === 'string' && stage.documentId.trim().length > 0
                ? stage.documentId
                : typeof stage.id === 'number'
                  ? String(stage.id)
                  : null
        if (!target) continue

        const stageUrl = new URL(`${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(target)}`)
        stageUrl.searchParams.set('populate[groups][fields][0]', 'player1_match_points')
        stageUrl.searchParams.set('populate[groups][fields][1]', 'player2_match_points')
        stageUrl.searchParams.set('populate[groups][populate][player1][fields][0]', 'documentId')
        stageUrl.searchParams.set('populate[groups][populate][player1][fields][1]', 'full_name')
        stageUrl.searchParams.set('populate[groups][populate][player2][fields][0]', 'documentId')
        stageUrl.searchParams.set('populate[groups][populate][player2][fields][1]', 'full_name')

        const res = await fetch(stageUrl.toString(), {
            cache: 'no-store',
            headers,
        })
        const text = await res.text()
        if (!res.ok) continue

        let payload: { data?: { groups?: unknown[] } | null } | null = null
        try {
            payload = JSON.parse(text) as { data?: { groups?: unknown[] } | null }
        } catch {
            payload = null
        }
        const groups = asArray(payload?.data?.groups)

        for (const group of groups) {
            const player1 = asObject(group.player1)
            const player2 = asObject(group.player2)
            const player1DocumentId =
                typeof player1?.documentId === 'string' && player1.documentId.trim().length > 0
                    ? player1.documentId
                    : null
            const player2DocumentId =
                typeof player2?.documentId === 'string' && player2.documentId.trim().length > 0
                    ? player2.documentId
                    : null
            const player1MatchPoints = toNumber(group.player1_match_points)
            const player2MatchPoints = toNumber(group.player2_match_points)

            if (player1DocumentId && player1MatchPoints !== null) {
                totals.set(
                    player1DocumentId,
                    (totals.get(player1DocumentId) ?? 0) + player1MatchPoints,
                )
            }
            if (player2DocumentId && player2MatchPoints !== null) {
                totals.set(
                    player2DocumentId,
                    (totals.get(player2DocumentId) ?? 0) + player2MatchPoints,
                )
            }
        }
    }

    return totals
}

const enrichFinalRows = (
    rows: unknown[],
    stageMatchPoints: Map<string, number>,
): Record<string, unknown>[] =>
    asArray(rows).map((row) => {
        const player = asObject(row.player)
        const playerDocumentId =
            typeof player?.documentId === 'string' && player.documentId.trim().length > 0
                ? player.documentId
                : null
        const explicitMatchPoints = toNumber(row.match_points)
        const derivedMatchPoints =
            (playerDocumentId ? (stageMatchPoints.get(playerDocumentId) ?? null) : null) ??
            explicitMatchPoints ??
            toNumber(row.points)

        return derivedMatchPoints === null
            ? row
            : {
                  ...row,
                  match_points: derivedMatchPoints,
              }
    })

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const headers: HeadersInit = {}
        if (STRAPI_API_TOKEN) {
            headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`
        }

        const eventUrl = new URL(`${STRAPI_URL}/api/bt-events/${encodeURIComponent(id)}`)
        eventUrl.searchParams.set('fields[0]', 'final_standings_published')
        eventUrl.searchParams.set('fields[1]', 'final_standings_published_at')
        eventUrl.searchParams.set('populate[event_stages][fields][0]', 'documentId')
        eventUrl.searchParams.set('populate[event_stages][fields][1]', 'id')
        eventUrl.searchParams.set('populate[results_final][sort][0]', 'position:asc')
        eventUrl.searchParams.set('populate[results_final][fields][0]', 'position')
        eventUrl.searchParams.set('populate[results_final][fields][1]', 'best_average')
        eventUrl.searchParams.set('populate[results_final][fields][2]', 'caroms')
        eventUrl.searchParams.set('populate[results_final][fields][3]', 'points')
        eventUrl.searchParams.set('populate[results_final][fields][4]', 'innings')
        eventUrl.searchParams.set('populate[results_final][fields][5]', 'high_run')
        eventUrl.searchParams.set('populate[results_final][fields][6]', 'high_run_2')
        eventUrl.searchParams.set('populate[results_final][fields][7]', 'ranking_points')
        eventUrl.searchParams.set('populate[results_final][fields][8]', 'penalty')
        eventUrl.searchParams.set('populate[results_final][fields][9]', 'final_points')
        eventUrl.searchParams.set('populate[results_final][fields][10]', 'documentId')
        eventUrl.searchParams.set('populate[results_final][fields][11]', 'restricted_best_avg')
        eventUrl.searchParams.set('populate[results_final][populate][player][fields][0]', 'full_name')
        eventUrl.searchParams.set('populate[results_final][populate][player][fields][1]', 'documentId')
        eventUrl.searchParams.set('populate[results_final][populate][player][fields][2]', 'full_name_en')
        eventUrl.searchParams.set('populate[results_final][populate][player][fields][3]', 'country')

        const eventRes = await fetch(eventUrl.toString(), {
            cache: 'no-store',
            headers,
        })
        const eventText = await eventRes.text()
        if (eventRes.ok) {
            const payload = JSON.parse(eventText) as {
                data?: {
                    results_final?: unknown[]
                    event_stages?: unknown[]
                    final_standings_published?: boolean
                    final_standings_published_at?: string | null
                } | null
            }
            const rows = Array.isArray(payload.data?.results_final)
                ? payload.data.results_final
                : []
            if ((payload.data?.final_standings_published === true && rows.length > 0) || rows.length > 0) {
                const stageMatchPoints = await buildStageMatchPointsMap(
                    Array.isArray(payload.data?.event_stages) ? payload.data.event_stages : [],
                    headers,
                )
                return NextResponse.json(
                    {
                        data: enrichFinalRows(rows, stageMatchPoints),
                        meta: {
                            final_standings_published: payload.data?.final_standings_published === true,
                            final_standings_published_at:
                                payload.data?.final_standings_published_at ?? null,
                        },
                    },
                    { status: 200 },
                )
            }
        }

        const url = `${STRAPI_URL}/api/bt-events/${encodeURIComponent(id)}/final-results`
        const res = await fetch(url, {
            cache: 'no-store',
            headers,
        })

        const text = await res.text()
        if (!res.ok) {
            return NextResponse.json(
                { error: text || 'Failed to fetch final results' },
                { status: res.status },
            )
        }

        return new NextResponse(text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[events.final-results][GET]', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
