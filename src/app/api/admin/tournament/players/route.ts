import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

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
        const url = `${STRAPI_URL}/api/bt-players?${params.toString()}`

        const fetchWithOptionalAuth = async (useAuth: boolean) =>
            fetch(url, {
                headers:
                    useAuth && STRAPI_API_TOKEN
                        ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
                        : undefined,
                next: { revalidate: 300 },
            })

        let res = await fetchWithOptionalAuth(Boolean(STRAPI_API_TOKEN))
        let text = await res.text()

        // Some environments have restricted API tokens but allow public read.
        if (!res.ok && (res.status === 401 || res.status === 403)) {
            const retryRes = await fetchWithOptionalAuth(false)
            const retryText = await retryRes.text()
            if (retryRes.ok) {
                return new NextResponse(retryText, {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            // Keep the original error context if retry also fails.
            if (retryRes.status >= res.status) {
                res = retryRes
                text = retryText
            }
        }

        if (!res.ok) {
            console.error('[frontend.api.admin.tournament.players][GET]', res.status, text)
            return NextResponse.json({ error: text || 'Failed to fetch players' }, { status: res.status })
        }

        return new NextResponse(text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[frontend.api.admin.tournament.players][GET]', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
