import { NextRequest, NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/serverEnv'

export const runtime = 'nodejs'

const IS_PRODUCTION = (getServerEnv('NODE_ENV') || process.env.NODE_ENV) === 'production'
const STRAPI_URL =
    getServerEnv('STRAPI_API_URL') ||
    (IS_PRODUCTION ? 'http://127.0.0.1:1337' : getServerEnv('NEXT_PUBLIC_STRAPI_URL')) ||
    'http://localhost:1337'
const STRAPI_API_TOKEN = getServerEnv('STRAPI_API_TOKEN') || process.env.STRAPI_API_TOKEN

const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

const asObject = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : null

const asArray = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value)
        ? value.map((item) => asObject(item)).filter((item): item is Record<string, unknown> => Boolean(item))
        : []

const isMissingStat = (value: unknown) => value === undefined || value === null || value === ''

const isKnockoutStageType = (value: unknown): boolean => {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
    return ['single_elimination', 'double_elimination', 'knockout', 'brackets'].includes(normalized)
}

const resolveArtisticMatchPoints = (
    match: Record<string, unknown>,
    role: 'player1' | 'player2',
) => {
    const explicit = toNumber(match[`${role}_match_points`])
    if (explicit !== null) return explicit

    const playerPoints = toNumber(match[`${role}_points`])
    const opponentRole = role === 'player1' ? 'player2' : 'player1'
    const opponentPoints = toNumber(match[`${opponentRole}_points`])
    const penaltyWinner = toNumber(match.penalty_winner)

    if (playerPoints !== null && opponentPoints !== null) {
        if (playerPoints > opponentPoints) return 2
        if (playerPoints < opponentPoints) return 0
    }

    if (penaltyWinner === (role === 'player1' ? 1 : 2)) return 2
    if (penaltyWinner === (role === 'player1' ? 2 : 1)) return 0

    return 1
}

const isEligibleArtisticBestGameMatch = (
    match: Record<string, unknown>,
    role: 'player1' | 'player2',
) => {
    const source = String(match.source ?? '').toLowerCase()
    if (source.includes('double-ff')) return false
    if (
        role === 'player1' &&
        (source.includes('ff-1') || source.includes('forfeit-1') || source.includes('forfait-1'))
    ) {
        return false
    }
    if (
        role === 'player2' &&
        (source.includes('ff-2') || source.includes('forfeit-2') || source.includes('forfait-2'))
    ) {
        return false
    }

    const playerMatchPoints = resolveArtisticMatchPoints(match, role)
    const opponentMatchPoints = resolveArtisticMatchPoints(
        match,
        role === 'player1' ? 'player2' : 'player1',
    )
    return playerMatchPoints >= opponentMatchPoints
}

const looksLikeHtmlError = (value: string) => {
    const normalized = value.trim().toLowerCase()
    return normalized.startsWith('<!doctype html') || normalized.startsWith('<html')
}

const buildStageMatchKey = (match: Record<string, unknown>) => {
    const documentId =
        typeof match.documentId === 'string' && match.documentId.trim()
            ? match.documentId.trim()
            : null
    if (documentId) return `doc:${documentId}`

    const matchNumber = toNumber(match.match_number)
    const groupNumber = toNumber(match.number)
    const player1 =
        asObject(match.player1) &&
        typeof asObject(match.player1)?.documentId === 'string'
            ? (asObject(match.player1)?.documentId as string)
            : ''
    const player2 =
        asObject(match.player2) &&
        typeof asObject(match.player2)?.documentId === 'string'
            ? (asObject(match.player2)?.documentId as string)
            : ''

    if (matchNumber !== null || groupNumber !== null || player1 || player2) {
        return `meta:${matchNumber ?? ''}:${groupNumber ?? ''}:${player1}:${player2}`
    }

    return null
}

const buildParticipantPlayerSnapshot = (
    participant: Record<string, unknown>,
): Record<string, unknown> | null => {
    const player = asObject(participant.player)
    if (!player) return null

    return {
        ...player,
        status:
            typeof participant.participant_status === 'string'
                ? participant.participant_status
                : undefined,
        participant_status:
            typeof participant.participant_status === 'string'
                ? participant.participant_status
                : undefined,
        registration_date:
            typeof participant.registration_date === 'string'
                ? participant.registration_date
                : undefined,
        ranking: toNumber(participant.ranking),
        seed: toNumber(participant.seed),
    }
}

const resolveClubTournamentDocumentId = (value: string): string | null => {
    const trimmed = String(value || '').trim()
    if (trimmed.startsWith('club-tournament:')) {
        return trimmed.slice('club-tournament:'.length).trim() || null
    }
    if (trimmed.startsWith('club-tournament-')) {
        return trimmed.slice('club-tournament-'.length).trim() || null
    }
    return null
}

const readDateYear = (value: unknown): number | null => {
    if (typeof value !== 'string' || !value.trim()) return null
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.getFullYear()
    const match = value.match(/\b(\d{4})\b/)
    return match ? Number(match[1]) : null
}

const readString = (value: unknown): string | null => {
    const cleaned = String(value || '').trim()
    return cleaned || null
}

const groupNumberFromLabel = (value: unknown, fallback: number): number => {
    const label = typeof value === 'string' ? value : ''
    const match = label.match(/\d+/)
    return match ? Number(match[0]) : fallback
}

const hasClubRuntimeMatchResult = (match: Record<string, unknown>): boolean =>
    [
        'player1_points',
        'player2_points',
        'player1_innings',
        'player2_innings',
        'player1_high_run',
        'player2_high_run',
        'player1_high_run2',
        'player2_high_run2',
        'player1_high_run_2',
        'player2_high_run_2',
    ].some((field) => (toNumber(match[field]) ?? 0) > 0)

const clubRuntimeMatchPoints = (match: Record<string, unknown>, role: 'player1' | 'player2'): number => {
    if (!hasClubRuntimeMatchResult(match)) return 0

    const playerPoints = toNumber(match[`${role}_points`]) ?? 0
    const opponentRole = role === 'player1' ? 'player2' : 'player1'
    const opponentPoints = toNumber(match[`${opponentRole}_points`]) ?? 0

    if (playerPoints > opponentPoints) return 2
    if (playerPoints < opponentPoints) return 0
    return 1
}

const getClubRuntime = (tournament: Record<string, unknown>) => {
    const formatDefinition = asObject(tournament.format_definition) ?? {}
    return asObject(formatDefinition.clubRuntime) ?? {}
}

const buildClubRuntimePlayer = (
    participantById: Map<string, Record<string, unknown>>,
    participantId: unknown,
    fallbackName: unknown,
    fallbackDocumentId: unknown,
): Record<string, unknown> => {
    const participantKey = readString(participantId)
    const participant = participantKey ? participantById.get(participantKey) : null
    const displayName =
        readString(participant?.displayName) ??
        readString(participant?.btPlayerName) ??
        readString(fallbackName) ??
        'Club player'
    const documentId =
        readString(participant?.btPlayerDocumentId) ??
        readString(participant?.membershipDocumentId) ??
        readString(fallbackDocumentId) ??
        participantKey ??
        displayName

    return {
        id: null,
        documentId,
        full_name: displayName,
        full_name_en: displayName,
        country: readString(participant?.country),
    }
}

