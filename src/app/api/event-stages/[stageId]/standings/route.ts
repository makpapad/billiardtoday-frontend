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

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ stageId: string }> },
) {
    try {
        const { stageId } = await context.params
        if (!stageId) {
            return NextResponse.json({ error: 'stageId is required' }, { status: 400 })
        }

        const directUrl = `${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(stageId)}/standings?populate[player][fields][0]=full_name&populate[player][fields][1]=documentId&populate[player][fields][2]=full_name_en&populate[player][fields][3]=country`
        let res = await fetchWithOptionalAuth(directUrl)
        let text = await res.text()

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
                    text = await res.text()
                }
            }
        }

        if (!res.ok) {
            return NextResponse.json({ error: text || 'Failed to fetch stage standings' }, { status: res.status })
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
