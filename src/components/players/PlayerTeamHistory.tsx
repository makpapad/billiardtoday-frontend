'use client'

import { useEffect, useMemo, useState } from 'react'
import { t } from '@/lib/i18n'

type TeamHistoryMatch = {
    id: string
    date: string
    season: string
    discipline: string
    tournamentTitle: string
    tournamentHref: string
    division: string
    groupKey: string
    groupTitle: string
    round: number
    stage: string
    status: string
    teamName: string
    opponent: string
    isHome: boolean
    points: number
    oppPoints: number
    innings: number
    highRun: number
    boardPoints: number
    oppBoardPoints: number
    result: 'win' | 'draw' | 'loss' | 'pending'
}

type TeamHistoryPayload = {
    player: { id: number; documentId: string; name: string; nameEn: string }
    filters: {
        disciplines: string[]
        seasons: string[]
        teams: { name: string; seasons: string[] }[]
    }
    summary: {
        matches: number
        wins: number
        draws: number
        losses: number
        winPct: number
        points: number
        innings: number
        avg: number
        bestAvg: number
        highRun: number
    }
    matches: TeamHistoryMatch[]
}

const DISCIPLINE_LABELS: Record<string, string> = {
    '3C': '3 Cushion',
    '3-BAND': '3 Cushion',
    '5P': '5 Pins',
    '5-PINS': '5 Pins',
    '1C': '1 Cushion',
    ARTISTIC: 'Artistic',
    BALKLINE: 'Balkline',
    FREE_GAME: 'Free Game',
}

const disciplineLabel = (key: string): string =>
    DISCIPLINE_LABELS[key.toUpperCase()] || key

/**
 * Μ.Ο. όπως το ατομικό ιστορικό: κόψιμο (όχι στρογγυλοποίηση) σε 3 δεκαδικά,
 * με κόμμα — ίδια συμπεριφορά με το `formatSafeDecimal` της σελίδας.
 */
const formatAvg = (value: number): string => {
    if (!Number.isFinite(value)) return '0,000'
    const truncated = Math.floor(value * 1000) / 1000
    return truncated.toFixed(3).replace('.', ',')
}