const mapClubRuntimeMatch = (
    match: Record<string, unknown>,
    index: number,
    participantById: Map<string, Record<string, unknown>>,
) => {
    const player1Source = asObject(match.player1) ?? {}
    const player2Source = asObject(match.player2) ?? {}
    const groupNumber = groupNumberFromLabel(match.group_label, 1)

    return {
        id: readString(match.documentId) ?? readString(match.id) ?? `club-match-${index + 1}`,
        documentId: readString(match.documentId) ?? readString(match.id) ?? `club-match-${index + 1}`,
        number: groupNumber,
        date_time: readString(match.date_time),
        player1_points: toNumber(match.player1_points) ?? 0,
        player1_match_points: clubRuntimeMatchPoints(match, 'player1'),
        player1_innings: toNumber(match.player1_innings) ?? 0,
        player1_high_run: toNumber(match.player1_high_run) ?? 0,
        player1_high_run_2: toNumber(match.player1_high_run2) ?? toNumber(match.player1_high_run_2) ?? 0,
        player2_points: toNumber(match.player2_points) ?? 0,
        player2_match_points: clubRuntimeMatchPoints(match, 'player2'),
        player2_innings: toNumber(match.player2_innings) ?? 0,
        player2_high_run: toNumber(match.player2_high_run) ?? 0,
        player2_high_run_2: toNumber(match.player2_high_run2) ?? toNumber(match.player2_high_run_2) ?? 0,
        match_number: toNumber(match.match_number) ?? index + 1,
        round: readString(match.round),
        bracket_type: readString(match.bracket_type),
        global_match_number: toNumber(match.global_match_number),
        winner_to_global_match_number: toNumber(match.winner_to_global_match_number),
        winner_to_slot: toNumber(match.winner_to_slot),
        loser_to_global_match_number: toNumber(match.loser_to_global_match_number),
        loser_to_slot: toNumber(match.loser_to_slot),
        inningsDetail: match.inningsDetail,
        matchSheetJson: match.matchSheetJson,
        player1: buildClubRuntimePlayer(
            participantById,
            match.player1ParticipantId,
            player1Source.full_name,
            match.player1MembershipDocumentId,
        ),
        player2: buildClubRuntimePlayer(
            participantById,
            match.player2ParticipantId,
            player2Source.full_name,
            match.player2MembershipDocumentId,
        ),
    }
}

const mapClubRuntimeStanding = (
    standing: Record<string, unknown>,
    index: number,
    participantById: Map<string, Record<string, unknown>>,
) => {
    const player = buildClubRuntimePlayer(
        participantById,
        standing.membershipDocumentId,
        standing.displayName,
        standing.membershipDocumentId,
    )

    return {
        id: readString(standing.documentId) ?? `club-standing-${index + 1}`,
        documentId: readString(standing.documentId) ?? `club-standing-${index + 1}`,
        match_points: toNumber(standing.match_points) ?? 0,
        points: toNumber(standing.points) ?? 0,
        innings: toNumber(standing.innings) ?? 0,
        best_average: toNumber(standing.best_average) ?? 0,
        high_run: toNumber(standing.high_run) ?? 0,
        high_run_2: toNumber(standing.high_run2) ?? toNumber(standing.high_run_2) ?? 0,
        group_number: groupNumberFromLabel(standing.group_label, 1),
        group_position: toNumber(standing.position) ?? index + 1,
        final_position: toNumber(standing.final_position),
        source: 'club-runtime',
        player,
    }
}

const compareClubRuntimeStandingRows = (
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    options: { includeMatchPoints?: boolean; bestAverageBeforeHighRun?: boolean } = {},
) => {
    const matchPointsDiff = (toNumber(b.match_points) ?? 0) - (toNumber(a.match_points) ?? 0)
    if (options.includeMatchPoints !== false && matchPointsDiff !== 0) return matchPointsDiff

    const averageA =
        (toNumber(a.innings) ?? 0) > 0
            ? Math.trunc(((toNumber(a.points) ?? 0) / (toNumber(a.innings) ?? 1)) * 1000) / 1000
            : 0
    const averageB =
        (toNumber(b.innings) ?? 0) > 0
            ? Math.trunc(((toNumber(b.points) ?? 0) / (toNumber(b.innings) ?? 1)) * 1000) / 1000
            : 0
    if (averageA !== averageB) return averageB - averageA

    if (options.bestAverageBeforeHighRun) {
        const bestAverageDiff = (toNumber(b.best_average) ?? 0) - (toNumber(a.best_average) ?? 0)
        if (bestAverageDiff !== 0) return bestAverageDiff
    }

    const highRunDiff = (toNumber(b.high_run) ?? 0) - (toNumber(a.high_run) ?? 0)
    if (highRunDiff !== 0) return highRunDiff

    const bestAverageDiff = (toNumber(b.best_average) ?? 0) - (toNumber(a.best_average) ?? 0)
    if (bestAverageDiff !== 0) return bestAverageDiff

    const highRun2Diff = (toNumber(b.high_run_2) ?? 0) - (toNumber(a.high_run_2) ?? 0)
    if (highRun2Diff !== 0) return highRun2Diff

    return (toNumber(b.points) ?? 0) - (toNumber(a.points) ?? 0)
}

const hasUnequalClubRuntimeGroups = (rows: Record<string, unknown>[]) => {
    const sizes = new Map<number, number>()
    rows.forEach((row) => {
        const groupNumber = toNumber(row.group_number) ?? 1
        sizes.set(groupNumber, (sizes.get(groupNumber) ?? 0) + 1)
    })
    return new Set(Array.from(sizes.values()).filter((size) => size > 0)).size > 1
}

