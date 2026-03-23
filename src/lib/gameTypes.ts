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

const canonicalGameTypeByKey: Record<string, GameType> = {
    threecushion: 'Three-Cushion',
    '3cushion': 'Three-Cushion',
    balkline471: 'Balk-Line-47-1',
    balkline712: 'Balk-Line-71-2',
    onecushion: 'One-Cushion',
    balkline472: 'Balk-Line-47-2',
    libre: 'Libre',
}

const toGameTypeKey = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .replace(/[_\s-]+/g, '')

export function normalizeGameType(value: unknown): GameType | null {
    if (typeof value !== 'string') return null
    const key = toGameTypeKey(value)
    if (!key) return null
    return canonicalGameTypeByKey[key] || null
}

export function normalizeGameTypeOrFallback(value: unknown): string | null {
    const normalized = normalizeGameType(value)
    if (normalized) return normalized
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed || null
}

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
