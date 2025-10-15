import type {
    StrapiEventStage,
    StrapiGroup,
    StrapiResult,
    NormalizedEventStage,
    NormalizedGroupMatch,
    NormalizedGroupPlayer,
    NormalizedStageResult,
    StageMatchGroup,
    PlayerRecord,
    GroupStanding,
} from './types'

export const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value
    if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isNaN(parsed) ? null : parsed
    }
    return null
}

export const toRelationArray = (value: unknown): unknown[] => {
    if (!value) return []
    if (Array.isArray(value)) return value
    if (typeof value === 'object' && value !== null && Array.isArray((value as { data?: unknown[] }).data)) {
        return (value as { data?: unknown[] }).data ?? []
    }
    return []
}

export const normalizeEntity = <T extends Record<string, unknown>>(
    entity: unknown,
    fallbackId: string
): T & { id: string; documentId: string } => {
    if (!entity || typeof entity !== 'object') {
        return { id: fallbackId, documentId: fallbackId } as T & { id: string; documentId: string }
    }

    const candidate = entity as Record<string, unknown>
    const attributes =
        typeof candidate.attributes === 'object' && candidate.attributes !== null
            ? (candidate.attributes as Record<string, unknown>)
            : candidate

    const idValue = candidate.documentId ?? attributes.documentId ?? candidate.id ?? attributes.id ?? fallbackId
    const documentId = attributes.documentId ?? candidate.documentId ?? idValue

    return {
        ...attributes,
        id: `${idValue}`,
        documentId: `${documentId}`,
    } as T & { id: string; documentId: string }
}

export const normalizePlayer = (player: unknown, fallbackId: string): { name: string; documentId: string | null } => {
    const source = player && typeof player === 'object' && (player as { data?: unknown }).data
        ? (player as { data?: unknown }).data
        : player

    const normalized = normalizeEntity<{ full_name?: unknown }>(source, fallbackId)
    const name = typeof normalized.full_name === 'string' ? normalized.full_name : ''

    return {
        name,
        documentId: normalized.documentId ?? null,
    }
}

export const normalizeGroup = (group: unknown, fallbackId: string): NormalizedGroupMatch => {
    const normalized = normalizeEntity<StrapiGroup>(group, fallbackId)

    const player1 = normalizePlayer(normalized.player1, `${normalized.id}-p1`)
    const player2 = normalizePlayer(normalized.player2, `${normalized.id}-p2`)

    return {
        id: normalized.id,
        documentId: normalized.documentId,
        number: toNumber(normalized.number),
        dateTime: typeof normalized.date_time === 'string' ? normalized.date_time : null,
        player1: {
            name: player1.name,
            documentId: player1.documentId,
            points: toNumber(normalized.player1_points),
            matchPoints: toNumber(normalized.player1_match_points),
            innings: toNumber(normalized.player1_innings),
            highRun: toNumber(normalized.player1_high_run),
            highRun2: toNumber(normalized.player1_high_run_2),
        },
        player2: {
            name: player2.name,
            documentId: player2.documentId,
            points: toNumber(normalized.player2_points),
            matchPoints: toNumber(normalized.player2_match_points),
            innings: toNumber(normalized.player2_innings),
            highRun: toNumber(normalized.player2_high_run),
            highRun2: toNumber(normalized.player2_high_run_2),
        },
    }
}

export const normalizeResult = (result: unknown, fallbackId: string): NormalizedStageResult => {
    const normalized = normalizeEntity<StrapiResult>(result, fallbackId)
    const player = normalizePlayer(normalized.player, `${normalized.id}-player`)

    return {
        id: normalized.id,
        documentId: normalized.documentId,
        playerName: player.name,
        matchPoints: toNumber(normalized.match_points),
        points: toNumber(normalized.points),
        innings: toNumber(normalized.innings),
        highRun: toNumber(normalized.high_run),
        groupNumber: toNumber(normalized.group_number),
        groupPosition: toNumber(normalized.group_position),
        finalPosition: toNumber(normalized.final_position),
    }
}

export const formatDateValue = (value: string | null): string | null => {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString()
}

export const formatDateRange = (start: string | null, end: string | null): string | null => {
    const startText = formatDateValue(start)
    const endText = formatDateValue(end)
    if (startText && endText) {
        if (startText === endText) return startText
        return `${startText} – ${endText}`
    }
    return startText ?? endText ?? null
}

export const formatDateForTable = (value: string | null): string => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString()
}

export const formatNumberValue = (value: number | null): string => {
    if (value === null || Number.isNaN(value)) return '-'
    return `${value}`
}

export const getMatchOutcome = (
    player: NormalizedGroupPlayer,
    opponent: NormalizedGroupPlayer
): 'W' | 'L' | 'D' | null => {
    if (player.matchPoints === null || opponent.matchPoints === null) return null
    if (player.matchPoints > opponent.matchPoints) return 'W'
    if (player.matchPoints < opponent.matchPoints) return 'L'
    return 'D'
}

export const getMatchRowClass = (outcome: 'W' | 'L' | 'D' | null): string => {
    if (outcome === 'W') return 'bg-emerald-100/80 dark:bg-emerald-900/30'
    if (outcome === 'L') return 'bg-rose-100/80 dark:bg-rose-900/30'
    return 'bg-gray-50 dark:bg-gray-800/50'
}

