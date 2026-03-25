import { countryList } from '@/constants/countries.constant'

// Common country name variations and aliases
const countryAliases: Record<string, string> = {
    usa: 'US',
    'united states of america': 'US',
    uk: 'GB',
    'united kingdom': 'GB',
    england: 'GB',
    'great britain': 'GB',
    'south korea': 'KR',
    'north korea': 'KP',
    russia: 'RU',
    'russian federation': 'RU',
    china: 'CN',
    "peoples republic of china": 'CN',
    taiwan: 'TW',
    'republic of china': 'TW',
    vietnam: 'VN',
    'viet nam': 'VN',
    'czech republic': 'CZ',
    czechia: 'CZ',
    holland: 'NL',
    'the netherlands': 'NL',
    turkey: 'TR',
    turkiye: 'TR',
    türkiye: 'TR',
    greece: 'GR',
    hellas: 'GR',
    'ελλάδα': 'GR',
    egypt: 'EG',
    belgium:'BE'
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const regionNames =
    typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
        ? new Intl.DisplayNames(['en'], { type: 'region' })
        : null

export function getCountryCode(countryName: string | null): string | null {
    if (!countryName) return null

    const normalized = countryName.trim().toLowerCase()

    if (normalized.length === 2) {
        return normalized.toUpperCase()
    }

    if (countryAliases[normalized]) {
        return countryAliases[normalized]
    }

    const country = countryList.find(
        (c) => c.label.toLowerCase() === normalized,
    )

    return country?.value || null
}

export function getCountryLabel(countryName: string | null): string | null {
    if (!countryName) return null

    const trimmed = countryName.trim()
    if (!trimmed) return null

    const code = getCountryCode(trimmed)
    if (!code) return trimmed

    const displayName = regionNames?.of(code)
    if (displayName) return displayName

    const country = countryList.find((c) => c.value === code)
    return country?.label || trimmed
}

export function getCountryFlagPath(countryName: string | null): string | null {
    if (!countryName) return null

    if (countryName.length === 2) {
        return `${basePath}/img/countries/${countryName.toUpperCase()}.png`
    }

    const code = getCountryCode(countryName)
    if (!code) return null

    return `${basePath}/img/countries/${code}.png`
}

export function getCountryFlagCdnUrl(
    countryName: string | null,
    size: 40 | 80 | 160 = 40,
): string | null {
    const code = getCountryCode(countryName)
    if (!code) return null
    return `https://flagcdn.com/w${size}/${code.toLowerCase()}.png`
}
