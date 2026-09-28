import Link from 'next/link'
import type { GroupStanding } from './types'
import { formatNumberValue, formatAverage, formatRecord, formatTruncatedNumber } from './utils'
import { getCountryFlagCdnUrl } from '@/lib/countryFlags'
import { EntryStageBadge, EntryTierBadge, shouldShowEntryStage } from './EntryBadges'

type GroupStandingsTableProps = {
    standings: GroupStanding[]
    embedded?: boolean
    artistic?: boolean
    showNativeNames?: boolean
    tournamentContextSlug?: string | null
    /** When true, renders entry stage and tier badges in the player name cell */
    showEntryBadges?: boolean
    /** Order of the stage these groups belong to; hides the start-stage badge when it would just repeat this stage */
    currentStageOrder?: number | null
    /** Current stage ranking position per player, keyed by player documentId (or `player:<playerId>`) */
    stageRankByPlayerKey?: Map<string, number> | null
}

export default function GroupStandingsTable({
    standings,
    embedded = false,
    artistic = false,
    showNativeNames = true,
    tournamentContextSlug = null,
    showEntryBadges = false,
    currentStageOrder = null,
    stageRankByPlayerKey = null,
}: GroupStandingsTableProps) {
    if (standings.length === 0) {
        return null
    }

    const stageRankKeyFor = (player: GroupStanding): string | null =>
        player.playerDocumentId ?? (player.playerId !== null ? `player:${player.playerId}` : null)
    const stageRankOf = (player: GroupStanding): number | null => {
        const key = stageRankKeyFor(player)
        return key && stageRankByPlayerKey ? stageRankByPlayerKey.get(key) ?? null : null
    }
    const showStageRankColumn = standings.some((player) => stageRankOf(player) !== null)

    const showBestAverageColumn = standings.some((player) => player.bestAverage !== null)
    const showHighRun2Column = !artistic && standings.some((player) => typeof player.highRun2 === 'number' && player.highRun2 > 0)

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-xs">
                <thead className="bg-emerald-700 text-white">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium w-56">Player</th>
                        <th className="px-2 py-2 text-center font-medium w-12" title="Position in the group">Pos</th>
                        {showStageRankColumn && (
                            <th className="px-2 py-2 text-center font-medium w-12" title="Current ranking position in the stage">Rank</th>
                        )}
                        <th className="px-2 py-2 text-center font-medium w-14" title="Matches won / lost">Rec</th>
                        <th className="px-2 py-2 text-center font-medium w-14" title="Match points">MP</th>
                        <th className="px-2 py-2 text-center font-medium w-14" title="Points (caroms)">Pts</th>
                        <th className="px-2 py-2 text-center font-medium w-14" title={artistic ? 'Possible points' : 'Innings'}>{artistic ? 'Poss. pts' : 'Inn'}</th>
                        <th className="px-2 py-2 text-center font-medium w-14" title={artistic ? 'Percentage' : 'General average'}>{artistic ? '%' : 'Avg'}</th>
                        <th className="px-2 py-2 text-center font-medium w-14" title="High run">{artistic ? 'Best run' : 'HR'}</th>
                        {showBestAverageColumn && (
                            <th className="px-2 py-2 text-center font-medium w-14" title="Best average">{artistic ? 'Best game' : 'Best Avg'}</th>
                        )}
                        {showHighRun2Column && <th className="px-2 py-2 text-center font-medium w-14" title="Second-best high run">HR2</th>}
                    </tr>
                </thead>
                <tbody>
                    {standings.map((player) => {
                        const flagSrc = getCountryFlagCdnUrl(player.playerCountry ?? null, 40)
                        const showNativeName =
                            showNativeNames &&
                            player.playerNativeName &&
                            player.playerNativeName.trim() !== player.playerName.trim()

                        const playerCell = (
                            <div className="flex items-center gap-2 leading-tight">
                                {flagSrc ? (
                                    <img
                                        src={flagSrc}
                                        alt={player.playerCountry || 'flag'}
                                        className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : null}
                                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                                    <div className="flex min-w-0 items-center justify-between gap-2">
                                        <span className="truncate">{player.playerName || '-'}</span>
                                        {(() => {
                                            if (!showEntryBadges) return null
                                            const showStage = shouldShowEntryStage(
                                                player.entryStage ?? null,
                                                currentStageOrder,
                                            )
                                            const showTier = Boolean(player.entryTier)
                                            if (!showStage && !showTier) return null
                                            return (
                                                <span className="ml-auto flex shrink-0 items-center gap-1">
                                                    {showStage && player.entryStage ? (
                                                        <EntryStageBadge stage={player.entryStage} />
                                                    ) : null}
                                                    {showTier && player.entryTier ? (
                                                        <EntryTierBadge tier={player.entryTier} />
                                                    ) : null}
                                                </span>
                                            )
                                        })()}
                                    </div>
                                    {showNativeName ? (
                                        <span className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                                            {player.playerNativeName}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        )

                        const playerHref = `${embedded ? '/embed' : ''}/players/${player.playerId}-${player.playerName.trim().replace(/\s+/g, '-')}${
                            tournamentContextSlug
                                ? `?tournament=${encodeURIComponent(tournamentContextSlug)}`
                                : ''
                        }`

                        return (
                            <tr
                                key={player.key}
                                className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                            >
                                <td className="px-3 py-2 font-medium">
                                    {player.playerId ? (
                                        <Link
                                            href={playerHref}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                        >
                                            {playerCell}
                                        </Link>
                                    ) : (
                                        playerCell
                                    )}
                                </td>
                                <td className="px-2 py-2 text-center font-semibold">{player.place}</td>
                                {showStageRankColumn && (
                                    <td className="px-2 py-2 text-center">{stageRankOf(player) ?? '-'}</td>
                                )}
                                <td className="px-2 py-2 text-center">{formatRecord(player.record)}</td>
                                <td className="px-2 py-2 text-center">{formatNumberValue(player.totalMatchPoints)}</td>
                                <td className="px-2 py-2 text-center">{formatNumberValue(player.totalPoints)}</td>
                                <td className="px-2 py-2 text-center">{formatNumberValue(player.totalInnings)}</td>
                                <td className="px-2 py-2 text-center">
                                    {formatAverage(player.totalPoints, player.totalInnings)}
                                </td>
                                <td className="px-2 py-2 text-center">{formatNumberValue(player.highRun)}</td>
                                {showBestAverageColumn && (
                                    <td className="px-2 py-2 text-center">
                                        {formatTruncatedNumber(player.bestAverage)}
                                    </td>
                                )}
                                {showHighRun2Column && (
                                    <td className="px-2 py-2 text-center">{formatNumberValue(player.highRun2)}</td>
                                )}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