const buildClubRuntimeStandingsFromMatches = (matches: Record<string, unknown>[]): Record<string, unknown>[] => {
    const rows = new Map<string, Record<string, unknown>>()

    const ensureRow = (player: Record<string, unknown>, groupNumber: number, keyFallback: string) => {
        const key = readString(player.documentId) ?? keyFallback
        if (!rows.has(key)) {
            rows.set(key, {
                id: `club-standing:${key}`,
                documentId: `club-standing:${key}`,
                match_points: 0,
                points: 0,
                innings: 0,
                best_average: 0,
                high_run: 0,
                high_run_2: 0,
                group_number: groupNumber,
                group_position: 0,
                final_position: null,
                source: 'club-runtime-computed',
                player,
            })
        }
        return rows.get(key)!
    }

    matches.forEach((match) => {
        if (!hasClubRuntimeMatchResult(match)) return

        const groupNumber = toNumber(match.number) ?? 1
        const player1 = asObject(match.player1) ?? {}
        const player2 = asObject(match.player2) ?? {}
        const p1 = ensureRow(player1, groupNumber, `p1:${readString(match.id) ?? rows.size}`)
        const p2 = ensureRow(player2, groupNumber, `p2:${readString(match.id) ?? rows.size}`)

        const p1Points = toNumber(match.player1_points) ?? 0
        const p2Points = toNumber(match.player2_points) ?? 0
        const p1Innings = toNumber(match.player1_innings) ?? 0
        const p2Innings = toNumber(match.player2_innings) ?? 0
        const p1Average = p1Innings > 0 ? Math.trunc((p1Points / p1Innings) * 1000) / 1000 : 0
        const p2Average = p2Innings > 0 ? Math.trunc((p2Points / p2Innings) * 1000) / 1000 : 0

        p1.match_points = (toNumber(p1.match_points) ?? 0) + (toNumber(match.player1_match_points) ?? 0)
        p1.points = (toNumber(p1.points) ?? 0) + p1Points
        p1.innings = (toNumber(p1.innings) ?? 0) + p1Innings
        p1.best_average = Math.max(toNumber(p1.best_average) ?? 0, p1Average)
        p1.high_run = Math.max(toNumber(p1.high_run) ?? 0, toNumber(match.player1_high_run) ?? 0)
        p1.high_run_2 = Math.max(toNumber(p1.high_run_2) ?? 0, toNumber(match.player1_high_run_2) ?? 0)

        p2.match_points = (toNumber(p2.match_points) ?? 0) + (toNumber(match.player2_match_points) ?? 0)
        p2.points = (toNumber(p2.points) ?? 0) + p2Points
        p2.innings = (toNumber(p2.innings) ?? 0) + p2Innings
        p2.best_average = Math.max(toNumber(p2.best_average) ?? 0, p2Average)
        p2.high_run = Math.max(toNumber(p2.high_run) ?? 0, toNumber(match.player2_high_run) ?? 0)
        p2.high_run_2 = Math.max(toNumber(p2.high_run_2) ?? 0, toNumber(match.player2_high_run_2) ?? 0)
    })

    const rankedByGroup = new Map<number, Record<string, unknown>[]>()
    Array.from(rows.values()).forEach((row) => {
        const groupNumber = toNumber(row.group_number) ?? 1
        const groupRows = rankedByGroup.get(groupNumber) ?? []
        groupRows.push(row)
        rankedByGroup.set(groupNumber, groupRows)
    })

    const rankedRows = Array.from(rankedByGroup.entries()).flatMap(([groupNumber, groupRows]) =>
        [...groupRows]
            .sort((a, b) => compareClubRuntimeStandingRows(a, b, { includeMatchPoints: true }))
            .map((row, index) => ({
                ...row,
                group_number: groupNumber,
                group_position: index + 1,
            })),
    )

    const useUnequalGroupRanking = hasUnequalClubRuntimeGroups(rankedRows)

    return rankedRows
        .sort((a, b) => {
            const positionDiff = (toNumber(a.group_position) ?? 9999) - (toNumber(b.group_position) ?? 9999)
            if (positionDiff !== 0) return positionDiff

            const metricDiff = compareClubRuntimeStandingRows(a, b, {
                includeMatchPoints: !useUnequalGroupRanking,
                bestAverageBeforeHighRun: useUnequalGroupRanking,
            })
            if (metricDiff !== 0) return metricDiff

            return (toNumber(a.group_number) ?? 1) - (toNumber(b.group_number) ?? 1)
        })
        .map((row, index) => ({
            ...row,
            final_position: index + 1,
        }))
}

const buildClubTournamentEventPayload = async (
    clubTournamentDocumentId: string,
    headers: HeadersInit,
) => {
    const queryParams = new URLSearchParams()
    queryParams.set('filters[documentId][$eq]', clubTournamentDocumentId)
    queryParams.set('pagination[limit]', '1')
    queryParams.set('fields[0]', 'documentId')
    queryParams.set('fields[1]', 'title')
    queryParams.set('fields[2]', 'slug')
    queryParams.set('fields[3]', 'startDate')
    queryParams.set('fields[4]', 'endDate')
    queryParams.set('fields[5]', 'game_type')
    queryParams.set('fields[6]', 'format_definition')
    queryParams.set('fields[7]', 'tournament_status')

    const url = `${STRAPI_URL}/api/tournaments?${queryParams.toString()}`
    const res = await fetch(url, {
        cache: 'no-store',
        headers,
    })
    if (!res.ok) return null

    const payload = (await res.json().catch(() => null)) as { data?: unknown[] } | null
    const tournament = asObject(Array.isArray(payload?.data) ? payload.data[0] : null)
    if (!tournament) return null

    const runtime = getClubRuntime(tournament)
    const participants = asArray(runtime.participants)
    const participantById = new Map(
        participants
            .map((participant) => [readString(participant.id), participant] as const)
            .filter((entry): entry is readonly [string, Record<string, unknown>] => Boolean(entry[0])),
    )
    const stages = asArray(runtime.stages).map((stage, stageIndex) => {
        const stageType = readString(stage.stage_type) ?? readString(stage.type)
        const stageDocumentId =
            readString(stage.documentId) ??
            readString(stage.id) ??
            `club-stage-${stageIndex + 1}`
        const matches = asArray(stage.matches).map((match, matchIndex) =>
            mapClubRuntimeMatch(match, matchIndex, participantById),
        )
        const computedStandings = buildClubRuntimeStandingsFromMatches(matches)
        const standings =
            computedStandings.length > 0
                ? computedStandings
                : asArray(stage.standings).map((standing, standingIndex) =>
                      mapClubRuntimeStanding(standing, standingIndex, participantById),
                  )

        return {
            id: stageDocumentId,
            documentId: stageDocumentId,
            title: readString(stage.title) ?? `Stage ${stageIndex + 1}`,
            start_date: null,
            end_date: null,
            order: toNumber(stage.order) ?? stageIndex + 1,
            is_final: stageIndex === asArray(runtime.stages).length - 1,
            stage_type: stageType,
            timetable_config: null,
            groups: matches,
            results: standings,
        }
    })
    const startDate = readString(tournament.startDate)
    const endDate = readString(tournament.endDate)

    return {
        data: {
            id: `club-tournament:${clubTournamentDocumentId}`,
            documentId: `club-tournament:${clubTournamentDocumentId}`,
            title: readString(tournament.title) ?? 'Club tournament',
            season: readDateYear(startDate),
            start_date: startDate,
            end_date: endDate,
            game_type: readString(tournament.game_type),
            final_standings_published: true,
            final_standings_published_at: null,
            event_stages: stages,
            results_final: [],
            timetable_slots: [],
            tournament: {
                tournament_status: readString(tournament.tournament_status),
                participants: participants.map((participant) => ({
                    participant_status: readString(participant.participant_status) ?? 'confirmed',
                    registration_date: null,
                    ranking: toNumber(participant.seed),
                    seed: toNumber(participant.seed),
                    player: buildClubRuntimePlayer(
                        participantById,
                        participant.id,
                        participant.displayName,
                        participant.membershipDocumentId,
                    ),
                })),
            },
        },
    }
}

