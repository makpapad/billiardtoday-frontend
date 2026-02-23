import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

function toPositiveInt(value: string | null, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function emptyPayload(page: number, pageSize: number) {
    return {
        data: [],
        meta: {
            pagination: {
                page,
                pageSize,
                pageCount: 0,
                total: 0,
            },
        },
    }
}

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams
        const page = toPositiveInt(searchParams.get('page'), 1)
        const pageSize = toPositiveInt(searchParams.get('pageSize'), 10)
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

        const fetchFromStrapi = async (useAuth: boolean) => {
            const headers: HeadersInit = {}
            if (useAuth && STRAPI_API_TOKEN) {
                headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`
            }
            return fetch(url, {
                cache: 'no-store',
                headers,
            })
        }

        let res: Response
        try {
            res = await fetchFromStrapi(Boolean(STRAPI_API_TOKEN))
        } catch (error) {
            console.error('[tournaments][GET] upstream unavailable:', error)
            return NextResponse.json(emptyPayload(page, pageSize), { status: 200 })
        }

        if (
            !res.ok &&
            STRAPI_API_TOKEN &&
            (res.status === 401 || res.status === 403)
        ) {
            try {
                const retry = await fetchFromStrapi(false)
                if (retry.ok) {
                    res = retry
                } else {
                    const retryText = await retry.text().catch(() => '')
                    console.error('[tournaments][GET] retry failed:', retry.status, retryText)
                    return NextResponse.json(emptyPayload(page, pageSize), { status: 200 })
                }
            } catch (error) {
                console.error('[tournaments][GET] retry upstream unavailable:', error)
                return NextResponse.json(emptyPayload(page, pageSize), { status: 200 })
            }
        }

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            console.error('[tournaments][GET] Error response:', res.status, text)
            return NextResponse.json(emptyPayload(page, pageSize), { status: 200 })
        }

        const text = await res.text()
        return new NextResponse(text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[tournaments][GET]', error)
        const page = toPositiveInt(req.nextUrl.searchParams.get('page'), 1)
        const pageSize = toPositiveInt(req.nextUrl.searchParams.get('pageSize'), 10)
        return NextResponse.json(emptyPayload(page, pageSize), { status: 200 })
    }
}
