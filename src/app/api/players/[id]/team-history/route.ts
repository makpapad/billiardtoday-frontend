import { NextRequest, NextResponse } from 'next/server'
import { buildTeamTournamentSlugFromParts } from '@/lib/federationPageData'

export const runtime = 'nodejs'
export const revalidate = 300

const STRAPI_URL = (
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    process.env.STRAPI_FALLBACK_URL ||
    'https://app.billiardtoday.com'
).replace(/\/+$/, '')
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

type RouteContext = { params: Promise<{ id?: string }> }

const toNumber = (value: unknown): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

const toText = (value: unknown): string =>
    typeof value === 'string' ? value.trim() : ''

async function strapiGet(
    path: string,
    params: URLSearchParams,
): Promise<Record<string, unknown>> {
    const res = await fetch(`${STRAPI_URL}/api${path}?${params.toString()}`, {
        headers: STRAPI_API_TOKEN
            ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
            : {},
        next: { revalidate },
    })

    if (!res.ok) {
        throw new Error(`Strapi ${res.status} για ${path}`)
    }

    return (await res.json()) as Record<string, unknown>
}

/** Χρονιά από τον τίτλο της διοργάνωσης («3 Cushion 2026-2027 Γ Κατηγορία» → 2026-2027). */
const seasonFromTitle = (title: string): string => {
    const match = title.match(/(\d{4})\s*[-–/]\s*(\d{4})/)
    return match ? `${match[1]}-${match[2]}` : ''
}

