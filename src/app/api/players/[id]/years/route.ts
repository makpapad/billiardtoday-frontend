import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

type RouteContext = { params: Promise<{ id?: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { id: playerId } = await context.params
        if (!playerId) {
            return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
        }

        if (!STRAPI_API_TOKEN) {
            console.error('[frontend.api.players.years][GET] missing STRAPI_API_TOKEN env')
            return NextResponse.json({ error: 'STRAPI_API_TOKEN is missing' }, { status: 500 })
        }

        // Fetch only seasons and results_final - minimal data
        const params = new URLSearchParams()
        params.set('populate[results_final][populate][player][fields][0]', 'documentId')
        params.set('fields[0]', 'season')
        params.set('sort[0]', 'season:desc')
        params.set('pagination[pageSize]', '1000')
        
        // Filter by player participation to reduce data transfer
        params.set('filters[results_final][player][documentId][$eq]', playerId)

        const url = `${STRAPI_URL}/api/bt-events?${params.toString()}`

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
            next: { revalidate: 600 }, // Cache for 10 minutes
        })

        if (!res.ok) {
            const text = await res.text()
            console.error('[frontend.api.players.years][GET]', res.status, text)
            return NextResponse.json({ error: 'Failed to fetch events' }, { status: res.status })
        }

        const data = await res.json()
        
        // Extract unique years where player participated
        const years = new Set<number>()
        
        type EventData = {
            season: number
            results_final?: Array<{
                player?: {
                    documentId: string
                }
            }>
        }
        
        data.data.forEach((event: EventData) => {
            const participated = event.results_final?.some(
                (r) => r.player?.documentId === playerId
            )
            if (participated && event.season) {
                years.add(event.season)
            }
        })

        const sortedYears = Array.from(years).sort((a, b) => b - a)

        return NextResponse.json(sortedYears, { status: 200 })
    } catch (error) {
        console.error('[frontend.api.players.years][GET]', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
