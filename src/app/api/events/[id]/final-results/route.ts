import { NextRequest, NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/serverEnv'

export const runtime = 'nodejs'

const IS_PRODUCTION = (getServerEnv('NODE_ENV') || process.env.NODE_ENV) === 'production'
const STRAPI_URL =
    getServerEnv('STRAPI_API_URL') ||
    (IS_PRODUCTION ? 'http://127.0.0.1:1337' : getServerEnv('NEXT_PUBLIC_STRAPI_URL')) ||
    'http://localhost:1337'
const STRAPI_API_TOKEN = getServerEnv('STRAPI_API_TOKEN') || process.env.STRAPI_API_TOKEN

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
        eventUrl.searchParams.set('populate[results_final][sort][0]', 'position:asc')
        eventUrl.searchParams.set('populate[results_final][fields][0]', 'position')
        eventUrl.searchParams.set('populate[results_final][fields][1]', 'best_average')
        eventUrl.searchParams.set('populate[results_final][fields][2]', 'caroms')
        eventUrl.searchParams.set('populate[results_final][fields][3]', 'match_points')
        eventUrl.searchParams.set('populate[results_final][fields][4]', 'points')
        eventUrl.searchParams.set('populate[results_final][fields][5]', 'innings')
        eventUrl.searchParams.set('populate[results_final][fields][6]', 'high_run')
        eventUrl.searchParams.set('populate[results_final][fields][7]', 'high_run_2')
        eventUrl.searchParams.set('populate[results_final][fields][8]', 'ranking_points')
        eventUrl.searchParams.set('populate[results_final][fields][9]', 'penalty')
        eventUrl.searchParams.set('populate[results_final][fields][10]', 'final_points')
        eventUrl.searchParams.set('populate[results_final][fields][11]', 'documentId')
        eventUrl.searchParams.set('populate[results_final][fields][12]', 'restricted_best_avg')
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
                    final_standings_published?: boolean
                    final_standings_published_at?: string | null
                } | null
            }
            const rows = Array.isArray(payload.data?.results_final)
                ? payload.data.results_final
                : []
            if ((payload.data?.final_standings_published === true && rows.length > 0) || rows.length > 0) {
                return NextResponse.json(
                    {
                        data: rows,
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
