import { NextRequest, NextResponse } from 'next/server'
import { normalizeGameTypeOrFallback } from '@/lib/gameTypes'

export const runtime = 'nodejs'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const STRAPI_FALLBACK_URL = process.env.STRAPI_FALLBACK_URL || 'https://app.billiardtoday.com'

type RouteContext = { params: Promise<{ id?: string }> }

const toFiniteNumber = (value: unknown): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

const isPlayedMatch = (match: Record<string, unknown>): boolean => {
    const scoreFor = toFiniteNumber(match?.scoreFor)
    const scoreAgainst = toFiniteNumber(match?.scoreAgainst)
    const innings = toFiniteNumber(match?.innings)
    const highRun = toFiniteNumber(match?.highRun)
    const playerPossiblePoints = toFiniteNumber(match?.playerPossiblePoints)
    const opponentPossiblePoints = toFiniteNumber(match?.opponentPossiblePoints)

    return (
        scoreFor > 0 ||
        scoreAgainst > 0 ||
        innings > 0 ||
        highRun > 0 ||
        playerPossiblePoints > 0 ||
        opponentPossiblePoints > 0
    )
}

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { id: playerId } = await context.params
        if (!playerId) {
            return NextResponse.json(
                { error: 'Player ID is required' },
                { status: 400 },
            )
        }

        const searchParams = req.nextUrl.searchParams
        const year = searchParams.get('year')
        const gameType = searchParams.get('gameType')
        const tournamentType = searchParams.get('tournamentType')
        const normalizedGameType = normalizeGameTypeOrFallback(gameType)
        const includeMatchesParam = searchParams.get('includeMatches')
        const includeMatches = includeMatchesParam !== 'false'
        const limitRaw = Number(searchParams.get('limit'))
        const limit =
            Number.isFinite(limitRaw) && limitRaw > 0
                ? Math.min(Math.floor(limitRaw), 1000)
                : null

        const buildStrapiUrl = (baseUrl: string) => {
            const url = new URL(`${baseUrl}/api/bt-players/participations-by`)
            url.searchParams.set('id', playerId)
            if (year) url.searchParams.set('year', year)
            if (gameType) url.searchParams.set('gameType', gameType)
            return url
        }

        const fetchFromStrapi = async (
            baseUrl: string,
            useAuth: boolean,
            allowAuth = true,
        ) =>
            fetch(buildStrapiUrl(baseUrl).toString(), {
                headers:
                    useAuth && STRAPI_API_TOKEN && allowAuth
                        ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
                        : undefined,
                cache: 'no-store',
            })

        const runRequest = async (baseUrl: string, allowAuth = true) => {
            let res = await fetchFromStrapi(baseUrl, Boolean(STRAPI_API_TOKEN), allowAuth)
            if (
                !res.ok &&
                STRAPI_API_TOKEN &&
                (res.status === 401 || res.status === 403)
            ) {
                const retry = await fetchFromStrapi(baseUrl, false, allowAuth)
                if (retry.ok) return retry
                res = retry
            }
            return res
        }

        let strapiResponse: Response
        try {
            strapiResponse = await runRequest(STRAPI_URL, true)
        } catch {
            strapiResponse = await runRequest(STRAPI_FALLBACK_URL, false)
        }

        if (!strapiResponse.ok && STRAPI_URL !== STRAPI_FALLBACK_URL) {
            try {
                const retryFallback = await runRequest(STRAPI_FALLBACK_URL, false)
                if (retryFallback.ok) {
                    strapiResponse = retryFallback
                }
            } catch {
                // ignore and return original error
            }
        }

        if (!strapiResponse.ok) {
            const errorText = await strapiResponse.text().catch(() => '')
            return NextResponse.json(
                { error: errorText || 'Failed to fetch player history' },
                { status: strapiResponse.status },
            )
        }

        const payload = await strapiResponse.json()
        const rawItems = Array.isArray(payload?.data) ? payload.data : []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = rawItems.map((it: any) => {
            const rawMatches = Array.isArray(it?.matches) ? it.matches : []
            const playedRawMatches = rawMatches.filter((match: Record<string, unknown>) =>
                isPlayedMatch(match),
            )
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const matches = includeMatches
                ? playedRawMatches.map((m: any) => ({
                      ...m,
                      scoreFor: Number(m?.scoreFor) || 0,
                      scoreAgainst: Number(m?.scoreAgainst) || 0,
                      innings: Number(m?.innings) || 0,
                      playerPossiblePoints: Number(m?.playerPossiblePoints) || 0,
                      opponentPossiblePoints: Number(m?.opponentPossiblePoints) || 0,
                      highRun: Number(m?.highRun) || 0,
                  }))
                : []
            const totalMatches = matches.length
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const wins = matches.filter((m: any) => m.result === 'win').length
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const losses = matches.filter((m: any) => m.result === 'loss').length
            const highestRun = matches.length
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  Math.max(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ...matches.map((m: any) => Number(m.highRun) || 0),
                  )
                : 0
            const rawTotalPoints = Array.isArray(playedRawMatches)
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  playedRawMatches.reduce((sum: number, m: any) => sum + (Number(m?.scoreFor) || 0), 0)
                : 0
            const rawTotalInnings = Array.isArray(playedRawMatches)
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  playedRawMatches.reduce((sum: number, m: any) => sum + (Number(m?.innings) || 0), 0)
                : 0
            let totalPoints = 0
            let totalInnings = 0
            for (const m of matches) {
                totalPoints += m.scoreFor
                totalInnings += m.innings
            }
            const avgPerInningNum =
                totalInnings > 0
                    ? Number((totalPoints / totalInnings).toFixed(3))
                    : rawTotalInnings > 0
                      ? Number((rawTotalPoints / rawTotalInnings).toFixed(3))
                    : (() => {
                          const raw = it?.avgPerInning
                          if (typeof raw === 'string') {
                              const parsed = Number(raw.replace(',', '.'))
                              return Number.isFinite(parsed) ? parsed : 0
                          }
                          const n = Number(raw)
                          return Number.isFinite(n) ? n : 0
                      })()
            return {
                id: it?.id ?? '',
                tournament: it?.tournament ?? null,
                year: typeof it?.year === 'number' ? it.year : null,
                gameType: normalizeGameTypeOrFallback(it?.gameType),
                tournamentType:
                    typeof it?.tournamentType === 'string'
                        ? it.tournamentType
                        : null,
                position: it?.position ?? 'Participant',
                finals: Array.isArray(it?.finals) ? it.finals : [],
                stageResults: Array.isArray(it?.stageResults)
                    ? it.stageResults
                    : [],
                matches,
                hasFinalResult: Array.isArray(it?.finals)
                    ? it.finals.some(
                          (entry: { position?: unknown }) =>
                              Number.isFinite(Number(entry?.position)),
                      )
                    : false,
                totalMatches:
                    Number(it?.totalMatches) ||
                    (includeMatches
                        ? totalMatches
                        : Array.isArray(playedRawMatches)
                          ? playedRawMatches.length
                          : 0),
                wins:
                    Number(it?.wins) ||
                    (includeMatches
                        ? wins
                        : Array.isArray(playedRawMatches)
                          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            playedRawMatches.filter((m: any) => m?.result === 'win').length
                          : 0),
                losses:
                    Number(it?.losses) ||
                    (includeMatches
                        ? losses
                        : Array.isArray(playedRawMatches)
                          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            playedRawMatches.filter((m: any) => m?.result === 'loss').length
                          : 0),
                highestRun:
                    Number(it?.highestRun) ||
                    (includeMatches
                        ? highestRun
                        : Array.isArray(playedRawMatches)
                          ? Math.max(
                                0,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                ...playedRawMatches.map((m: any) => Number(m?.highRun) || 0),
                            )
                          : 0),
                avgPerInning: avgPerInningNum,
            }
        })
        const filteredItems = items.filter(
            (item: {
                gameType: string | null
                tournamentType: string | null
                totalMatches: number
                hasFinalResult: boolean
            }) => {
                if (item.totalMatches <= 0 && !item.hasFinalResult) {
                    return false
                }
                if (
                    normalizedGameType &&
                    normalizeGameTypeOrFallback(item.gameType) !== normalizedGameType
                ) {
                    return false
                }
                if (
                    tournamentType &&
                    String(item.tournamentType || '').trim() !== tournamentType
                ) {
                    return false
                }
                return true
            },
        )
        const totalCount = filteredItems.length
        const limitedItems = limit ? filteredItems.slice(0, limit) : filteredItems
        const normalized = {
            data: limitedItems,
            totalCount,
            availableYears: Array.isArray(payload?.meta?.availableYears)
                ? payload.meta.availableYears
                : [],
            availableGameTypes: (
                Array.isArray(payload?.meta?.availableGameTypes)
                    ? payload.meta.availableGameTypes
                    : []
            )
                .map((value: unknown) => normalizeGameTypeOrFallback(value))
                .filter((value: string | null): value is string => Boolean(value))
                .filter((value: string, index: number, arr: string[]) => arr.indexOf(value) === index),
            availableTournamentTypes: Array.isArray(
                payload?.meta?.availableTournamentTypes,
            )
                ? payload.meta.availableTournamentTypes
                : [],
        }
        return NextResponse.json(normalized, { status: 200 })
    } catch (error) {
        console.error('[frontend.api.players.history][GET]', error)
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
