'use client'

import { useMemo, useState } from 'react'

export type BracketMatchView = {
    id: string
    player1: string
    player2: string
    player1Country?: string | null
    player2Country?: string | null
    score1: number | null
    score2: number | null
    innings1?: number | null
    innings2?: number | null
    highRun1?: number | null
    highRun2?: number | null
    matchPoints1?: number | null
    matchPoints2?: number | null
    tieBreak1?: number | null
    tieBreak2?: number | null
    date?: string | null
    nextMatchId?: string
    byeTop?: boolean
    byeBottom?: boolean
    ffTop?: boolean
    ffBottom?: boolean
    winner1?: boolean
    winner2?: boolean
    seedTop?: number | null
    seedBottom?: number | null
    globalMatchNumber?: number | null
    winnerToGlobalMatchNumber?: number | null
}

export type BracketRoundView = {
    label: string
    matches: BracketMatchView[]
}

const buildIncomingMatchNumbersByTargetId = (rounds: BracketRoundView[]) => {
    const incoming = new Map<string, number[]>()
    rounds.forEach((round, roundIdx) => {
        round.matches.forEach((match, matchIdx) => {
            const nextRound = rounds[roundIdx + 1]
            const targetId =
                match.nextMatchId || nextRound?.matches[Math.floor(matchIdx / 2)]?.id
            if (!targetId || typeof match.globalMatchNumber !== 'number') return
            const targetIncoming = incoming.get(targetId) ?? []
            targetIncoming.push(match.globalMatchNumber)
            incoming.set(targetId, targetIncoming)
        })
    })
    return incoming
}

const MATCH_HEIGHT = 92
const MATCH_META_HEIGHT = 16
const MATCH_GAP = 16
const COLUMN_WIDTH = 264
const COLUMN_GAP = 32
const TOP_OFFSET = 48
const BLOCK_HEIGHT = MATCH_HEIGHT + MATCH_GAP
const LEFT_GUTTER = 36

const resolveRoundLabel = (label: string): string => {
    const key = label.trim().toUpperCase()
    const dict: Record<string, string> = {
        R32: 'R32',
        R16: 'R16',
        QF: 'Quarter Finals',
        SF: 'Semi Finals',
        F: 'Final',
        FINAL: 'Final',
    }
    return dict[key] ?? label
}

const abbreviateName = (name: string): string => {
    if (!name) return ''
    const parts = name.split(' ').filter(Boolean)
    if (parts.length === 0) return name
    if (parts.length === 1) {
        return parts[0].length > 14 ? `${parts[0].slice(0, 12)}...` : parts[0]
    }
    const surname = parts[0].length > 14 ? `${parts[0].slice(0, 12)}...` : parts[0]
    const given = parts[1].length > 3 ? `${parts[1].slice(0, 3)}.` : parts[1]
    return `${surname} ${given}`
}

const formatDateTime = (iso?: string | null): string => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

const getFirstRoundSeeds = (matchCount: number): number[] => {
    const size = matchCount * 2
    const seedingPatterns: Record<number, number[]> = {
        2: [1, 2],
        4: [1, 4, 2, 3],
        8: [1, 8, 4, 5, 2, 7, 3, 6],
        16: [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15],
        32: [1, 32, 16, 17, 8, 25, 9, 24, 5, 28, 12, 21, 4, 29, 13, 20, 6, 27, 11, 22, 3, 30, 14, 19, 7, 26, 10, 23, 15, 18, 2, 31],
        64: [1, 64, 32, 33, 16, 49, 17, 48, 8, 57, 25, 40, 9, 56, 24, 41, 4, 61, 29, 36, 13, 52, 20, 45, 5, 60, 28, 37, 12, 53, 21, 44, 2, 63, 31, 34, 15, 50, 18, 47, 7, 58, 26, 39, 10, 55, 23, 42, 3, 62, 30, 35, 14, 51, 19, 46, 6, 59, 27, 38, 11, 54, 22, 43],
    }
    return seedingPatterns[size] || []
}

