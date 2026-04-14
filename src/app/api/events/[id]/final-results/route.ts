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
