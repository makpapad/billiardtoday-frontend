import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

type RouteContext = { params: Promise<{ id?: string }> }

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

        const strapiUrl = new URL(
            `${STRAPI_URL}/api/bt-players/participations-by`,
        )
        strapiUrl.searchParams.set('id', playerId)
        if (year) strapiUrl.searchParams.set('year', year)
        if (gameType) strapiUrl.searchParams.set('gameType', gameType)

        const fetchFromStrapi = async (useAuth: boolean) =>
            fetch(strapiUrl.toString(), {
                headers:
                    useAuth && STRAPI_API_TOKEN
                        ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
                        : undefined,
                cache: 'no-store',
            })

        let strapiResponse = await fetchFromStrapi(Boolean(STRAPI_API_TOKEN))

        if (!strapiResponse.ok) {
            // Some deployments have restricted API tokens but allow public read.
            if (
                STRAPI_API_TOKEN &&
                (strapiResponse.status === 401 || strapiResponse.status === 403)
            ) {
                const retry = await fetchFromStrapi(false)
                if (retry.ok) {
                    strapiResponse = retry
                } else {
                    const retryText = await retry.text().catch(() => '')
                    return NextResponse.json(
                        { error: retryText || 'Failed to fetch player history' },
                        { status: retry.status },
                    )
                }
            } else {
                const errorText = await strapiResponse.text().catch(() => '')
                return NextResponse.json(
                    { error: errorText || 'Failed to fetch player history' },
                    { status: strapiResponse.status },
                )
            }
        }

        const payload = await strapiResponse.json()
        const rawItems = Array.isArray(payload?.data) ? payload.data : []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = rawItems.map((it: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const matches = Array.isArray(it?.matches)
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  it.matches.map((m: any) => ({
                      ...m,
                      scoreFor: Number(m?.scoreFor) || 0,
                      scoreAgainst: Number(m?.scoreAgainst) || 0,
                      innings: Number(m?.innings) || 0,
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
            let totalPoints = 0
            let totalInnings = 0
            for (const m of matches) {
                totalPoints += m.scoreFor
                totalInnings += m.innings
            }
            const avgPerInningNum =
                totalInnings > 0
                    ? Number((totalPoints / totalInnings).toFixed(3))
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
                gameType:
                    typeof it?.gameType === 'string' ? it.gameType : null,
                position: it?.position ?? 'Participant',
                finals: Array.isArray(it?.finals) ? it.finals : [],
                stageResults: Array.isArray(it?.stageResults)
                    ? it.stageResults
                    : [],
                matches,
                totalMatches: Number(it?.totalMatches) || totalMatches,
                wins: Number(it?.wins) || wins,
                losses: Number(it?.losses) || losses,
                highestRun: Number(it?.highestRun) || highestRun,
                avgPerInning: avgPerInningNum,
            }
        })
        const normalized = {
            data: items,
            availableYears: Array.isArray(payload?.meta?.availableYears)
                ? payload.meta.availableYears
                : [],
            availableGameTypes: Array.isArray(
                payload?.meta?.availableGameTypes,
            )
                ? payload.meta.availableGameTypes
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
