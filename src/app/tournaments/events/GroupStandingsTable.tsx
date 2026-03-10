import Link from 'next/link'
import type { GroupStanding } from './types'
import { formatNumberValue, formatAverage, formatRecord } from './utils'

type GroupStandingsTableProps = {
    standings: GroupStanding[]
    embedded?: boolean
}

export default function GroupStandingsTable({ standings, embedded = false }: GroupStandingsTableProps) {
    if (standings.length === 0) {
        return null
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-xs">
                <thead className="bg-emerald-700 text-white">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium w-44">Player</th>
                        <th className="px-2 py-2 text-center font-medium w-14">Position</th>
                        <th className="px-2 py-2 text-center font-medium w-20">Record</th>
                        <th className="px-2 py-2 text-center font-medium w-16">Points</th>
                        <th className="px-2 py-2 text-center font-medium w-16">Innings</th>
                        <th className="px-2 py-2 text-center font-medium w-16">Average</th>
                        <th className="px-2 py-2 text-center font-medium w-16">High Run</th>
                        <th className="px-2 py-2 text-center font-medium w-16">High Run 2</th>
                        <th className="px-2 py-2 text-center font-medium w-16">Match Points</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((player) => (
                        <tr
                            key={player.key}
                            className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        >
                            <td className="px-3 py-2 font-medium truncate">
                                {player.playerId ? (
                                    <Link
                                        href={`${embedded ? '/embed' : ''}/players/${player.playerId}-${player.playerName.trim().replace(/\s+/g, '-')}`}
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                    >
                                        <div className="flex flex-col leading-tight">
                                            <span>{player.playerName || '-'}</span>
                                            {player.playerNativeName &&
                                                player.playerNativeName.trim() !== player.playerName.trim() && (
                                                    <span className="text-[10px] text-gray-200/80">
                                                        {player.playerNativeName}
                                                    </span>
                                                )}
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="flex flex-col leading-tight">
                                        <span>{player.playerName || '-'}</span>
                                        {player.playerNativeName &&
                                            player.playerNativeName.trim() !== player.playerName.trim() && (
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                    {player.playerNativeName}
                                                </span>
                                            )}
                                    </div>
                                )}
                            </td>
                            <td className="px-2 py-2 text-center font-semibold">{player.place}</td>
                            <td className="px-2 py-2 text-center">{formatRecord(player.record)}</td>
                            <td className="px-2 py-2 text-center">{formatNumberValue(player.totalPoints)}</td>
                            <td className="px-2 py-2 text-center">{formatNumberValue(player.totalInnings)}</td>
                            <td className="px-2 py-2 text-center">
                                {formatAverage(player.totalPoints, player.totalInnings)}
                            </td>
                            <td className="px-2 py-2 text-center">{formatNumberValue(player.highRun)}</td>
                            <td className="px-2 py-2 text-center">{formatNumberValue(player.highRun2)}</td>
                            <td className="px-2 py-2 text-center">{formatNumberValue(player.totalMatchPoints)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
