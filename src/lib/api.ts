const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://app.billiardtoday.com'
const SCOREBOARD_URL = process.env.NEXT_PUBLIC_SCOREBOARD_URL || 'https://scoreboard.billiardtoday.com'
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.billiardtoday.com'

export interface Tournament {
  id: number
  documentId: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  status: 'upcoming' | 'ongoing' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  data: T
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

/**
 * Fetch all tournaments from Strapi
 */
export async function getTournaments(params?: {
  page?: number
  pageSize?: number
  status?: string
}): Promise<ApiResponse<Tournament[]>> {
  const searchParams = new URLSearchParams()
  
  if (params?.page) searchParams.append('pagination[page]', params.page.toString())
  if (params?.pageSize) searchParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params?.status) searchParams.append('filters[status][$eq]', params.status)
  
  searchParams.append('sort', 'startDate:desc')
  searchParams.append('populate', '*')
  
  const url = `${STRAPI_URL}/api/bt-tournaments?${searchParams.toString()}`
  
  const res = await fetch(url, {
    next: { revalidate: 60 } // Revalidate every 60 seconds
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch tournaments: ${res.status}`)
  }
  
  return res.json()
}

/**
 * Fetch a single tournament by documentId
 */
export async function getTournament(documentId: string): Promise<ApiResponse<Tournament>> {
  const url = `${STRAPI_URL}/api/bt-tournaments/${documentId}?populate=*`
  
  const res = await fetch(url, {
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch tournament: ${res.status}`)
  }
  
  return res.json()
}

/**
 * Fetch tournament events/stages
 */
export async function getTournamentStages(tournamentId: string) {
  const url = `${STRAPI_URL}/api/bt-event-stages?filters[tournament][documentId][$eq]=${tournamentId}&populate[groups][populate]=*`
  
  const res = await fetch(url, {
    next: { revalidate: 30 }
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch tournament stages: ${res.status}`)
  }
  
  return res.json()
}

/**
 * Get scoreboard URL for a specific tournament
 */
export function getScoreboardUrl(tournamentId: string): string {
  return `${SCOREBOARD_URL}/${tournamentId}`
}

/**
 * Get admin URL for managing tournaments
 */
export function getAdminUrl(path: string = ''): string {
  return `${ADMIN_URL}${path}`
}

/**
 * Check if user has admin access (client-side helper)
 */
export function isAdminPath(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname.includes('admin')
}

/**
 * Helper function to format dates
 */
export function formatDate(dateString: string, locale: string = 'el-GR'): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Helper function to get tournament status badge color
 */
export function getStatusColor(status: Tournament['status']): string {
  switch (status) {
    case 'upcoming':
      return 'blue'
    case 'ongoing':
      return 'green'
    case 'completed':
      return 'gray'
    default:
      return 'gray'
  }
}

/**
 * Helper function to get tournament status label in Greek
 */
export function getStatusLabel(status: Tournament['status']): string {
  switch (status) {
    case 'upcoming':
      return 'Επερχόμενο'
    case 'ongoing':
      return 'Σε εξέλιξη'
    case 'completed':
      return 'Ολοκληρωμένο'
    default:
      return status
  }
}
