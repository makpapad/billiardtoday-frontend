import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const STRAPI_FALLBACK_URL = process.env.STRAPI_FALLBACK_URL || 'https://app.billiardtoday.com'

const copySearchParams = (incoming: URLSearchParams) => {
    const params = new URLSearchParams()

    const page = incoming.get('pagination[page]')
    const pageSize = incoming.get('pagination[pageSize]')

    if (page) {
        params.set('pagination[page]', page)
    }
    params.set('pagination[pageSize]', pageSize ?? '100')

    const sortValues = incoming.getAll('sort[0]')
    if (sortValues.length > 0) {
        sortValues.forEach((value, index) => {
            params.set(`sort[${index}]`, value)
        })
    } else {
        params.set('sort[0]', 'full_name:asc')
    }

    incoming.forEach((value, key) => {
        if (key.startsWith('filters[') || key.startsWith('fields[') || key.startsWith('populate[')) {
            params.set(key, value)
        }
    })

    // Only add default fields if NO fields are specified
    const hasAnyFields = Array.from(incoming.keys()).some(key => key.startsWith('fields['))
    if (!hasAnyFields) {
        const defaultFields = ['full_name', 'country', 'documentId', 'career_stats']
        defaultFields.forEach((field, index) => {
            params.set(`fields[${index}]`, field)
        })
    }

    const ensurePopulateFields = (field: string) => {
        const baseKey = `populate[${field}]`
        const hasPopulate =
            incoming.has(baseKey) ||
            incoming.has(`${baseKey}[fields][0]`) ||
            incoming.has(`${baseKey}[populate]`)

        if (!hasPopulate) {
            params.set(`${baseKey}[fields][0]`, 'url')
            params.set(`${baseKey}[fields][1]`, 'documentId')
            params.set(`${baseKey}[fields][2]`, 'name')
        }
    }

    ensurePopulateFields('photo_main')
    ensurePopulateFields('photo_alt')

    return params
}

export async function GET(req: NextRequest) {
    try {
        const params = copySearchParams(req.nextUrl.searchParams)
        const primaryUrl = `${STRAPI_URL}/api/bt-players?${params.toString()}`
        const fallbackUrl = `${STRAPI_FALLBACK_URL}/api/bt-players?${params.toString()}`

        const runRequest = async (url: string, allowAuth = true) => {
            const fetchWithOptionalAuth = async (useAuth: boolean) =>
                fetch(url, {
                    headers:
                        useAuth && STRAPI_API_TOKEN && allowAuth
                            ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
                            : undefined,
                    next: { revalidate: 300 },
                })

            let res = await fetchWithOptionalAuth(Boolean(STRAPI_API_TOKEN))
            let text = await res.text()

            if (!res.ok && (res.status === 401 || res.status === 403)) {
                const retryRes = await fetchWithOptionalAuth(false)
                const retryText = await retryRes.text()
                if (retryRes.ok) {
                    return { ok: true, status: 200, text: retryText }
                }
                if (retryRes.status >= res.status) {
                    res = retryRes
                    text = retryText
                }
            }

            return { ok: res.ok, status: res.status, text }
        }

        let result: { ok: boolean; status: number; text: string }
        try {
            result = await runRequest(primaryUrl, true)
        } catch {
            result = await runRequest(fallbackUrl, false)
        }

        if (!result.ok && primaryUrl !== fallbackUrl) {
            try {
                const retryFallback = await runRequest(fallbackUrl, false)
                if (retryFallback.ok) {
                    result = retryFallback
                }
            } catch {
                // ignore and return original failure
            }
        }

        if (!result.ok) {
            console.error('[frontend.api.admin.tournament.players][GET]', result.status, result.text)
            return NextResponse.json({ error: result.text || 'Failed to fetch players' }, { status: result.status })
        }

        return new NextResponse(result.text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[frontend.api.admin.tournament.players][GET]', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