const mergeLiveStageMatches = (
    baseMatches: Record<string, unknown>[],
    liveMatches: Record<string, unknown>[],
): Record<string, unknown>[] => {
    if (baseMatches.length === 0 || liveMatches.length === 0) return liveMatches

    const baseByKey = new Map<string, Record<string, unknown>>()
    for (const match of baseMatches) {
        const key = buildStageMatchKey(match)
        if (key) baseByKey.set(key, match)
    }

    return liveMatches.map((match) => {
        const key = buildStageMatchKey(match)
        const baseMatch = key ? baseByKey.get(key) : null
        if (!baseMatch) return match

        const nextMatch = { ...match }
        if (isMissingStat(nextMatch.player1_high_run_2) && !isMissingStat(baseMatch.player1_high_run_2)) {
            nextMatch.player1_high_run_2 = baseMatch.player1_high_run_2
        }
        if (isMissingStat(nextMatch.player2_high_run_2) && !isMissingStat(baseMatch.player2_high_run_2)) {
            nextMatch.player2_high_run_2 = baseMatch.player2_high_run_2
        }
        return nextMatch
    })
}

const fetchStoredStageResults = async (
    stageId: string,
    headers: HeadersInit,
): Promise<Record<string, unknown>[] | null> => {
    const url = new URL(`${STRAPI_URL}/api/bt-results`)
    url.searchParams.set('filters[event_stage][documentId][$eq]', stageId)
    url.searchParams.set('populate[player][fields][0]', 'full_name')
    url.searchParams.set('populate[player][fields][1]', 'documentId')
    url.searchParams.set('populate[player][fields][2]', 'full_name_en')
    url.searchParams.set('populate[player][fields][3]', 'country')
    url.searchParams.set('fields[0]', 'match_points')
    url.searchParams.set('fields[1]', 'points')
    url.searchParams.set('fields[2]', 'innings')
    url.searchParams.set('fields[3]', 'best_average')
    url.searchParams.set('fields[4]', 'high_run')
    url.searchParams.set('fields[5]', 'high_run_2')
    url.searchParams.set('fields[6]', 'group_number')
    url.searchParams.set('fields[7]', 'group_position')
    url.searchParams.set('fields[8]', 'final_position')
    url.searchParams.set('fields[9]', 'documentId')
    url.searchParams.set('fields[10]', 'qualified')
    url.searchParams.set('fields[11]', 'qualification_type')
    url.searchParams.set('fields[12]', 'source')
    url.searchParams.set('pagination[pageSize]', '1000')
    url.searchParams.set('sort[0]', 'final_position:asc')
    url.searchParams.set('sort[1]', 'group_number:asc')
    url.searchParams.set('sort[2]', 'group_position:asc')

    const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers,
    })
    if (!res.ok) return null
    const payload = (await res.json().catch(() => null)) as { data?: unknown[] } | null
    const rows = Array.isArray(payload?.data)
        ? payload.data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
        : []
    return rows.length > 0 ? rows : null
}

const fetchStageStandings = async (
    stageId: string,
    headers: HeadersInit,
    stageType?: unknown,
): Promise<Record<string, unknown>[] | null> => {
    const useDirectStandings = isKnockoutStageType(stageType)
    if (!useDirectStandings) {
        const storedResults = await fetchStoredStageResults(stageId, headers)
        if (storedResults) return storedResults
    }

    const normalizeKnockoutRows = (rows: Record<string, unknown>[]) => {
        const hasStoredFinalPositions = rows.some((row) => {
            const source = typeof row?.source === 'string' ? row.source : ''
            return source.includes('standings') && (toNumber(row.final_position) ?? 0) > 0
        })
        if (hasStoredFinalPositions || rows.some((row) => row?.source === 'knockout-standings')) {
            return [...rows].sort((a, b) => {
                const posA = toNumber(a.final_position) ?? Number.POSITIVE_INFINITY
                const posB = toNumber(b.final_position) ?? Number.POSITIVE_INFINITY
                if (posA !== posB) return posA - posB
                return (toNumber(a.id) ?? 0) - (toNumber(b.id) ?? 0)
            })
        }

        const targetPoints = rows.reduce((max, row) => Math.max(max, toNumber(row.points) ?? 0), 0)
        return [...rows]
            .sort((a, b) => {
                const completedA = targetPoints > 0 && (toNumber(a.points) ?? 0) >= targetPoints ? 1 : 0
                const completedB = targetPoints > 0 && (toNumber(b.points) ?? 0) >= targetPoints ? 1 : 0
                if (completedA !== completedB) return completedB - completedA

                const averageA = toNumber(a.average) ?? toNumber(a.best_average) ?? 0
                const averageB = toNumber(b.average) ?? toNumber(b.best_average) ?? 0
                if (averageA !== averageB) return averageB - averageA

                const highRunDiff = (toNumber(b.high_run) ?? 0) - (toNumber(a.high_run) ?? 0)
                if (highRunDiff !== 0) return highRunDiff

                const highRun2Diff = (toNumber(b.high_run_2) ?? 0) - (toNumber(a.high_run_2) ?? 0)
                if (highRun2Diff !== 0) return highRun2Diff

                return (toNumber(b.points) ?? 0) - (toNumber(a.points) ?? 0)
            })
            .map((row, index) => ({
                ...row,
                match_points: targetPoints > 0 && (toNumber(row.points) ?? 0) >= targetPoints ? 2 : 0,
                final_position: index + 1,
                stage_rank: index + 1,
                place: index + 1,
                position: index + 1,
            }))
    }

    const standingsQuery =
        'populate[player][fields][0]=full_name&populate[player][fields][1]=documentId&populate[player][fields][2]=full_name_en&populate[player][fields][3]=country'
    const directUrl = `${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(stageId)}/standings?${standingsQuery}`
    let res = await fetch(directUrl, {
        cache: 'no-store',
        headers,
    })

    if (!res.ok && res.status === 404) {
        const resolveUrl = `${STRAPI_URL}/api/bt-event-stages?filters[documentId][$eq]=${encodeURIComponent(stageId)}&fields[0]=id&pagination[limit]=1`
        const resolveRes = await fetch(resolveUrl, {
            cache: 'no-store',
            headers,
        })
        if (resolveRes.ok) {
            const resolvePayload = (await resolveRes.json().catch(() => null)) as { data?: Array<{ id?: number | string }> } | null
            const numericId = resolvePayload?.data?.[0]?.id
            if (numericId !== undefined && numericId !== null) {
                const fallbackUrl = `${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(String(numericId))}/standings?${standingsQuery}`
                res = await fetch(fallbackUrl, {
                    cache: 'no-store',
                    headers,
                })
            }
        }
    }

    if (!res.ok) {
        return null
    }

    const text = await res.text()
    try {
        const payload = JSON.parse(text) as Record<string, unknown>
        const rows =
            asArray(payload.results).length > 0
                ? asArray(payload.results)
                : asArray(payload.data).length > 0
                  ? asArray(payload.data)
                  : asArray(payload.standings)
        return useDirectStandings ? normalizeKnockoutRows(rows) : rows
    } catch {
        return null
    }
}

