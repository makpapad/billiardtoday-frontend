import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '10')
        const season = searchParams.get('season')

        const queryParams = new URLSearchParams()
        queryParams.set('pagination[page]', page.toString())
        queryParams.set('pagination[pageSize]', pageSize.toString())
        queryParams.set('sort[0]', 'start_date:desc')
        queryParams.set('fields[0]', 'title')
        queryParams.set('fields[1]', 'season')
        queryParams.set('fields[2]', 'start_date')
        queryParams.set('fields[3]', 'end_date')
        queryParams.set('fields[4]', 'documentId')

        if (season) {
            queryParams.set('filters[season][$eq]', season)
        }

        const url = `${STRAPI_URL}/api/bt-events?${queryParams.toString()}`

        const res = await fetch(url, {
            cache: 'no-store',
        })

        const text = await res.text()

        if (!res.ok) {
            console.error('[tournaments][GET] Error response:', text)
            return NextResponse.json({ error: text || 'Failed to fetch tournaments' }, { status: res.status })
        }

        return new NextResponse(text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[tournaments][GET]', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
