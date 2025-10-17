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
            console.error('[frontend.api.players.history][GET] missing STRAPI_API_TOKEN env')
            return NextResponse.json({ error: 'STRAPI_API_TOKEN is missing' }, { status: 500 })
        }

        // Get query params
        const searchParams = req.nextUrl.searchParams
        const year = searchParams.get('year')
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null

        // Build Strapi query to get all events where player participated
        const params = new URLSearchParams()
        
        // Minimal fields for event
        params.set('fields[0]', 'documentId')
        params.set('fields[1]', 'title')
        params.set('fields[2]', 'season')
        params.set('fields[3]', 'start_date')
        params.set('fields[4]', 'end_date')
        
        // Populate only essential nested data
        params.set('populate[event_stages][populate][groups][populate][player1][fields][0]', 'documentId')
        params.set('populate[event_stages][populate][groups][populate][player1][fields][1]', 'full_name')
        params.set('populate[event_stages][populate][groups][populate][player2][fields][0]', 'documentId')
        params.set('populate[event_stages][populate][groups][populate][player2][fields][1]', 'full_name')
        params.set('populate[results_final][populate][player][fields][0]', 'documentId')
        params.set('populate[tournament][fields][0]', 'title')
        
        // Minimal event_stages fields
        params.set('populate[event_stages][fields][0]', 'title')
        params.set('populate[event_stages][fields][1]', 'order')
        params.set('populate[event_stages][fields][2]', 'is_final')
        
        // Filter by player participation to reduce data transfer
        params.set('filters[results_final][player][documentId][$eq]', playerId)
        
        // Filter by season/year if provided
        if (year) {
            params.set('filters[season][$eq]', year)
        }
        
        // Sort by season descending
        params.set('sort[0]', 'season:desc')
        // Dynamic pagination based on limit parameter - minimal for instant load
        if (limit) {
            params.set('pagination[pageSize]', Math.min(limit, 10).toString())
        } else if (year) {
            params.set('pagination[pageSize]', '20')
        } else {
            params.set('pagination[pageSize]', '3') // Absolute minimum for instant load
        }

        const url = `${STRAPI_URL}/api/bt-events?${params.toString()}`

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
            next: { revalidate: 600 }, // Cache for 10 minutes
        })

        if (!res.ok) {
            const text = await res.text()
            console.error('[frontend.api.players.history][GET]', res.status, text)
            return NextResponse.json({ error: text }, { status: res.status })
        }

        const data = await res.json()
        
        // Process and filter events where player participated
        const playerHistory = processPlayerHistory(data.data, playerId)

        return NextResponse.json(playerHistory, { status: 200 })
    } catch (error) {
        console.error('[frontend.api.players.history][GET]', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}

type StrapiEvent = {
    id: number
    documentId: string
    title: string
    season: number
    start_date: string
    end_date: string
    tournament?: {
        title: string
    }
    event_stages?: Array<{
        id: number
        title: string
        order: number
        is_final: boolean
        groups?: Array<{
            id: number
            number: number
            date_time: string
            player1?: { id: number; documentId: string; full_name: string }
            player2?: { id: number; documentId: string; full_name: string }
            player1_points: number
            player2_points: number
            player1_innings: number
            player2_innings: number
            player1_high_run: number
            player2_high_run: number
        }>
        results?: Array<{
            id: number
            player?: { id: number; documentId: string; full_name: string }
            group_position: number
            final_position: number
            best_average: number
            points: number
            innings: number
            high_run: number
        }>
    }>
    results_final?: Array<{
        id: number
        player?: { id: number; documentId: string; full_name: string }
        position: number
        best_average: number
        caroms: number
        points: number
        innings: number
        high_run: number
    }>
}

type PlayerMatch = {
    id: string
    opponent: string
    opponentId: string | null
    result: 'win' | 'loss'
    scoreFor: number
    scoreAgainst: number
    date: string
    stage: string
    innings: number
}

type PlayerHistory = {
    id: string
    tournament: string
    year: number
    position: string
    totalMatches: number
    wins: number
    losses: number
    totalPoints: number
    avgPerInning: number
    highestRun: number
    matches: PlayerMatch[]
}

function processPlayerHistory(events: StrapiEvent[], playerId: string): PlayerHistory[] {
    const history: PlayerHistory[] = []

    events.forEach((event) => {
        // Find player's final position
        const finalResult = event.results_final?.find(
            (r) => r.player?.documentId === playerId
        )

        if (!finalResult) {
            // Player didn't participate in this event
            return
        }

        // Collect all matches for this player
        const matches: PlayerMatch[] = []
        let totalPoints = 0
        let totalInnings = 0
        let highestRun = 0

        event.event_stages?.forEach((stage) => {
            stage.groups?.forEach((group) => {
                const isPlayer1 = group.player1?.documentId === playerId
                const isPlayer2 = group.player2?.documentId === playerId

                if (isPlayer1 || isPlayer2) {
                    const scoreFor = isPlayer1 ? group.player1_points : group.player2_points
                    const scoreAgainst = isPlayer1 ? group.player2_points : group.player1_points
                    const opponent = isPlayer1 ? group.player2?.full_name : group.player1?.full_name
                    const playerHighRun = isPlayer1 ? group.player1_high_run : group.player2_high_run
                    const playerInnings = isPlayer1 ? group.player1_innings : group.player2_innings

                    const opponentPlayer = isPlayer1 ? group.player2 : group.player1
                    
                    matches.push({
                        id: `M${group.id}`,
                        opponent: opponent || 'Unknown',
                        opponentId: opponentPlayer?.documentId || null,
                        result: scoreFor > scoreAgainst ? 'win' : 'loss',
                        scoreFor,
                        scoreAgainst,
                        date: group.date_time || '',
                        stage: stage.title || `Stage ${stage.order}`,
                        innings: playerInnings || (scoreFor + scoreAgainst),
                    })

                    totalPoints += scoreFor
                    totalInnings += playerInnings || (scoreFor + scoreAgainst)
                    if (playerHighRun > highestRun) {
                        highestRun = playerHighRun
                    }
                }
            })
        })

        const wins = matches.filter((m) => m.result === 'win').length
        const losses = matches.filter((m) => m.result === 'loss').length
        const avgPerInning = totalInnings > 0 ? totalPoints / totalInnings : 0

        history.push({
            id: event.documentId,
            tournament: event.tournament?.title || event.title,
            year: event.season,
            position: getPositionLabel(finalResult.position),
            totalMatches: matches.length,
            wins,
            losses,
            totalPoints,
            avgPerInning,
            highestRun,
            matches: matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        })
    })

    return history
}

function getPositionLabel(position: number): string {
    if (position === 1) return '1st'
    if (position === 2) return '2nd'
    if (position === 3) return '3rd'
    return `${position}th`
}
