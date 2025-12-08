/**
 * Game type utilities and labels
 */

export type GameType =
    | 'Three-Cushion'
    | 'Balk-Line-47-1'
    | 'Balk-Line-71-2'
    | 'One-Cushion'
    | 'Balk-Line-47-2'
    | 'Libre'

export const gameTypeLabels: Record<GameType | 'all', string> = {
    'Three-Cushion': '3 Cushion',
    'Balk-Line-47-1': 'Balk Line 47/1',
    'Balk-Line-71-2': 'Balk Line 71/2',
    'One-Cushion': 'One Cushion',
    'Balk-Line-47-2': 'Balk Line 47/2',
    Libre: 'Libre',
    all: 'All Games',
}

export const gameTypeLabelsEn: Record<GameType | 'all', string> = {
    'Three-Cushion': '3 Cushion',
    'Balk-Line-47-1': 'Balk Line 47/1',
    'Balk-Line-71-2': 'Balk Line 71/2',
    'One-Cushion': 'One Cushion',
    'Balk-Line-47-2': 'Balk Line 47/2',
    Libre: 'Libre',
    all: 'All Games',
}

export function getGameTypeLabel(
    gameType: GameType | 'all',
    lang: 'el' | 'en' = 'el',
): string {
    const labels = lang === 'el' ? gameTypeLabels : gameTypeLabelsEn
    return labels[gameType] || gameType
}

export function getGameTypeOptions(
    includeAll = true,
): Array<{ value: GameType | 'all'; label: string }> {
    const options: Array<{ value: GameType | 'all'; label: string }> = []

    if (includeAll) {
        options.push({ value: 'all', label: gameTypeLabels.all })
    }

    const types: GameType[] = [
        'Three-Cushion',
        'Balk-Line-47-1',
        'Balk-Line-71-2',
        'One-Cushion',
        'Balk-Line-47-2',
        'Libre',
    ]

    types.forEach((type) => {
        options.push({ value: type, label: gameTypeLabels[type] })
    })

    return options
}
