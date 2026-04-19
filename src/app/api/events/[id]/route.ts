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

const fetchStageStandings = async (
    stageId: string,
    headers: HeadersInit,
): Promise<Record<string, unknown>[] | null> => {
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
        return rows
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

            queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][0]', 'full_name')
            queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][1]', 'documentId')
            queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][2]', 'full_name_en')
            queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][3]', 'country')
            queryParams.set('populate[event_stages][populate][groups][populate][player1][fields][4]', 'birth_date')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][0]', 'full_name')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][1]', 'documentId')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][2]', 'full_name_en')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][3]', 'country')
            queryParams.set('populate[event_stages][populate][groups][populate][player2][fields][4]', 'birth_date')

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

            queryParams.set('populate[event_stages][populate][results][populate][player][fields][0]', 'full_name')
            queryParams.set('populate[event_stages][populate][results][populate][player][fields][1]', 'documentId')
            queryParams.set('populate[event_stages][populate][results][populate][player][fields][2]', 'full_name_en')
            queryParams.set('populate[event_stages][populate][results][populate][player][fields][3]', 'country')

            queryParams.set('populate[results_final][sort][0]', 'position:asc')
            queryParams.set('populate[results_final][fields][0]', 'position')
            queryParams.set('populate[results_final][fields][1]', 'best_average')
            queryParams.set('populate[results_final][fields][2]', 'caroms')
            queryParams.set('populate[results_final][fields][3]', 'points')
            queryParams.set('populate[results_final][fields][4]', 'innings')
            queryParams.set('populate[results_final][fields][5]', 'high_run')
            queryParams.set('populate[results_final][fields][6]', 'ranking_points')
            queryParams.set('populate[results_final][fields][7]', 'penalty')
            queryParams.set('populate[results_final][fields][8]', 'final_points')
            queryParams.set('populate[results_final][fields][9]', 'documentId')
            queryParams.set('populate[results_final][populate][player][fields][0]', 'full_name')
            queryParams.set('populate[results_final][populate][player][fields][1]', 'documentId')
            queryParams.set('populate[results_final][populate][player][fields][2]', 'full_name_en')
            queryParams.set('populate[results_final][populate][player][fields][3]', 'country')

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
                        const liveStandings = await fetchStageStandings(stageDocumentId, headers)
                        if (!liveStandings && !liveMatches) return stage

                        const baseGroups = asArray(stage.groups)
                        const mergedGroups = liveMatches
                            ? mergeLiveStageMatches(baseGroups, liveMatches)
                            : null

                        return {
                            ...stage,
                            ...(mergedGroups ? { groups: mergedGroups } : {}),
                            ...(liveStandings ? { results: liveStandings } : {}),
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
                        if (playerDocumentId && bestAverage !== null) {
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
                                player1Innings > 0
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
                                player2Innings > 0
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

                const enrichedFinalResults = asArray(event.results_final).map((result) => {
                    const player = asObject(result.player)
                    const playerDocumentId =
                        typeof player?.documentId === 'string' ? player.documentId : null
                    const derivedMatchPoints =
                        playerDocumentId ? (stageMatchPoints.get(playerDocumentId) ?? null) : null
                    const derivedBestGame =
                        isArtisticEvent && playerDocumentId
                            ? (stageBestGame.get(playerDocumentId) ?? null)
                            : null

                    if (derivedMatchPoints === null && derivedBestGame === null) {
                        return result
                    }

                    return {
                        ...result,
                        ...(derivedMatchPoints === null ? {} : { match_points: derivedMatchPoints }),
                        ...(derivedBestGame === null ? {} : { best_game: derivedBestGame }),
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