const fetchStageMatches = async (
    stageId: string,
    headers: HeadersInit,
): Promise<Record<string, unknown>[] | null> => {
    const directUrl = `${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(stageId)}/matches`
    let res = await fetch(directUrl, {
        cache: 'no-store',
        headers,
    })

    if (!res.ok && res.status === 404) {
        const resolveUrl = `${STRAPI_URL}/api/bt-event-stages?filters[documentId][$eq]=${encodeURIComponent(stageId)}&fields[0]=id&pagination[limit]=1`
        const resolveRes = await fetch(resolveUrl, {
            cache: 'no-store',
            headers,
        })
        if (resolveRes.ok) {
            const resolvePayload = (await resolveRes.json().catch(() => null)) as { data?: Array<{ id?: number | string }> } | null
            const numericId = resolvePayload?.data?.[0]?.id
            if (numericId !== undefined && numericId !== null) {
                const fallbackUrl = `${STRAPI_URL}/api/bt-event-stages/${encodeURIComponent(String(numericId))}/matches`
                res = await fetch(fallbackUrl, {
                    cache: 'no-store',
                    headers,
                })
            }
        }
    }

    if (!res.ok) {
        return null
    }

    const text = await res.text()
    try {
        const payload = JSON.parse(text) as Record<string, unknown>
        return asArray(payload.matches)
    } catch {
        return null
    }
}

const playerRankingKey = (row: Record<string, unknown>): string | null => {
    const player = asObject(row.player)
    const playerDocumentId =
        typeof player?.documentId === 'string' && player.documentId.trim().length > 0
            ? player.documentId.trim()
            : null
    if (playerDocumentId) return `doc:${playerDocumentId}`

    const localKey =
        typeof row.local_player_key === 'string' && row.local_player_key.trim().length > 0
            ? row.local_player_key.trim()
            : null
    if (localKey) return `local:${localKey}`

    const playerName =
        typeof player?.full_name === 'string' && player.full_name.trim().length > 0
            ? player.full_name.trim().toLowerCase()
            : typeof row.player_name === 'string' && row.player_name.trim().length > 0
              ? row.player_name.trim().toLowerCase()
              : null
    return playerName ? `name:${playerName}` : null
}

const stageStandingPosition = (row: Record<string, unknown>, fallback: number): number =>
    toNumber(row.final_position) ??
    toNumber(row.position) ??
    toNumber(row.place) ??
    toNumber(row.group_position) ??
    fallback

const mapStageResultToFinalResult = (
    row: Record<string, unknown>,
    index: number,
    finalPosition?: number,
): Record<string, unknown> => {
    const position = finalPosition ?? stageStandingPosition(row, index + 1)
    const documentId =
        typeof row.documentId === 'string' && row.documentId.trim().length > 0
            ? row.documentId
            : `stage-final-${position}`

    return {
        id: row.id ?? documentId,
        documentId,
        position,
        best_average: toNumber(row.best_average) ?? toNumber(row.average),
        caroms: toNumber(row.caroms) ?? toNumber(row.points),
        match_points: toNumber(row.match_points),
        points: toNumber(row.points),
        innings: toNumber(row.innings),
        high_run: toNumber(row.high_run),
        high_run_2: toNumber(row.high_run_2),
        player: row.player,
        source: row.source ?? 'stage-final-standings',
    }
}

const maxNumber = (a: unknown, b: unknown): number | null => {
    const numA = toNumber(a)
    const numB = toNumber(b)
    if (numA === null) return numB
    if (numB === null) return numA
    return Math.max(numA, numB)
}

const mergeStandingTotals = (
    current: Record<string, unknown> | undefined,
    row: Record<string, unknown>,
): Record<string, unknown> => {
    const currentPoints = toNumber(current?.points) ?? toNumber(current?.caroms) ?? 0
    const rowPoints = toNumber(row.points) ?? toNumber(row.caroms) ?? 0
    const totalPoints = currentPoints + rowPoints

    return {
        ...(current ?? row),
        player: current?.player ?? row.player,
        match_points: (toNumber(current?.match_points) ?? 0) + (toNumber(row.match_points) ?? 0),
        points: totalPoints,
        caroms: totalPoints,
        innings: (toNumber(current?.innings) ?? 0) + (toNumber(row.innings) ?? 0),
        high_run: maxNumber(current?.high_run, row.high_run),
        high_run_2: maxNumber(current?.high_run_2, row.high_run_2),
        best_average: maxNumber(
            current?.best_average ?? current?.average,
            row.best_average ?? row.average,
        ),
    }
}

const buildStandingTotalsByPlayer = (
    stages: Record<string, unknown>[],
): Map<string, Record<string, unknown>> => {
    const totals = new Map<string, Record<string, unknown>>()

    stages.forEach((stage) => {
        asArray(stage.results).forEach((row) => {
            const key = playerRankingKey(row)
            if (!key) return
            totals.set(key, mergeStandingTotals(totals.get(key), row))
        })
    })

    return totals
}