export const getDateCellClass = (): string => {
    return 'bg-amber-50 dark:bg-amber-900/20'
}

export const compareDateTime = (a: string | null, b: string | null): number => {
    if (!a && !b) return 0
    if (!a) return 1
    if (!b) return -1
    const dateA = new Date(a)
    const dateB = new Date(b)
    if (!Number.isNaN(dateA.getTime()) && !Number.isNaN(dateB.getTime())) {
        return dateA.getTime() - dateB.getTime()
    }
    return a.localeCompare(b)
}

export const buildStageMatchGroups = (groups: NormalizedGroupMatch[]): StageMatchGroup[] => {
    const grouped: Record<string, StageMatchGroup> = {}

    groups.forEach((match, index) => {
        const key = match.number !== null ? `${match.number}` : match.id
        if (!grouped[key]) {
            grouped[key] = {
                key,
                number: match.number ?? null,
                matches: [],
            }
        }

        grouped[key].matches.push({
            key: match.id ?? `${key}-match-${index}`,
            dateTime: match.dateTime,
            top: {
                player: match.player1,
                outcome: getMatchOutcome(match.player1, match.player2),
            },
            bottom: {
                player: match.player2,
                outcome: getMatchOutcome(match.player2, match.player1),
            },
        })
    })

    return Object.values(grouped)
        .map((group) => ({
            ...group,
            matches: group.matches.sort((a, b) => compareDateTime(a.dateTime, b.dateTime)),
        }))
        .sort((a, b) => {
            if (a.number !== null && b.number !== null) return a.number - b.number
            if (a.number !== null) return -1
            if (b.number !== null) return 1
            return a.key.localeCompare(b.key)
        })
}

export const formatAverage = (points: number | null, innings: number | null): string => {
    if (points === null || innings === null || innings === 0) return '-'
    const result = points / innings
    if (!Number.isFinite(result)) return '-'
    return result.toFixed(3)
}

export const formatOutcomeLabel = (outcome: 'W' | 'L' | 'D' | null): string => {
    if (!outcome) return '-'
    if (outcome === 'W') return 'W'
    if (outcome === 'L') return 'L'
    return 'D'
}

export const aggregateRecord = (record: PlayerRecord, outcome: 'W' | 'L' | 'D' | null): PlayerRecord => {
    if (outcome === 'W') return { ...record, wins: record.wins + 1 }
    if (outcome === 'L') return { ...record, losses: record.losses + 1 }
    if (outcome === 'D') return { ...record, draws: record.draws + 1 }
    return record
}

export const buildGroupStandings = (matches: StageMatchGroup['matches']): GroupStanding[] => {
    const players = matches.reduce<Record<string, GroupStanding>>((acc, match) => {
        const applyEntry = (entry: typeof match.top, position: 'top' | 'bottom') => {
            const id = entry.player.documentId ?? `${entry.player.name}-${position}`
            if (!acc[id]) {
                acc[id] = {
                    key: id,
                    playerName: entry.player.name,
                    record: { wins: 0, draws: 0, losses: 0 },
                    totalMatchPoints: 0,
                    totalPoints: 0,
                    totalInnings: 0,
                    average: null,
                    highRun: null,
                    highRun2: null,
                    place: 0,
                }
            }

            const current = acc[id]
            acc[id] = {
                ...current,
                record: aggregateRecord(current.record, entry.outcome),
                totalMatchPoints: current.totalMatchPoints + (entry.player.matchPoints ?? 0),
                totalPoints: current.totalPoints + (entry.player.points ?? 0),
                totalInnings: current.totalInnings + (entry.player.innings ?? 0),
                highRun: Math.max(current.highRun ?? 0, entry.player.highRun ?? 0),
                highRun2: Math.max(current.highRun2 ?? 0, entry.player.highRun2 ?? 0),
            }
        }

        applyEntry(match.top, 'top')
        applyEntry(match.bottom, 'bottom')

        return acc
    }, {})

    const standings = Object.values(players).map((standing) => {
        const averageValue = standing.totalInnings > 0 ? standing.totalPoints / standing.totalInnings : null
        const bestHighRun = standing.highRun
        const bestHighRun2 = standing.highRun2
        return {
            ...standing,
            average: averageValue,
            highRun: bestHighRun,
            highRun2: bestHighRun2,
        }
    })

    standings.sort((a, b) => {
        if (a.totalMatchPoints !== b.totalMatchPoints) return b.totalMatchPoints - a.totalMatchPoints
        const avgA = a.average ?? -1
        const avgB = b.average ?? -1
        if (avgA !== avgB) return avgB - avgA
        const highRunA = a.highRun ?? -1
        const highRunB = b.highRun ?? -1
        if (highRunA !== highRunB) return highRunB - highRunA
        const highRun2A = a.highRun2 ?? -1
        const highRun2B = b.highRun2 ?? -1
        if (highRun2A !== highRun2B) return highRun2B - highRun2A
        return a.playerName.localeCompare(b.playerName)
    })

    return standings.map((standing, index) => ({
        ...standing,
        place: index + 1,
    }))
}

export const formatRecord = (record: PlayerRecord): string => `${record.wins}-${record.draws}-${record.losses}`
