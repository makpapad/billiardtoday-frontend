import type { GroupStanding } from './types'
import { formatNumberValue, formatAverage, formatRecord } from './utils'

type GroupStandingsTableProps = {
    standings: GroupStanding[]
}

export default function GroupStandingsTable({ standings }: GroupStandingsTableProps) {
    if (standings.length === 0) {
        return null
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-xs">
                <thead className="bg-emerald-700 text-white">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium w-44">Παίκτης</th>
                        <th className="px-2 py-2 text-center font-medium w-14">Θέση</th>
                        <th className="px-2 py-2 text-center font-medium w-20">Ρεκόρ</th>
                        <th className="px-2 py-2 text-center font-medium w-16">Πόντοι</th>
                        <th className="px-2 py-2 text-center font-medium w-16">Innings</th>
                        <th className="px-2 py-2 text-center font-medium w-16">Μέσος</th>
                        <th className="px-2 py-2 text-center font-medium w-16">High Run</th>
                        <th className="px-2 py-2 text-center font-medium w-16">High Run 2</th>
                        <th className="px-2 py-2 text-center font-medium w-16">Βαθμοί</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((player) => (
                        <tr
                            key={player.key}
                            className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        >
                            <td className="px-3 py-2 font-medium truncate">{player.playerName || '-'}</td>
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
