import { countryList } from '@/constants/countries.constant'

const AVAILABLE_FLAG_CODES = [
    'AB', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS',
    'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH',
    'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY',
    'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
    'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
    'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'EU', 'FI', 'FJ',
    'FK', 'FM', 'FO', 'FR', 'GA', 'GD', 'GE', 'GG', 'GH', 'GI', 'GL', 'GM',
    'GN', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU',
    'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
    'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY',
    'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
    'MA', 'MC', 'MD', 'ME', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP',
    'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NE',
    'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE',
    'PF', 'PG', 'PH', 'PK', 'PL', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA',
    'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SI', 'SK',
    'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC',
    'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV',
    'TW', 'TZ', 'UA', 'UG', 'UK', 'UN', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE',
    'VG', 'VI', 'VN', 'VU', 'WS', 'XK', 'YE', 'ZA', 'ZM', 'ZW',
] as const

const LOCAL_FLAG_CODE_OVERRIDES: Record<string, string> = {
    GB: 'UK',
}

const COUNTRY_ALIASES: Record<string, string> = {
    usa: 'US',
    'united states of america': 'US',
    uk: 'GB',
    'united kingdom': 'GB',
    england: 'GB',
    'great britain': 'GB',
    korea: 'KR',
    'south korea': 'KR',
    'republic of korea': 'KR',
    'north korea': 'KP',
    russia: 'RU',
    'russian federation': 'RU',
    china: 'CN',
    "people's republic of china": 'CN',
    'peoples republic of china': 'CN',
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
    't\u00fcrkiye': 'TR',
    greece: 'GR',
    gre: 'GR',
    hellas: 'GR',
    'ellada': 'GR',
    '\u0395\u03bb\u03bb\u03ac\u03b4\u03b1': 'GR',
    egypt: 'EG',
    belgium: 'BE',
    libanon: 'LB',
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const regionNames =
    typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
        ? new Intl.DisplayNames(['en'], { type: 'region' })
        : null

function normalizeCountryKey(value: string | null | undefined): string {
    return String(value ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toLowerCase()
}

const countryListLabelToCode = new Map<string, string>(
    countryList
        .filter((entry) => entry?.label && entry?.value)
        .map((entry) => [normalizeCountryKey(entry.label), String(entry.value).toUpperCase()]),
)

const regionDisplayNameToCode = new Map<string, string>()
for (const code of AVAILABLE_FLAG_CODES) {
    if (!/^[A-Z]{2}$/.test(code)) continue
    const label = regionNames?.of(code)
    if (!label) continue
    regionDisplayNameToCode.set(normalizeCountryKey(label), code)
}

function resolveLocalAssetCode(code: string): string {
    const upper = code.toUpperCase()
    return LOCAL_FLAG_CODE_OVERRIDES[upper] || upper
}

export function getCountryCode(countryName: string | null): string | null {
    if (!countryName) return null

    const trimmed = countryName.trim()
    if (!trimmed) return null

    const normalized = normalizeCountryKey(trimmed)
    if (!normalized) return null

    if (normalized.length === 2 && /^[a-z]{2}$/i.test(normalized)) {
        return normalized.toUpperCase()
    }

    const aliasCode = COUNTRY_ALIASES[normalized]
    if (aliasCode) return aliasCode

    const countryListCode = countryListLabelToCode.get(normalized)
    if (countryListCode) return countryListCode

    const regionCode = regionDisplayNameToCode.get(normalized)
    if (regionCode) return regionCode

    return null
}

export function getCountryLabel(countryName: string | null): string | null {
    if (!countryName) return null

    const trimmed = countryName.trim()
    if (!trimmed) return null

    const code = getCountryCode(trimmed)
    if (!code) return trimmed

    const displayName = regionNames?.of(code)
    if (displayName) return displayName

    const country = countryList.find((entry) => String(entry.value).toUpperCase() === code)
    return country?.label || trimmed
}

export function getCountryFlagPath(countryName: string | null): string | null {
    if (!countryName) return null

    const code = getCountryCode(countryName)
    if (!code) return null

    return `${basePath}/img/countries/${resolveLocalAssetCode(code)}.png`
}

export function getCountryFlagCdnUrl(
    countryName: string | null,
    size: 40 | 80 | 160 = 40,
): string | null {
    const code = getCountryCode(countryName)
    if (!code) return null
    return `https://flagcdn.com/w${size}/${code.toLowerCase()}.png`
}
