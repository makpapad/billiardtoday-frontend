import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

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
        queryParams.set('populate[event_stages][fields][6]', 'stage_type')
        queryParams.set('populate[event_stages][fields][7]', 'timetable_config')

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
        queryParams.set('populate[event_stages][populate][groups][fields][13]', 'global_match_number')
        queryParams.set('populate[event_stages][populate][groups][fields][14]', 'winner_to_global_match_number')
        queryParams.set('populate[event_stages][populate][groups][fields][15]', 'winner_to_slot')
        queryParams.set('populate[event_stages][populate][groups][fields][16]', 'loser_to_global_match_number')
        queryParams.set('populate[event_stages][populate][groups][fields][17]', 'loser_to_slot')

        queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][0]', 'full_name')
        queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][1]', 'documentId')
        queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][2]', 'full_name_en')
        queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][3]', 'country')
        queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][0]', 'full_name')
        queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][1]', 'documentId')
        queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][2]', 'full_name_en')
        queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][3]', 'country')

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
        queryParams.set('populate[event_stages][populate][results][populate][player][fields][2]', 'full_name_en')
        queryParams.set('populate[event_stages][populate][results][populate][player][fields][3]', 'country')

        queryParams.set('populate[results_final][sort][0]', 'position:asc')
        queryParams.set('populate[results_final][fields][0]', 'position')
        queryParams.set('populate[results_final][fields][1]', 'best_average')
        queryParams.set('populate[results_final][fields][2]', 'caroms')
        queryParams.set('populate[results_final][fields][3]', 'points')
        queryParams.set('populate[results_final][fields][4]', 'innings')
        queryParams.set('populate[results_final][fields][5]', 'high_run')
        queryParams.set('populate[results_final][fields][6]', 'ranking_points')
        queryParams.set('populate[results_final][fields][7]', 'penalty')
        queryParams.set('populate[results_final][fields][8]', 'final_points')
        queryParams.set('populate[results_final][fields][9]', 'documentId')
        queryParams.set('populate[results_final][populate][player][fields][0]', 'full_name')
        queryParams.set('populate[results_final][populate][player][fields][1]', 'documentId')
        queryParams.set('populate[results_final][populate][player][fields][2]', 'full_name_en')
        queryParams.set('populate[results_final][populate][player][fields][3]', 'country')

        queryParams.set('populate[timetable_slots][sort][0]', 'date_time:asc')
        queryParams.set('populate[timetable_slots][sort][1]', 'table_order:asc')
        queryParams.set('populate[timetable_slots][sort][2]', 'slot_order:asc')
        queryParams.set('populate[timetable_slots][filters][is_published][$eq]', 'true')
        queryParams.set('populate[timetable_slots][fields][0]', 'slot_type')
        queryParams.set('populate[timetable_slots][fields][1]', 'title')
        queryParams.set('populate[timetable_slots][fields][2]', 'subtitle')
        queryParams.set('populate[timetable_slots][fields][3]', 'description')
        queryParams.set('populate[timetable_slots][fields][4]', 'date')
        queryParams.set('populate[timetable_slots][fields][5]', 'time')
        queryParams.set('populate[timetable_slots][fields][6]', 'date_time')
        queryParams.set('populate[timetable_slots][fields][7]', 'table_label')
        queryParams.set('populate[timetable_slots][fields][8]', 'table_order')
        queryParams.set('populate[timetable_slots][fields][9]', 'slot_order')
        queryParams.set('populate[timetable_slots][fields][10]', 'slot_status')
        queryParams.set('populate[timetable_slots][fields][11]', 'is_visible')
        queryParams.set('populate[timetable_slots][fields][12]', 'is_published')
        queryParams.set('populate[timetable_slots][fields][13]', 'source')
        queryParams.set('populate[timetable_slots][fields][14]', 'documentId')
        queryParams.set('populate[timetable_slots][fields][15]', 'metadata')
        queryParams.set('populate[timetable_slots][populate][stage][fields][0]', 'title')
        queryParams.set('populate[timetable_slots][populate][stage][fields][1]', 'order')
        queryParams.set('populate[timetable_slots][populate][stage][fields][2]', 'documentId')
        queryParams.set('populate[timetable_slots][populate][match][fields][0]', 'number')
        queryParams.set('populate[timetable_slots][populate][match][fields][1]', 'date_time')
        queryParams.set('populate[timetable_slots][populate][match][fields][2]', 'documentId')
        queryParams.set('populate[timetable_slots][populate][match][fields][3]', 'player1_points')
        queryParams.set('populate[timetable_slots][populate][match][fields][4]', 'player2_points')
        queryParams.set('populate[timetable_slots][populate][match][populate][player1][fields][0]', 'full_name')
        queryParams.set('populate[timetable_slots][populate][match][populate][player1][fields][1]', 'full_name_en')
        queryParams.set('populate[timetable_slots][populate][match][populate][player1][fields][2]', 'documentId')
        queryParams.set('populate[timetable_slots][populate][match][populate][player1][fields][3]', 'country')
        queryParams.set('populate[timetable_slots][populate][match][populate][player2][fields][0]', 'full_name')
        queryParams.set('populate[timetable_slots][populate][match][populate][player2][fields][1]', 'full_name_en')
        queryParams.set('populate[timetable_slots][populate][match][populate][player2][fields][2]', 'documentId')
        queryParams.set('populate[timetable_slots][populate][match][populate][player2][fields][3]', 'country')
        queryParams.set('fields[0]', 'documentId')
        queryParams.set('fields[1]', 'title')
        queryParams.set('fields[2]', 'season')
        queryParams.set('fields[3]', 'start_date')
        queryParams.set('fields[4]', 'end_date')
        queryParams.set('fields[5]', 'timetable_config')

        const url = `${STRAPI_URL}/api/bt-events/${documentId}?${queryParams.toString()}`

        const headers: HeadersInit = {}
        if (STRAPI_API_TOKEN) {
            headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`
        }

        const res = await fetch(url, {
            cache: 'no-store',
            headers,
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
