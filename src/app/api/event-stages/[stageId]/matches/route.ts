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

const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

const asObject = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null

const asArray = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value)
        ? value.filter((entry): entry is Record<string, unknown> =>
              Boolean(entry && typeof entry === 'object' && !Array.isArray(entry)),
          )
        : []

const matchHasResult = (match: Record<string, unknown>): boolean =>
    ['player1_points', 'player2_points', 'player1_innings', 'player2_innings'].some(
        (field) => (toNumber(match[field]) ?? 0) > 0,
    )

/**
 * ΣΕΙΡΑ ΦΥΛΛΟΥ ΣΤΟΥΣ ΑΓΩΝΕΣ ΤΟΥ ΟΜΙΛΟΥ.
 *
 * Η κάρτα του ομίλου χτίζεται από τους αγώνες· όταν ο αθλητής δεν φέρει θέση φύλλου, η
 * σειρά πέφτει στο επώνυμο (αλφαβητικά). Γεμίζουμε `drawPosition` από τη σειρά με την οποία
 * η εφαρμογή δημοσίευσε τους αγώνες (πρώτη εμφάνιση = ΑΘΛΗΤΗΣ 1, μετά 2, 3…), ΜΟΝΟ σε
 * ομίλους χωρίς κανένα αποτέλεσμα. Δεν γράφει τίποτα στη βάση — μόνο στην απάντηση.
 */
const stampDrawSheetOrder = (matches: Record<string, unknown>[]): boolean => {
    if (matches.length === 0) return false

    const orderByGroup = new Map<number, Map<string, number>>()
    const playedGroups = new Set<number>()

    for (const match of matches) {
        const groupNumber = toNumber(match.number) ?? toNumber(match.group_number) ?? 1
        if (matchHasResult(match)) playedGroups.add(groupNumber)
        const order = orderByGroup.get(groupNumber) ?? new Map<string, number>()
        for (const side of ['player1', 'player2'] as const) {
            const player = asObject(match[side])
            const docId =
                typeof player?.documentId === 'string' && player.documentId.trim().length > 0
                    ? player.documentId.trim()
                    : null
            if (docId && !order.has(docId)) order.set(docId, order.size + 1)
        }
        orderByGroup.set(groupNumber, order)
    }

    let changed = false
    for (const match of matches) {
        const groupNumber = toNumber(match.number) ?? toNumber(match.group_number) ?? 1
        if (playedGroups.has(groupNumber)) continue
        const order = orderByGroup.get(groupNumber)
        if (!order) continue
        for (const side of ['player1', 'player2'] as const) {
            const player = asObject(match[side])
            if (!player) continue
            if (typeof player.drawPosition === 'number') continue
            const docId = typeof player.documentId === 'string' ? player.documentId : null
            const derived = docId ? order.get(docId) : undefined
            if (derived === undefined) continue
            match[side] = { ...player, drawPosition: derived }
            changed = true
        }
    }

    return changed
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

        const directUrl = `${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(stageId)}/matches`
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
                    const fallbackUrl = `${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(String(numericId))}/matches`
                    res = await fetchWithOptionalAuth(fallbackUrl)
                    text = await res.text()
                }
            }
        }

        if (!res.ok) {
            return NextResponse.json({ error: text || 'Failed to fetch stage matches' }, { status: res.status })
        }

        // Σειρά φύλλου αντί αλφαβητικής στους άπαιχτους ομίλους (μόνο στην απάντηση).
        try {
            const payload = JSON.parse(text) as Record<string, unknown>
            const matches = asArray(payload?.matches)
            if (matches.length > 0 && stampDrawSheetOrder(matches)) {
                payload.matches = matches
                return NextResponse.json(payload, { status: 200 })
            }
        } catch {
            // Ό,τι δεν είναι JSON περνά αυτούσιο όπως πριν.
        }

        return new NextResponse(text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[event-stages.matches][GET]', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