const formatDate = (iso: string): string => {
    if (!iso) return ''
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

const stageLabel = (stage: string): string => {
    switch (stage) {
        case 'league':
            return t('players.profile.teamHistory.stage.league')
        case 'group':
            return t('players.profile.teamHistory.stage.group')
        case 'playoff':
            return t('players.profile.teamHistory.stage.playoff')
        case 'finals':
            return t('players.profile.teamHistory.stage.finals')
        case 'ko':
            return t('players.profile.teamHistory.stage.ko')
        default:
            return ''
    }
}

/** Χρώματα γραμμής αγώνα — ίδια με το ατομικό ιστορικό. */
const rowTone = (result: TeamHistoryMatch['result']): string => {
    if (result === 'win') {
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
    }
    if (result === 'draw') {
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
    }
    if (result === 'pending') {
        return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }
    return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
}

const badgeTone = (result: TeamHistoryMatch['result']): string => {
    if (result === 'win') return 'bg-green-600 text-white'
    if (result === 'draw') return 'bg-yellow-600 text-white'
    if (result === 'pending') return 'bg-gray-500 text-white'
    return 'bg-red-600 text-white'
}

const badgeLabel = (result: TeamHistoryMatch['result']): string => {
    if (result === 'win') return t('players.profile.modal.badge.win')
    if (result === 'draw') return t('players.profile.modal.badge.draw')
    if (result === 'loss') return t('players.profile.modal.badge.loss')
    return t('players.profile.teamHistory.result.pending')
}

const summarize = (rows: TeamHistoryMatch[]) => {
    const played = rows.filter((row) => row.result !== 'pending')
    const points = rows.reduce((sum, row) => sum + row.points, 0)
    const innings = rows.reduce((sum, row) => sum + row.innings, 0)
    return {
        matches: rows.length,
        wins: played.filter((row) => row.result === 'win').length,
        losses: played.filter((row) => row.result === 'loss').length,
        draws: played.filter((row) => row.result === 'draw').length,
        points,
        innings,
        avg: innings > 0 ? points / innings : 0,
        highRun: rows.reduce(
            (best, row) => (row.highRun > best ? row.highRun : best),
            0,
        ),
    }
}

export default function PlayerTeamHistory({ playerId }: { playerId: string }) {
    const [payload, setPayload] = useState<TeamHistoryPayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedDiscipline, setSelectedDiscipline] = useState('all')
    const [selectedSeason, setSelectedSeason] = useState('all')
    const [selectedTeam, setSelectedTeam] = useState('all')

    useEffect(() => {
        let cancelled = false
        setIsLoading(true)
        setError(null)

        fetch(`/api/players/${playerId}/team-history`)
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => null)
                    throw new Error(
                        (body && (body.error as string)) ||
                            t('players.profile.teamHistory.error'),
                    )
                }
                return (await res.json()) as TeamHistoryPayload
            })
            .then((data) => {
                if (!cancelled) setPayload(data)
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message)
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [playerId])

    const matches = useMemo(() => payload?.matches || [], [payload])

    const visibleMatches = useMemo(
        () =>
            matches.filter(
                (row) =>
                    (selectedDiscipline === 'all' ||
                        row.discipline === selectedDiscipline) &&
                    (selectedSeason === 'all' ||
                        row.season === selectedSeason) &&
                    (selectedTeam === 'all' || row.teamName === selectedTeam),
            ),
        [matches, selectedDiscipline, selectedSeason, selectedTeam],
    )

    /** Ίδια ομαδοποίηση με το ατομικό: χρονιά → διοργάνωση → αγώνες. */
    const seasons = useMemo(() => {
        const bySeason = new Map<
            string,
            Map<
                string,
                { title: string; href: string; rows: TeamHistoryMatch[] }
            >
        >()

        for (const row of visibleMatches) {
            const seasonKey = row.season || '—'
            const tournamentKey = `${row.tournamentTitle}|${row.groupKey}`
            if (!bySeason.has(seasonKey)) bySeason.set(seasonKey, new Map())
            const tournaments = bySeason.get(seasonKey)!
            if (!tournaments.has(tournamentKey)) {
                tournaments.set(tournamentKey, {
                    title: row.tournamentTitle,
                    href: row.tournamentHref,
                    rows: [],
                })
            }
            tournaments.get(tournamentKey)!.rows.push(row)
        }

        return Array.from(bySeason.entries()).map(([season, tournaments]) => ({
            season,
            tournaments: Array.from(tournaments.values()),
        }))
    }, [visibleMatches])

    const selectClass =
        'px-4 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 py-10 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                {t('players.profile.teamHistory.loading')}
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200">
                {error}
            </div>
        )
    }

    if (matches.length === 0) {
        return (
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                {t('players.profile.teamHistory.empty')}
            </div>
        )
    }

    return (
        <div>
            {/* Φίλτρα: discipline · season (χρονιά) · team */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <select
                    value={selectedDiscipline}
                    onChange={(e) => setSelectedDiscipline(e.target.value)}
                    className={selectClass}
                    aria-label={t(
                        'players.profile.teamHistory.filter.discipline',
                    )}
                >
                    <option value="all">
                        {t('players.profile.teamHistory.filter.discipline.all')}
                    </option>
                    {(payload?.filters.disciplines || []).map((key) => (
                        <option key={key} value={key}>
                            {disciplineLabel(key)}
                        </option>
                    ))}
                </select>

                <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className={selectClass}
                    aria-label={t('players.profile.teamHistory.filter.season')}
                >
                    <option value="all">
                        {t('players.profile.teamHistory.filter.season.all')}
                    </option>
                    {(payload?.filters.seasons || []).map((season) => (
                        <option key={season} value={season}>
                            {season}
                        </option>
                    ))}
                </select>

                <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className={selectClass}
                    aria-label={t('players.profile.teamHistory.filter.team')}
                >
                    <option value="all">
                        {t('players.profile.teamHistory.filter.team.all')}
                    </option>
                    {(payload?.filters.teams || []).map((team) => (
                        <option key={team.name} value={team.name}>
                            {team.seasons.length > 0
                                ? `${team.name} (${team.seasons.join(', ')})`
                                : team.name}
                        </option>
                    ))}
                </select>
            </div>

            {visibleMatches.length === 0 ? (
                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                    {t('players.profile.teamHistory.emptyFiltered')}
                </div>
            ) : (
                <div className="space-y-8">
                    {seasons.map((seasonBlock) => (
                        <div key={seasonBlock.season}>
                            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                                {t(
                                    'players.profile.teamHistory.season',
                                ).replace('{season}', seasonBlock.season)}
                            </h3>

                            <div className="space-y-6">
                                {seasonBlock.tournaments.map((tournament) => {
                                    const stats = summarize(tournament.rows)
                                    return (
                                        <div
                                            key={`${seasonBlock.season}-${tournament.title}-${tournament.rows[0]?.groupKey || ''}`}
                                            className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                                        >
                                            {/* Κεφαλίδα διοργάνωσης — ίδιο σχήμα με το ατομικό */}
                                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h3 className="text-2xl font-bold flex items-center gap-2">
                                                            <a
                                                                href={
                                                                    tournament.href ||
                                                                    undefined
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 hover:text-blue-100 transition-colors"
                                                            >
                                                                <span>
                                                                    {
                                                                        tournament.title
                                                                    }
                                                                </span>
                                                                <svg
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    className="h-5 w-5"
                                                                    aria-hidden="true"
                                                                >
                                                                    <path d="M14 3h7v7" />
                                                                    <path d="M10 14L21 3" />
                                                                    <path d="M21 14v7h-7" />
                                                                    <path d="M3 10V3h7" />
                                                                    <path d="M3 21h7" />
                                                                    <path d="M3 14v7" />
                                                                </svg>
                                                            </a>
                                                        </h3>
                                                        <p className="text-blue-100">
                                                            {[
                                                                seasonBlock.season,
                                                                disciplineLabel(
                                                                    tournament
                                                                        .rows[0]
                                                                        ?.discipline ||
                                                                        '',
                                                                ),
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-3xl font-bold">
                                                            {stats.matches}
                                                        </div>
                                                        <div className="text-sm text-blue-100">
                                                            {t(
                                                                'players.profile.teamHistory.games',
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center bg-white/10 rounded-lg p-4">
                                                    <div>
                                                        <div className="text-2xl font-bold">
                                                            {stats.matches}
                                                        </div>
                                                        <div className="text-xs text-blue-100">
                                                            {t(
                                                                'players.profile.stats.matches',
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-green-300">
                                                            {stats.wins}
                                                        </div>
                                                        <div className="text-xs text-blue-100">
                                                            {t(
                                                                'players.profile.stats.wins',
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-red-300">
                                                            {stats.losses}
                                                        </div>
                                                        <div className="text-xs text-blue-100">
                                                            {t(
                                                                'players.profile.stats.losses',
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-yellow-300">
                                                            {formatAvg(
                                                                stats.avg,
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-blue-100">
                                                            {t(
                                                                'players.profile.stats.avg',
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-bold text-orange-300">
                                                            {stats.highRun}
                                                        </div>
                                                        <div className="text-xs text-blue-100">
                                                            {t(
                                                                'players.profile.stats.highRunShort',
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Αγώνες — ίδιες γραμμές με το ατομικό */}
                                            <div className="p-6 bg-white dark:bg-gray-800">
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                                    {t(
                                                        'players.profile.history.tournament.detailsTitle',
                                                    ).replace(
                                                        '{count}',
                                                        String(stats.matches),
                                                    )}
                                                </h4>
                                                <div className="space-y-3">
                                                    {tournament.rows.map(
                                                        (row) => {
                                                            const roundLabel =
                                                                row.round > 0
                                                                    ? t(
                                                                          'players.profile.teamHistory.round',
                                                                      ).replace(
                                                                          '{round}',
                                                                          String(
                                                                              row.round,
                                                                          ),
                                                                      )
                                                                    : stageLabel(
                                                                          row.stage,
                                                                      )
                                                            const meta = [
                                                                row.groupTitle,
                                                                roundLabel,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')
                                                            return (
                                                                <div
                                                                    key={row.id}
                                                                    className={`border-2 rounded-lg p-4 transition-all ${rowTone(row.result)}`}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-3 mb-2">
                                                                                <span
                                                                                    className={`text-xs font-bold px-2 py-1 rounded ${badgeTone(row.result)}`}
                                                                                >
                                                                                    {badgeLabel(
                                                                                        row.result,
                                                                                    )}
                                                                                </span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                                    {
                                                                                        meta
                                                                                    }
                                                                                </span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                                    {formatDate(
                                                                                        row.date,
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-base font-semibold">
                                                                                vs{' '}
                                                                                <span className="text-gray-900 dark:text-white">
                                                                                    {row.opponent ||
                                                                                        '–'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div
                                                                                className={`text-2xl font-bold ${
                                                                                    row.result ===
                                                                                    'draw'
                                                                                        ? 'text-yellow-600 dark:text-yellow-400'
                                                                                        : 'text-gray-900 dark:text-white'
                                                                                }`}
                                                                            >
                                                                                {
                                                                                    row.points
                                                                                }{' '}
                                                                                -{' '}
                                                                                {
                                                                                    row.oppPoints
                                                                                }
                                                                            </div>
                                                                            <div className="text-xs text-gray-500 dark:text-gray-400 space-x-2 mt-1">
                                                                                <span>{`Innings: ${row.innings}`}</span>
                                                                                <span>
                                                                                    {`AVG: ${
                                                                                        row.innings >
                                                                                        0
                                                                                            ? formatAvg(
                                                                                                  row.points /
                                                                                                      row.innings,
                                                                                              )
                                                                                            : '0,000'
                                                                                    }`}
                                                                                </span>
                                                                                <span>{`H.R.: ${row.highRun}`}</span>
                                                                            </div>
                                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                                {[
                                                                                    row.teamName,
                                                                                    row.groupTitle,
                                                                                ]
                                                                                    .filter(
                                                                                        Boolean,
                                                                                    )
                                                                                    .join(
                                                                                        ' • ',
                                                                                    )}
                                                                            </div>
                                                                            {tournament.href ? (
                                                                                <div className="mt-1 flex justify-end">
                                                                                    <a
                                                                                        href={
                                                                                            tournament.href
                                                                                        }
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                                                                                    >
                                                                                        {t(
                                                                                            'players.profile.teamHistory.openTournament',
                                                                                        )}
                                                                                    </a>
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