const buildFinalResultsFromFinalStages = (
    stages: Record<string, unknown>[],
): Record<string, unknown>[] => {
    const orderedStages = [...stages]
        .sort((a, b) => {
            const orderA = toNumber(a.order) ?? 0
            const orderB = toNumber(b.order) ?? 0
            return orderB - orderA
        })
    const finalStageIndex = orderedStages.findIndex((stage) => isKnockoutStageType(stage.stage_type))
    if (finalStageIndex === -1) return []

    const usedPlayerKeys = new Set<string>()
    const finalRows: Record<string, unknown>[] = []
    const totalsByPlayer = buildStandingTotalsByPlayer(orderedStages.slice(finalStageIndex))

    orderedStages.slice(finalStageIndex).forEach((stage) => {
        const rows = asArray(stage.results)
            .filter((row) => Boolean(asObject(row.player)))
            .filter((row) => Number.isFinite(stageStandingPosition(row, Number.NaN)))
            .sort((a, b) => {
                const positionA = stageStandingPosition(a, 9999)
                const positionB = stageStandingPosition(b, 9999)
                if (positionA !== positionB) return positionA - positionB
                return String(a.id ?? a.documentId ?? '').localeCompare(String(b.id ?? b.documentId ?? ''))
            })

        rows.forEach((row) => {
            const key = playerRankingKey(row)
            if (!key || usedPlayerKeys.has(key)) return
            usedPlayerKeys.add(key)
            const totals = totalsByPlayer.get(key)
            finalRows.push(
                mapStageResultToFinalResult(
                    {
                        ...row,
                        ...(totals ?? {}),
                        player: row.player ?? totals?.player,
                    },
                    finalRows.length,
                    finalRows.length + 1,
                ),
            )
        })
    })

    return finalRows
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const documentId = params.id

        const buildQueryParams = () => {
            const queryParams = new URLSearchParams()
            queryParams.set('populate[event_stages][sort][0]', 'order:asc')
            queryParams.set('populate[event_stages][fields][0]', 'title')
            queryParams.set('populate[event_stages][fields][1]', 'start_date')
            queryParams.set('populate[event_stages][fields][2]', 'end_date')
            queryParams.set('populate[event_stages][fields][3]', 'order')
            queryParams.set('populate[event_stages][fields][4]', 'is_final')
            queryParams.set('populate[event_stages][fields][5]', 'documentId')
            queryParams.set('populate[event_stages][fields][6]', 'stage_type')
            queryParams.set('populate[event_stages][fields][7]', 'timetable_config')
            queryParams.set('populate[event_stages][fields][8]', 'ruleset_key')
            queryParams.set('populate[event_stages][fields][9]', 'ruleset_config')
            queryParams.set('populate[event_stages][populate][groups][sort][0]', 'number:asc')
            queryParams.set('populate[event_stages][populate][groups][fields][0]', 'number')
            queryParams.set('populate[event_stages][populate][groups][fields][1]', 'date_time')
            queryParams.set('populate[event_stages][populate][groups][fields][2]', 'player1_points')
            queryParams.set('populate[event_stages][populate][groups][fields][3]', 'player1_match_points')
            queryParams.set('populate[event_stages][populate][groups][fields][4]', 'player1_innings')
            queryParams.set('populate[event_stages][populate][groups][fields][5]', 'player1_high_run')
            queryParams.set('populate[event_stages][populate][groups][fields][6]', 'player2_points')
            queryParams.set('populate[event_stages][populate][groups][fields][7]', 'player2_match_points')
            queryParams.set('populate[event_stages][populate][groups][fields][8]', 'player2_innings')
            queryParams.set('populate[event_stages][populate][groups][fields][9]', 'player2_high_run')
            queryParams.set('populate[event_stages][populate][groups][fields][10]', 'documentId')
            queryParams.set('populate[event_stages][populate][groups][fields][11]', 'player1_high_run_2')
            queryParams.set('populate[event_stages][populate][groups][fields][12]', 'player2_high_run_2')
            queryParams.set('populate[event_stages][populate][groups][fields][13]', 'global_match_number')
            queryParams.set('populate[event_stages][populate][groups][fields][14]', 'winner_to_global_match_number')
            queryParams.set('populate[event_stages][populate][groups][fields][15]', 'winner_to_slot')
            queryParams.set('populate[event_stages][populate][groups][fields][16]', 'loser_to_global_match_number')
            queryParams.set('populate[event_stages][populate][groups][fields][17]', 'loser_to_slot')
            queryParams.set('populate[event_stages][populate][groups][fields][18]', 'round')
            queryParams.set('populate[event_stages][populate][groups][fields][19]', 'bracket_type')
            queryParams.set('populate[event_stages][populate][groups][fields][20]', 'match_number')
            queryParams.set('populate[event_stages][populate][groups][fields][21]', 'inningsDetail')
            queryParams.set('populate[event_stages][populate][groups][fields][22]', 'matchSheetJson')
            queryParams.set('populate[event_stages][populate][groups][fields][23]', 'player1_match_points_override')
            queryParams.set('populate[event_stages][populate][groups][fields][24]', 'player2_match_points_override')
            queryParams.set('populate[event_stages][populate][groups][fields][25]', 'player1_local_key')
            queryParams.set('populate[event_stages][populate][groups][fields][26]', 'player1_local_name')
            queryParams.set('populate[event_stages][populate][groups][fields][27]', 'player1_local_country')
            queryParams.set('populate[event_stages][populate][groups][fields][28]', 'player2_local_key')
            queryParams.set('populate[event_stages][populate][groups][fields][29]', 'player2_local_name')
            queryParams.set('populate[event_stages][populate][groups][fields][30]', 'player2_local_country')

            queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][0]', 'full_name')
            queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][1]', 'documentId')
            queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][2]', 'full_name_en')
            queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][3]', 'country')
            queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][4]', 'birth_date')
            queryParams.set('populate[event_stages][populate][groups][populate][player1][populate][photo_main][fields][0]', 'url')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][0]', 'full_name')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][1]', 'documentId')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][2]', 'full_name_en')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][3]', 'country')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][4]', 'birth_date')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][populate][photo_main][fields][0]', 'url')

            queryParams.set('populate[event_stages][populate][results][sort][0]', 'group_number:asc')
            queryParams.set('populate[event_stages][populate][results][sort][1]', 'final_position:asc')
            queryParams.set('populate[event_stages][populate][results][fields][0]', 'match_points')
            queryParams.set('populate[event_stages][populate][results][fields][1]', 'points')
            queryParams.set('populate[event_stages][populate][results][fields][2]', 'innings')
            queryParams.set('populate[event_stages][populate][results][fields][3]', 'best_average')
            queryParams.set('populate[event_stages][populate][results][fields][4]', 'high_run')
            queryParams.set('populate[event_stages][populate][results][fields][5]', 'group_number')
            queryParams.set('populate[event_stages][populate][results][fields][6]', 'group_position')
            queryParams.set('populate[event_stages][populate][results][fields][7]', 'final_position')
            queryParams.set('populate[event_stages][populate][results][fields][8]', 'documentId')
            queryParams.set('populate[event_stages][populate][results][fields][9]', 'high_run_2')
            queryParams.set('populate[event_stages][populate][results][fields][10]', 'qualified')
            queryParams.set('populate[event_stages][populate][results][fields][11]', 'qualification_type')
            queryParams.set('populate[event_stages][populate][results][fields][12]', 'source')
            queryParams.set('populate[event_stages][populate][results][fields][13]', 'local_player_key')
            queryParams.set('populate[event_stages][populate][results][fields][14]', 'local_player_name')
            queryParams.set('populate[event_stages][populate][results][fields][15]', 'local_player_country')

            queryParams.set('populate[event_stages][populate][results][populate][player][fields][0]', 'full_name')
            queryParams.set('populate[event_stages][populate][results][populate][player][fields][1]', 'documentId')
            queryParams.set('populate[event_stages][populate][results][populate][player][fields][2]', 'full_name_en')
            queryParams.set('populate[event_stages][populate][results][populate][player][fields][3]', 'country')
            queryParams.set('populate[event_stages][populate][results][populate][player][populate][photo_main][fields][0]', 'url')

            queryParams.set('populate[results_final][sort][0]', 'position:asc')
            queryParams.set('populate[results_final][fields][0]', 'position')
            queryParams.set('populate[results_final][fields][1]', 'best_average')
            queryParams.set('populate[results_final][fields][2]', 'caroms')
            queryParams.set('populate[results_final][fields][3]', 'match_points')
            queryParams.set('populate[results_final][fields][4]', 'points')
            queryParams.set('populate[results_final][fields][5]', 'innings')
            queryParams.set('populate[results_final][fields][6]', 'high_run')
            queryParams.set('populate[results_final][fields][7]', 'high_run_2')
            queryParams.set('populate[results_final][fields][8]', 'ranking_points')
            queryParams.set('populate[results_final][fields][9]', 'penalty')
            queryParams.set('populate[results_final][fields][10]', 'final_points')
            queryParams.set('populate[results_final][fields][11]', 'documentId')
            queryParams.set('populate[results_final][fields][12]', 'restricted_best_avg')
            queryParams.set('populate[results_final][populate][player][fields][0]', 'full_name')
            queryParams.set('populate[results_final][populate][player][fields][1]', 'documentId')
            queryParams.set('populate[results_final][populate][player][fields][2]', 'full_name_en')
            queryParams.set('populate[results_final][populate][player][fields][3]', 'country')
            queryParams.set('populate[results_final][populate][player][populate][photo_main][fields][0]', 'url')

            queryParams.set('populate[tournament][fields][0]', 'ruleset_key')
            queryParams.set('populate[tournament][fields][1]', 'ruleset_config')
            queryParams.set('populate[tournament][fields][2]', 'tournament_status')
            queryParams.set('populate[tournament][populate][participants][sort][0]', 'registration_date:asc')
            queryParams.set('populate[tournament][populate][participants][sort][1]', 'ranking:asc')
            queryParams.set('populate[tournament][populate][participants][fields][0]', 'participant_status')
            queryParams.set('populate[tournament][populate][participants][fields][1]', 'registration_date')
            queryParams.set('populate[tournament][populate][participants][fields][2]', 'ranking')
            queryParams.set('populate[tournament][populate][participants][fields][3]', 'seed')
            queryParams.set('populate[tournament][populate][participants][populate][player][fields][0]', 'documentId')
            queryParams.set('populate[tournament][populate][participants][populate][player][fields][1]', 'full_name')
            queryParams.set('populate[tournament][populate][participants][populate][player][fields][2]', 'full_name_en')
            queryParams.set('populate[tournament][populate][participants][populate][player][fields][3]', 'country')
            queryParams.set('populate[tournament][populate][participants][populate][player][fields][4]', 'birth_date')
            queryParams.set('populate[tournament][populate][participants][populate][player][populate][photo_main][fields][0]', 'url')

            queryParams.set('populate[timetable_slots][sort][0]', 'slot_order:asc')
            queryParams.set('populate[timetable_slots][sort][1]', 'date_time:asc')
            queryParams.set('populate[timetable_slots][fields][0]', 'documentId')
            queryParams.set('populate[timetable_slots][fields][1]', 'title')
            queryParams.set('populate[timetable_slots][fields][2]', 'subtitle')
            queryParams.set('populate[timetable_slots][fields][3]', 'description')
            queryParams.set('populate[timetable_slots][fields][4]', 'date')
            queryParams.set('populate[timetable_slots][fields][5]', 'time')
            queryParams.set('populate[timetable_slots][fields][6]', 'date_time')
            queryParams.set('populate[timetable_slots][fields][7]', 'table_label')
            queryParams.set('populate[timetable_slots][fields][8]', 'table_order')
            queryParams.set('populate[timetable_slots][fields][9]', 'slot_order')
            queryParams.set('populate[timetable_slots][fields][10]', 'slot_type')
            queryParams.set('populate[timetable_slots][fields][11]', 'slot_status')
            queryParams.set('populate[timetable_slots][fields][12]', 'is_visible')
            queryParams.set('populate[timetable_slots][fields][13]', 'is_published')
            queryParams.set('populate[timetable_slots][fields][14]', 'source')
            queryParams.set('populate[timetable_slots][fields][15]', 'metadata')
            queryParams.set('populate[timetable_slots][populate][stage][fields][0]', 'documentId')
            queryParams.set('populate[timetable_slots][populate][stage][fields][1]', 'title')
            queryParams.set('populate[timetable_slots][populate][match][fields][0]', 'documentId')
            queryParams.set('populate[timetable_slots][populate][match][fields][1]', 'number')
            queryParams.set('populate[timetable_slots][populate][match][populate][player1][fields][0]', 'full_name')
            queryParams.set('populate[timetable_slots][populate][match][populate][player1][fields][1]', 'full_name_en')
            queryParams.set('populate[timetable_slots][populate][match][populate][player1][fields][2]', 'documentId')
            queryParams.set('populate[timetable_slots][populate][match][populate][player1][fields][3]', 'country')
            queryParams.set('populate[timetable_slots][populate][match][populate][player2][fields][0]', 'full_name')
            queryParams.set('populate[timetable_slots][populate][match][populate][player2][fields][1]', 'full_name_en')
            queryParams.set('populate[timetable_slots][populate][match][populate][player2][fields][2]', 'documentId')
            queryParams.set('populate[timetable_slots][populate][match][populate][player2][fields][3]', 'country')

            queryParams.set('fields[0]', 'documentId')
            queryParams.set('fields[1]', 'title')
            queryParams.set('fields[2]', 'season')
            queryParams.set('fields[3]', 'start_date')
            queryParams.set('fields[4]', 'end_date')
            queryParams.set('fields[5]', 'timetable_config')
            queryParams.set('fields[6]', 'game_type')
            queryParams.set('fields[7]', 'gallery_videos')
            queryParams.set('fields[8]', 'gallery_sections')
            queryParams.set('fields[9]', 'ruleset_key')
            queryParams.set('fields[10]', 'ruleset_config')
            queryParams.set('fields[11]', 'final_standings_published')
            queryParams.set('fields[12]', 'final_standings_published_at')
            queryParams.set('populate[gallery_images][fields][0]', 'name')
            queryParams.set('populate[gallery_images][fields][1]', 'url')
            queryParams.set('populate[gallery_images][fields][2]', 'alternativeText')
            queryParams.set('populate[gallery_images][fields][3]', 'caption')
            queryParams.set('populate[gallery_images][fields][4]', 'formats')
            queryParams.set('populate[gallery_images][fields][5]', 'documentId')
            queryParams.set('populate[gallery_images][fields][6]', 'mime')

            queryParams.set('populate[gallery_video_files][fields][0]', 'name')
            queryParams.set('populate[gallery_video_files][fields][1]', 'url')
            queryParams.set('populate[gallery_video_files][fields][2]', 'alternativeText')
            queryParams.set('populate[gallery_video_files][fields][3]', 'caption')
            queryParams.set('populate[gallery_video_files][fields][4]', 'documentId')
            queryParams.set('populate[gallery_video_files][fields][5]', 'mime')
            queryParams.set('populate[gallery_video_files][fields][6]', 'createdAt')

            return queryParams
        }

        const headers: HeadersInit = {}
        if (STRAPI_API_TOKEN) {
            headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`
        }

        const clubTournamentDocumentId = resolveClubTournamentDocumentId(documentId)
        if (clubTournamentDocumentId) {
            const clubPayload = await buildClubTournamentEventPayload(
                clubTournamentDocumentId,
                headers,
            )
            if (!clubPayload) {
                return NextResponse.json(
                    { error: 'Club tournament event data not found' },
                    { status: 404 },
                )
            }
            return NextResponse.json(clubPayload, { status: 200 })
        }

        let queryParams = buildQueryParams()
        let url = `${STRAPI_URL}/api/bt-events/${documentId}?${queryParams.toString()}`
        let res = await fetch(url, {
            cache: 'no-store',
            headers,
        })

        let text = await res.text()

        if (!res.ok) {
            console.error('[events.id][GET] Error response:', text)
            return NextResponse.json({ error: text || 'Failed to fetch event' }, { status: res.status })
        }

        try {
            const payload = JSON.parse(text) as { data?: Record<string, unknown> | null }
            const event = asObject(payload?.data)

            if (event) {
                const stages = await Promise.all(
                    asArray(event.event_stages).map(async (stage) => {
                        const stageDocumentId =
                            typeof stage.documentId === 'string' ? stage.documentId : null
                        if (!stageDocumentId) return stage

                        const liveMatches = await fetchStageMatches(stageDocumentId, headers)
                        const liveStandings = await fetchStageStandings(stageDocumentId, headers, stage.stage_type)
                        if (!liveStandings && !liveMatches) return stage

                        const baseGroups = asArray(stage.groups)
                        const mergedGroups = liveMatches
                            ? mergeLiveStageMatches(baseGroups, liveMatches)
                            : null
                        const stageGroups = mergedGroups ?? baseGroups
                        const computedGroupStandings = !isKnockoutStageType(stage.stage_type)
                            ? buildClubRuntimeStandingsFromMatches(stageGroups)
                            : []

                        return {
                            ...stage,
                            ...(mergedGroups ? { groups: mergedGroups } : {}),
                            ...(computedGroupStandings.length > 0
                                ? { results: computedGroupStandings }
                                : liveStandings
                                  ? { results: liveStandings }
                                  : {}),
                        }
                    }),
                )

                const eventGameType =
                    typeof event.game_type === 'string' ? event.game_type.trim().toLowerCase() : null
                const isArtisticEvent = eventGameType === 'artistic'
                const stageMatchPoints = new Map<string, number>()
                const stageBestGame = new Map<string, number>()

                stages.forEach((stage) => {
                    asArray(stage.results).forEach((result) => {
                        const player = asObject(result.player)
                        const playerDocumentId =
                            typeof player?.documentId === 'string' ? player.documentId : null
                        const matchPoints = toNumber(result.match_points)
                        const bestAverage = toNumber(result.best_average)
                        if (playerDocumentId && matchPoints !== null) {
                            stageMatchPoints.set(
                                playerDocumentId,
                                (stageMatchPoints.get(playerDocumentId) ?? 0) + matchPoints,
                            )
                        }
                        if (!isArtisticEvent && playerDocumentId && bestAverage !== null) {
                            stageBestGame.set(
                                playerDocumentId,
                                Math.max(stageBestGame.get(playerDocumentId) ?? 0, bestAverage),
                            )
                        }
                    })
                    if (isArtisticEvent) {
                        asArray(stage.groups).forEach((match) => {
                            const player1 = asObject(match.player1)
                            const player2 = asObject(match.player2)
                            const player1DocumentId =
                                typeof player1?.documentId === 'string' ? player1.documentId : null
                            const player2DocumentId =
                                typeof player2?.documentId === 'string' ? player2.documentId : null
                            const player1Points = toNumber(match.player1_points)
                            const player2Points = toNumber(match.player2_points)
                            const player1Innings = toNumber(match.player1_innings)
                            const player2Innings = toNumber(match.player2_innings)

                            if (
                                player1DocumentId &&
                                player1Points !== null &&
                                player1Innings !== null &&
                                player1Innings > 0 &&
                                isEligibleArtisticBestGameMatch(match, 'player1')
                            ) {
                                const percentage = Math.trunc((player1Points / player1Innings) * 100000) / 1000
                                stageBestGame.set(
                                    player1DocumentId,
                                    Math.max(stageBestGame.get(player1DocumentId) ?? 0, percentage),
                                )
                            }

                            if (
                                player2DocumentId &&
                                player2Points !== null &&
                                player2Innings !== null &&
                                player2Innings > 0 &&
                                isEligibleArtisticBestGameMatch(match, 'player2')
                            ) {
                                const percentage = Math.trunc((player2Points / player2Innings) * 100000) / 1000
                                stageBestGame.set(
                                    player2DocumentId,
                                    Math.max(stageBestGame.get(player2DocumentId) ?? 0, percentage),
                                )
                            }
                        })
                    }
                })

                const storedFinalResults = asArray(event.results_final)
                const stageFinalResults =
                    storedFinalResults.length === 0
                        ? buildFinalResultsFromFinalStages(stages)
                        : []
                const sourceFinalResults =
                    storedFinalResults.length > 0 ? storedFinalResults : stageFinalResults
                const enrichedFinalResults = sourceFinalResults.map((result) => {
                    const player = asObject(result.player)
                    const playerDocumentId =
                        typeof player?.documentId === 'string' ? player.documentId : null
                    const explicitMatchPoints = toNumber(result.match_points)
                    const legacyMatchPoints = toNumber(result.points)
                    const derivedMatchPoints =
                        explicitMatchPoints === null && legacyMatchPoints === null && playerDocumentId
                            ? (stageMatchPoints.get(playerDocumentId) ?? null)
                            : null
                    const resolvedMatchPoints =
                        explicitMatchPoints ?? legacyMatchPoints ?? derivedMatchPoints
                    const hasExplicitBestGameField =
                        Object.prototype.hasOwnProperty.call(result, 'best_game')
                    const explicitBestGame =
                        hasExplicitBestGameField && result.best_game !== undefined
                            ? toNumber(result.best_game)
                            : null
                    const derivedBestGame =
                        isArtisticEvent && playerDocumentId && !hasExplicitBestGameField
                            ? (stageBestGame.get(playerDocumentId) ?? null)
                            : null
                    const restrictedBestAverage = toNumber(result.restricted_best_avg)

                    if (
                        resolvedMatchPoints === null &&
                        derivedBestGame === null &&
                        explicitBestGame === null &&
                        restrictedBestAverage === null
                    ) {
                        return result
                    }

                    return {
                        ...result,
                        ...(restrictedBestAverage === null
                            ? {}
                            : { best_average: restrictedBestAverage }),
                        ...(resolvedMatchPoints === null ? {} : { match_points: resolvedMatchPoints }),
                        ...(hasExplicitBestGameField
                            ? { best_game: explicitBestGame }
                            : derivedBestGame === null
                              ? {}
                              : { best_game: derivedBestGame }),
                    }
                })

                const tournament = asObject(event.tournament)
                const registeredPlayers = tournament
                    ? asArray(tournament.participants)
                          .map((participant) => buildParticipantPlayerSnapshot(participant))
                          .filter((player): player is Record<string, unknown> => Boolean(player))
                    : []

                payload.data = {
                    ...event,
                    final_standings_published:
                        event.final_standings_published === true || stageFinalResults.length > 0,
                    event_stages: stages,
                    results_final: enrichedFinalResults,
                    ...(registeredPlayers.length > 0 ? { players: registeredPlayers } : {}),
                }
            }

            return NextResponse.json(payload, { status: 200 })
        } catch {
            console.error('[events.id][GET] Non-JSON upstream payload:', text.slice(0, 400))
            return NextResponse.json(
                { error: 'Invalid upstream event payload' },
                { status: 502 },
            )
        }
    } catch (error) {
        console.error('[events.id][GET]', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
