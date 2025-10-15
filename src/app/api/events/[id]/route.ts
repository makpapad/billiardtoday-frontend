import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const documentId = params.id

        const queryParams = new URLSearchParams()
        queryParams.set('populate[event_stages][sort][0]', 'order:asc')
        queryParams.set('populate[event_stages][fields][0]', 'title')
        queryParams.set('populate[event_stages][fields][1]', 'start_date')
        queryParams.set('populate[event_stages][fields][2]', 'end_date')
        queryParams.set('populate[event_stages][fields][3]', 'order')
        queryParams.set('populate[event_stages][fields][4]', 'is_final')
        queryParams.set('populate[event_stages][fields][5]', 'documentId')

        queryParams.set('populate[event_stages][populate][groups][sort][0]', 'number:asc')
        queryParams.set('populate[event_stages][populate][groups][fields][0]', 'number')
        queryParams.set('populate[event_stages][populate][groups][fields][1]', 'date_time')
        queryParams.set('populate[event_stages][populate][groups][fields][2]', 'player1_points')
        queryParams.set('populate[event_stages][populate][groups][fields][3]', 'player1_match_points')
        queryParams.set('populate[event_stages][populate][groups][fields][4]', 'player1_innings')
        queryParams.set('populate[event_stages][populate][groups][fields][5]', 'player1_high_run')
        queryParams.set('populate[event_stages][populate][groups][fields][6]', 'player2_points')
        queryParams.set('populate[event_stages][populate][groups][fields][7]', 'player2_match_points')
        queryParams.set('populate[event_stages][populate][groups][fields][8]', 'player2_innings')
        queryParams.set('populate[event_stages][populate][groups][fields][9]', 'player2_high_run')
        queryParams.set('populate[event_stages][populate][groups][fields][10]', 'documentId')
        queryParams.set('populate[event_stages][populate][groups][fields][11]', 'player1_high_run_2')
        queryParams.set('populate[event_stages][populate][groups][fields][12]', 'player2_high_run_2')

        queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][0]', 'full_name')
        queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][1]', 'documentId')
        queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][0]', 'full_name')
        queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][1]', 'documentId')

        queryParams.set('populate[event_stages][populate][results][sort][0]', 'group_number:asc')
        queryParams.set('populate[event_stages][populate][results][sort][1]', 'final_position:asc')
        queryParams.set('populate[event_stages][populate][results][fields][0]', 'match_points')
        queryParams.set('populate[event_stages][populate][results][fields][1]', 'points')
        queryParams.set('populate[event_stages][populate][results][fields][2]', 'innings')
        queryParams.set('populate[event_stages][populate][results][fields][3]', 'high_run')
        queryParams.set('populate[event_stages][populate][results][fields][4]', 'group_number')
        queryParams.set('populate[event_stages][populate][results][fields][5]', 'group_position')
        queryParams.set('populate[event_stages][populate][results][fields][6]', 'final_position')
        queryParams.set('populate[event_stages][populate][results][fields][7]', 'documentId')

        queryParams.set('populate[event_stages][populate][results][populate][player][fields][0]', 'full_name')
        queryParams.set('populate[event_stages][populate][results][populate][player][fields][1]', 'documentId')

        const url = `${STRAPI_URL}/api/bt-events/${documentId}?${queryParams.toString()}`

        const res = await fetch(url, {
            cache: 'no-store',
        })

        const text = await res.text()

        if (!res.ok) {
            console.error('[events.id][GET] Error response:', text)
            return NextResponse.json({ error: text || 'Failed to fetch event' }, { status: res.status })
        }

        return new NextResponse(text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[events.id][GET]', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
