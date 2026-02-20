'use client'

import { useMemo } from 'react'

export type BracketMatchView = {
    id: string
    player1: string
    player2: string
    score1: number | null
    score2: number | null
    innings1?: number | null
    innings2?: number | null
    tieBreak1?: number | null
    tieBreak2?: number | null
    date?: string | null
    nextMatchId?: string
    byeTop?: boolean
    byeBottom?: boolean
    ffTop?: boolean
    ffBottom?: boolean
}

export type BracketRoundView = {
    label: string
    matches: BracketMatchView[]
}

const MATCH_HEIGHT = 92
const MATCH_GAP = 16
const COLUMN_WIDTH = 240
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
    if (parts.length === 1) return parts[0].length > 14 ? `${parts[0].slice(0, 12)}...` : parts[0]
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

export default function SingleElimBracket({ rounds }: { rounds: BracketRoundView[] }) {
    const scale = rounds.length >= 4 ? 0.75 : 1

    const getMatchTop = (roundIndex: number, matchIndex: number) => {
        const spacing = Math.pow(2, roundIndex)
        const offset = ((spacing - 1) * BLOCK_HEIGHT) / 2
        return TOP_OFFSET + matchIndex * spacing * BLOCK_HEIGHT + offset
    }

    const totalHeight = useMemo(() => {
        const firstCount = rounds[0]?.matches.length || 0
        return (firstCount - 1) * BLOCK_HEIGHT + MATCH_HEIGHT + TOP_OFFSET
    }, [rounds])

    const totalWidth = useMemo(
        () =>
            LEFT_GUTTER +
            rounds.length * COLUMN_WIDTH +
            Math.max(0, rounds.length - 1) * COLUMN_GAP +
            40,
        [rounds.length],
    )

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

    return (
        <div className="overflow-x-auto overflow-y-hidden">
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
                        const winnerTop = hasBoth && s1 > s2
                        const winnerBottom = hasBoth && s2 > s1

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
                                <div
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
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: 4 }}>
                                        <span
                                            title={m.player1 || (m.byeTop ? 'BYE' : '')}
                                            style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                color: winnerTop ? '#059669' : m.player1 ? '#111827' : '#6B7280',
                                            }}
                                        >
                                            {m.player1 ? abbreviateName(m.player1) : m.byeTop ? 'BYE' : ''}
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
                                            title={m.player2 || (m.byeBottom ? 'BYE' : '')}
                                            style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                color: winnerBottom ? '#059669' : m.player2 ? '#111827' : '#6B7280',
                                            }}
                                        >
                                            {m.player2 ? abbreviateName(m.player2) : m.byeBottom ? 'BYE' : ''}
                                        </span>
                                        <span>
                                            {m.ffBottom ? 'F.F.' : s2 ?? ''}
                                            {typeof m.innings2 === 'number' ? ` | ${m.innings2}` : ''}
                                            {typeof m.tieBreak2 === 'number' ? ` | ${m.tieBreak2}` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    }),
                )}
            </div>
        </div>
    )
}