/** Χρονιά από την ημερομηνία: Αύγουστος → επόμενη σεζόν. */
const seasonFromDate = (isoDate: string): string => {
    if (!isoDate) return ''
    const date = new Date(isoDate)
    if (Number.isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

export async function GET(_request: NextRequest, context: RouteContext) {
    const { id } = await context.params
    const playerId = (id || '').split('-')[0].trim()

    if (!/^\d+$/.test(playerId)) {
        return NextResponse.json(
            { error: 'Μη έγκυρο αναγνωριστικό αθλητή.' },
            { status: 400 },
        )
    }

    try {
        // 1) Ο αθλητής: documentId για τα υπόλοιπα queries.
        const playerParams = new URLSearchParams({
            'filters[id][$eq]': playerId,
            'fields[0]': 'documentId',
            'fields[1]': 'full_name',
            'fields[2]': 'full_name_en',
            'pagination[pageSize]': '1',
        })
        const playerPayload = await strapiGet('/bt-players', playerParams)
        const playerRow = (
            (playerPayload.data as Record<string, unknown>[]) || []
        )[0]

        if (!playerRow) {
            return NextResponse.json(
                { error: 'Ο αθλητής δεν βρέθηκε.' },
                { status: 404 },
            )
        }

        const playerDocumentId = toText(playerRow.documentId)

        // 2) Όλα τα boards του αθλητή σε ομαδικές διοργανώσεις.
        const sets: Record<string, unknown>[] = []
        for (let page = 1; page <= 5; page += 1) {
            const setParams = new URLSearchParams({
                'filters[$or][0][home_player][documentId][$eq]':
                    playerDocumentId,
                'filters[$or][1][away_player][documentId][$eq]':
                    playerDocumentId,
                'fields[0]': 'board_index',
                'fields[1]': 'result',
                'fields[2]': 'discipline',
                'fields[3]': 'home_points',
                'fields[4]': 'away_points',
                'fields[5]': 'home_innings',
                'fields[6]': 'away_innings',
                'fields[7]': 'home_high_run',
                'fields[8]': 'away_high_run',
                'fields[9]': 'home_board_points',
                'fields[10]': 'away_board_points',
                'populate[home_player][fields][0]': 'documentId',
                'populate[away_player][fields][0]': 'documentId',
                'populate[team_match][fields][0]': 'round',
                'populate[team_match][fields][1]': 'group_key',
                'populate[team_match][fields][2]': 'stage',
                'populate[team_match][fields][3]': 'status',
                'populate[team_match][fields][4]': 'match_date',
                // ΠΡΟΣΟΧΗ: όλα τα populate του «team_match» με σύνταξη object — η
                // ανάμιξη με array (`populate[team_match][populate][0]`) δίνει 400
                // («Invalid key 2 at team_match»), και το `sort` σε σχέση δεν επιτρέπεται.
                'populate[team_match][populate][home_team][fields][0]': 'name',
                'populate[team_match][populate][away_team][fields][0]': 'name',
                'populate[team_match][populate][team_tournament][fields][0]':
                    'title',
                'populate[team_match][populate][team_tournament][fields][1]':
                    'division_name',
                'populate[team_match][populate][team_tournament][fields][2]':
                    'country_code',
                'populate[team_match][populate][team_tournament][fields][3]':
                    'documentId',
                'populate[team_match][populate][team_tournament][fields][4]':
                    'config',
                'pagination[pageSize]': '100',
                'pagination[page]': String(page),
            })

            const payload = await strapiGet('/team-match-sets', setParams)
            const pageRows = (payload.data as Record<string, unknown>[]) || []
            sets.push(...pageRows)

            const pagination = (payload.meta as Record<string, unknown>)
                ?.pagination as Record<string, unknown> | undefined
            const pageCount = toNumber(pagination?.pageCount) || 1
            if (page >= pageCount) break
        }

        // 3) Οι τίτλοι των ομίλων (GROUP-1 → «1ος Όμιλος»).
        const tournamentDocumentIds = Array.from(
            new Set(
                sets
                    .map((row) => {
                        const match = (row.team_match || {}) as Record<
                            string,
                            unknown
                        >
                        const tournament = (match.team_tournament || {}) as Record<
                            string,
                            unknown
                        >
                        return toText(tournament.documentId)
                    })
                    .filter(Boolean),
            ),
        )

        const groupTitleByKey = new Map<string, string>()
        if (tournamentDocumentIds.length > 0) {
            const groupParams = new URLSearchParams({
                'fields[0]': 'group_key',
                'fields[1]': 'title',
                'pagination[pageSize]': '100',
            })
            tournamentDocumentIds.forEach((documentId, index) => {
                groupParams.set(
                    `filters[team_tournament][documentId][$in][${index}]`,
                    documentId,
                )
            })

            const groupPayload = await strapiGet('/team-groups', groupParams)
            for (const group of (groupPayload.data as Record<
                string,
                unknown
            >[]) || []) {
                const key = toText(group.group_key)
                const title = toText(group.title)
                if (key && title) groupTitleByKey.set(key, title)
            }
        }

        // 4) Οι ομάδες του αθλητή ανά χρονιά (team-member.season) — για το φίλτρο «Ομάδα».
        const memberParams = new URLSearchParams({
            'filters[player][documentId][$eq]': playerDocumentId,
            'fields[0]': 'season',
            'fields[1]': 'role',
            'populate[team][fields][0]': 'name',
            'populate[team][fields][1]': 'documentId',
            'pagination[pageSize]': '100',
        })
        const memberPayload = await strapiGet('/team-members', memberParams)
        const members = (memberPayload.data as Record<string, unknown>[]) || []

        const teamSeasonByName = new Map<string, string>()
        const teamSeasons = new Map<string, Set<string>>()
        for (const member of members) {
            const team = (member.team || {}) as Record<string, unknown>
            const name = toText(team.name)
            const season = toText(member.season)
            if (!name) continue
            if (season && !teamSeasonByName.has(name)) {
                teamSeasonByName.set(name, season)
            }
            if (season) {
                const bucket = teamSeasons.get(name) || new Set<string>()
                bucket.add(season)
                teamSeasons.set(name, bucket)
            }
        }

        // 5) Γραμμές: μόνο ό,τι έκανε ο αθλητής (πόντοι, στάσεις, Μ.Ο., σερί, αποτέλεσμα).
        const matches = sets
            .map((row) => {
                const match = (row.team_match || {}) as Record<string, unknown>
                if (!match || Object.keys(match).length === 0) return null

                const homeTeam = (match.home_team || {}) as Record<
                    string,
                    unknown
                >
                const awayTeam = (match.away_team || {}) as Record<
                    string,
                    unknown
                >
                const tournament = (match.team_tournament || {}) as Record<
                    string,
                    unknown
                >

                const homePlayer = (row.home_player || {}) as Record<
                    string,
                    unknown
                >
                const awayPlayer = (row.away_player || {}) as Record<
                    string,
                    unknown
                >
                const isHome =
                    toText(homePlayer.documentId) === playerDocumentId ||
                    toText(awayPlayer.documentId) !== playerDocumentId

                const points = toNumber(
                    isHome ? row.home_points : row.away_points,
                )
                const oppPoints = toNumber(
                    isHome ? row.away_points : row.home_points,
                )
                const innings = toNumber(
                    isHome ? row.home_innings : row.away_innings,
                )
                const highRun = toNumber(
                    isHome ? row.home_high_run : row.away_high_run,
                )
                const boardPoints = toNumber(
                    isHome ? row.home_board_points : row.away_board_points,
                )
                const oppBoardPoints = toNumber(
                    isHome ? row.away_board_points : row.home_board_points,
                )

                const rawResult = toText(row.result)
                let result: 'win' | 'draw' | 'loss' | 'pending' = 'pending'
                if (rawResult === 'draw') {
                    result = 'draw'
                } else if (rawResult === 'home_win' || rawResult === 'away_win') {
                    const playerWon =
                        (rawResult === 'home_win' && isHome) ||
                        (rawResult === 'away_win' && !isHome)
                    result = playerWon ? 'win' : 'loss'
                }

                const title = toText(tournament.title)
                const date = toText(match.match_date)
                const teamName = toText(
                    isHome ? homeTeam.name : awayTeam.name,
                )
                const season =
                    seasonFromTitle(title) ||
                    seasonFromDate(date) ||
                    teamSeasonByName.get(teamName) ||
                    ''
                // Ίδιος υπολογισμός με τη σελίδα ομαδικών: το slug χτίζεται από τον
                // τίτλο (περιέχει τη χρονιά) και προστίθεται μόνο το αριθμητικό
                // `config.season` όταν υπάρχει.
                const configSeason = toNumber(
                    (( (tournament.config || {}) as Record<string, unknown>)
                        .season as unknown),
                )
                const slug = buildTeamTournamentSlugFromParts(
                    title,
                    configSeason > 0 ? configSeason : null,
                )
                const groupKey = toText(match.group_key)

                return {
                    id: toText(row.documentId) || `${title}-${date}-${teamName}`,
                    date,
                    season,
                    discipline: toText(row.discipline),
                    tournamentTitle: title,
                    tournamentHref: slug ? `/tournaments/team/${slug}` : '',
                    division: toText(tournament.division_name),
                    groupKey,
                    groupTitle: groupTitleByKey.get(groupKey) || '',
                    round: toNumber(match.round),
                    stage: toText(match.stage),
                    status: toText(match.status),
                    teamName,
                    opponent: toText(isHome ? awayTeam.name : homeTeam.name),
                    isHome,
                    points,
                    oppPoints,
                    innings,
                    highRun,
                    boardPoints,
                    oppBoardPoints,
                    result,
                }
            })
            .filter((row): row is NonNullable<typeof row> => row !== null)
            .filter((row) => row.result !== 'pending' || row.innings > 0)
            .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

        const played = matches.filter((row) => row.result !== 'pending')
        const wins = played.filter((row) => row.result === 'win').length
        const draws = played.filter((row) => row.result === 'draw').length
        const losses = played.filter((row) => row.result === 'loss').length
        const totalPoints = matches.reduce((sum, row) => sum + row.points, 0)
        const totalInnings = matches.reduce((sum, row) => sum + row.innings, 0)
        const averages = matches
            .filter((row) => row.innings > 0)
            .map((row) => row.points / row.innings)

        const disciplines = Array.from(
            new Set(matches.map((row) => row.discipline).filter(Boolean)),
        ).sort()
        const seasons = Array.from(
            new Set(matches.map((row) => row.season).filter(Boolean)),
        ).sort((a, b) => (a < b ? 1 : -1))
        const teams = Array.from(
            new Set(matches.map((row) => row.teamName).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b, 'el'))

        return NextResponse.json({
            player: {
                id: Number(playerId),
                documentId: playerDocumentId,
                name: toText(playerRow.full_name),
                nameEn: toText(playerRow.full_name_en),
            },
            filters: {
                disciplines,
                seasons,
                teams: teams.map((name) => ({
                    name,
                    seasons: Array.from(teamSeasons.get(name) || []).sort(
                        (a, b) => (a < b ? 1 : -1),
                    ),
                })),
            },
            summary: {
                matches: matches.length,
                wins,
                draws,
                losses,
                winPct: played.length > 0 ? (wins / played.length) * 100 : 0,
                points: totalPoints,
                innings: totalInnings,
                avg: totalInnings > 0 ? totalPoints / totalInnings : 0,
                bestAvg: averages.length > 0 ? Math.max(...averages) : 0,
                highRun: matches.reduce(
                    (best, row) => (row.highRun > best ? row.highRun : best),
                    0,
                ),
            },
            matches,
        })
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Άγνωστο σφάλμα'
        return NextResponse.json(
            { error: `Δεν φορτώθηκε το ομαδικό ιστορικό: ${message}` },
            { status: 502 },
        )
    }
}