export default function SingleElimBracket({
    rounds,
    onMatchClick,
}: {
    rounds: BracketRoundView[]
    onMatchClick?: (matchId: string) => void
}) {
    const baseScale = rounds.length >= 4 ? 0.75 : 1
    const [scale, setScale] = useState(baseScale)
    const firstRoundSeeds = useMemo(
        () => getFirstRoundSeeds(rounds[0]?.matches.length || 0),
        [rounds],
    )

    const getMatchTop = (roundIndex: number, matchIndex: number) => {
        const spacing = Math.pow(2, roundIndex)
        const offset = ((spacing - 1) * BLOCK_HEIGHT) / 2
        return TOP_OFFSET + matchIndex * spacing * BLOCK_HEIGHT + offset
    }

    const totalHeight = useMemo(() => {
        const firstCount = rounds[0]?.matches.length || 0
        return (
            (firstCount - 1) * BLOCK_HEIGHT +
            MATCH_HEIGHT +
            MATCH_META_HEIGHT +
            TOP_OFFSET
        )
    }, [rounds])

    const totalWidth = useMemo(
        () =>
            LEFT_GUTTER +
            rounds.length * COLUMN_WIDTH +
            Math.max(0, rounds.length - 1) * COLUMN_GAP +
            40,
        [rounds.length],
    )
    const scaledWidth = totalWidth * scale
    const scaledHeight = totalHeight * scale

    const layouts = useMemo(() => {
        const map = new Map<string, { left: number; top: number }>()
        rounds.forEach((round, roundIdx) => {
            const left = LEFT_GUTTER + roundIdx * (COLUMN_WIDTH + COLUMN_GAP)
            round.matches.forEach((m, idx) => {
                map.set(m.id, { left, top: getMatchTop(roundIdx, idx) })
            })
        })
        return map
    }, [rounds])

    const incomingMatchNumbersByTargetId = useMemo(
        () => buildIncomingMatchNumbersByTargetId(rounds),
        [rounds],
    )

    const connectors = useMemo(() => {
        const items: Array<{ id: string; path: string }> = []
        rounds.forEach((round, rIdx) => {
            round.matches.forEach((m, idx) => {
                const nextRound = rounds[rIdx + 1]
                if (!nextRound) return
                const targetId = m.nextMatchId || nextRound.matches[Math.floor(idx / 2)]?.id
                if (!targetId) return
                const a = layouts.get(m.id)
                const b = layouts.get(targetId)
                if (!a || !b) return
                const xStart = a.left + COLUMN_WIDTH
                const xEnd = b.left
                const xMid = (xStart + xEnd) / 2
                const yStart = a.top + MATCH_HEIGHT / 2
                const yEnd = b.top + MATCH_HEIGHT / 2
                items.push({
                    id: `${m.id}->${targetId}`,
                    path: `M ${xStart} ${yStart} H ${xMid} V ${yEnd} H ${xEnd}`,
                })
            })
        })
        return items
    }, [rounds, layouts])

    const resolvePlaceholder = (
        matchId: string,
        roundIndex: number,
        matchIndex: number,
        slot: 1 | 2,
        seedValue?: number | null,
        globalMatchNumber?: number | null,
        ): string => {
        if (typeof seedValue === 'number' && roundIndex === 0) {
            return `QUAL ${seedValue}`
        }
        if (roundIndex === 0) return ''
        const incomingMatchNumbers = incomingMatchNumbersByTargetId.get(matchId) ?? []
        const linkedMatchNumber = incomingMatchNumbers[slot === 1 ? 0 : 1]
        if (typeof linkedMatchNumber === 'number') {
            return `Winner from Match ${linkedMatchNumber}`
        }
        const currentRoundMatchCount = Math.max(
            1,
            Math.floor((rounds[0]?.matches.length || 1) / Math.pow(2, roundIndex)),
        )
        const previousRoundFirstGlobalMatch =
            typeof globalMatchNumber === 'number'
                ? globalMatchNumber - currentRoundMatchCount * 2
                : matchIndex * 2 + 1
        const previousMatchOffset = matchIndex * 2 + (slot === 1 ? 0 : 1)
        return `Winner from Match ${previousRoundFirstGlobalMatch + previousMatchOffset}`
    }

    return (
        <div className="overflow-x-auto overflow-y-hidden">
            <div className="mb-3 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={() =>
                        setScale((current) =>
                            Math.max(0.55, Number((current - 0.1).toFixed(2))),
                        )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    aria-label="Zoom out bracket"
                >
                    -
                </button>
                <div className="min-w-14 text-center text-xs font-medium text-gray-500">
                    {Math.round(scale * 100)}%
                </div>
                <button
                    type="button"
                    onClick={() =>
                        setScale((current) =>
                            Math.min(1.4, Number((current + 0.1).toFixed(2))),
                        )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    aria-label="Zoom in bracket"
                >
                    +
                </button>
            </div>

            <div
                style={{
                    display: 'inline-block',
                    position: 'relative',
                    width: scaledWidth,
                    minWidth: scaledWidth,
                    height: scaledHeight,
                    minHeight: scaledHeight,
                }}
            >
                <div
                    style={{
                        display: 'inline-block',
                        position: 'relative',
                        width: totalWidth,
                        height: totalHeight,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                    }}
                >
                    <svg
                        width={totalWidth}
                        height={totalHeight}
                        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}
                    >
                        {connectors.map((c) => (
                            <path
                                key={c.id}
                                d={c.path}
                                stroke="#D1D5DB"
                                strokeWidth={1.25}
                                strokeOpacity={0.9}
                                fill="none"
                                strokeLinecap="round"
                            />
                        ))}
                    </svg>

                    {rounds.map((round, roundIdx) => {
                        const left = LEFT_GUTTER + roundIdx * (COLUMN_WIDTH + COLUMN_GAP)
                        return (
                            <div
                                key={`lbl-${round.label}-${roundIdx}`}
                                style={{
                                    position: 'absolute',
                                    top: 8,
                                    left,
                                    width: COLUMN_WIDTH,
                                    height: TOP_OFFSET - 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#0E2666',
                                    color: '#FFFFFF',
                                    borderRadius: 4,
                                    fontWeight: 600,
                                    fontSize: 14,
                                }}
                            >
                                {resolveRoundLabel(round.label)}
                            </div>
                        )
                    })}

                    {rounds.map((round, roundIdx) =>
                        round.matches.map((m) => {
                            const layout = layouts.get(m.id)
                            if (!layout) return null
                            const s1 = typeof m.score1 === 'number' ? m.score1 : null
                            const s2 = typeof m.score2 === 'number' ? m.score2 : null
                            const hasBoth = s1 !== null && s2 !== null
                            const winnerTop = Boolean(m.winner1 ?? (hasBoth && s1 > s2))
                            const winnerBottom = Boolean(m.winner2 ?? (hasBoth && s2 > s1))
                            const roundMatchIndex = round.matches.findIndex((candidate) => candidate.id === m.id)
                            const isFirstRound = roundIdx === 0
                            const stdSeedTop = isFirstRound ? firstRoundSeeds[roundMatchIndex * 2] : undefined
                            const stdSeedBottom = isFirstRound ? firstRoundSeeds[roundMatchIndex * 2 + 1] : undefined
                            const topPlaceholder = resolvePlaceholder(
                                m.id,
                                roundIdx,
                                roundMatchIndex,
                                1,
                                m.seedTop ?? stdSeedTop ?? null,
                                m.globalMatchNumber,
                            )
                            const bottomPlaceholder = resolvePlaceholder(
                                m.id,
                                roundIdx,
                                roundMatchIndex,
                                2,
                                m.seedBottom ?? stdSeedBottom ?? null,
                                m.globalMatchNumber,
                            )

                            return (
                                <div
                                    key={`${round.label}-${m.id}`}
                                    style={{
                                        position: 'absolute',
                                        left: layout.left,
                                        top: layout.top,
                                        zIndex: 1,
                                        width: COLUMN_WIDTH,
                                        height: MATCH_HEIGHT,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => onMatchClick?.(m.id)}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: 12,
                                            border: '1px solid #D1D5DB',
                                            backgroundColor: '#FFFFFF',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 0 0 1px rgba(14,38,102,0.10)',
                                            padding: 8,
                                            textAlign: 'left',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            cursor: onMatchClick ? 'pointer' : 'default',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: 4 }}>
                                            <span
                                                title={m.player1 || (m.byeTop ? 'BYE' : topPlaceholder)}
                                                style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    color: winnerTop ? '#059669' : m.player1 ? '#111827' : '#6B7280',
                                                }}
                                            >
                                                {m.player1 ? abbreviateName(m.player1) : m.byeTop ? 'BYE' : topPlaceholder}
                                            </span>
                                            <span>
                                                {m.ffTop ? 'F.F.' : s1 ?? ''}
                                                {typeof m.innings1 === 'number' ? ` | ${m.innings1}` : ''}
                                                {typeof m.tieBreak1 === 'number' ? ` | ${m.tieBreak1}` : ''}
                                            </span>
                                        </div>

                                        {m.date ? (
                                            <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 11, marginBottom: 4 }}>
                                                {formatDateTime(m.date)}
                                            </div>
                                        ) : (
                                            <div style={{ height: 15 }} />
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                            <span
                                                title={m.player2 || (m.byeBottom ? 'BYE' : bottomPlaceholder)}
                                                style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    color: winnerBottom ? '#059669' : m.player2 ? '#111827' : '#6B7280',
                                                }}
                                            >
                                                {m.player2 ? abbreviateName(m.player2) : m.byeBottom ? 'BYE' : bottomPlaceholder}
                                            </span>
                                            <span>
                                                {m.ffBottom ? 'F.F.' : s2 ?? ''}
                                                {typeof m.innings2 === 'number' ? ` | ${m.innings2}` : ''}
                                                {typeof m.tieBreak2 === 'number' ? ` | ${m.tieBreak2}` : ''}
                                            </span>
                                        </div>
                                    </button>
                                    {typeof m.globalMatchNumber === 'number' || typeof m.winnerToGlobalMatchNumber === 'number' ? (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: 2,
                                                top: MATCH_HEIGHT + 2,
                                                width: COLUMN_WIDTH - 4,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8,
                                                fontSize: 10,
                                                lineHeight: '12px',
                                                color: '#6B7280',
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            <span style={{ whiteSpace: 'nowrap' }}>
                                                {typeof m.globalMatchNumber === 'number' ? `Match ${m.globalMatchNumber}` : ''}
                                            </span>
                                            <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                                                {typeof m.winnerToGlobalMatchNumber === 'number' ? `Winner to ${m.winnerToGlobalMatchNumber}` : ''}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                            )
                        }),
                    )}
                </div>
            </div>
        </div>
    )
}
