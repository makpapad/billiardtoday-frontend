import { NextRequest, NextResponse } from 'next/server'
import { fetchScoreboardSessionRows, normalizeLiveSessionRow } from '@/lib/liveSessions'

export interface LiveScreen {
  screenId: string
  screenName: string
  isActive: boolean
  tournamentId: string
  lastUpdate?: string
}

export interface LiveScreensResponse {
  success: boolean
  data: {
    tournamentId: string
    tournamentTitle: string
    liveScreens: LiveScreen[]
  }[]
  error?: string
}

type RawSession = Record<string, unknown>

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

const getRowValue = (row: RawSession, key: string): unknown => {
  if (key in row) return row[key]
  const attributes = asRecord(row.attributes)
  if (attributes && key in attributes) return attributes[key]
  return undefined
}

export async function GET(_request: NextRequest) {
  try {
    const rows = await fetchScoreboardSessionRows(['pending', 'in_progress'])
    const grouped = new Map<string, { tournamentId: string; tournamentTitle: string; liveScreens: LiveScreen[] }>()

    rows.forEach((row: RawSession) => {
      const rawRow = row as RawSession
      const normalized = normalizeLiveSessionRow(rawRow)
      const tournamentId = asString(getRowValue(rawRow, 'eventId'))
      const sessionStatus = asString(getRowValue(rawRow, 'sessionStatus'))
      const screenId =
        asString(getRowValue(rawRow, 'screenIdentifier')) ??
        (typeof normalized.screenId === 'string' && normalized.screenId.trim().length > 0
          ? normalized.screenId.trim()
          : null)

      if (!tournamentId || !screenId) return

      const tournamentTitle =
        asString(getRowValue(rawRow, 'eventTitle')) ??
        (typeof normalized.state.tournamentName === 'string' && normalized.state.tournamentName.trim().length > 0
          ? normalized.state.tournamentName.trim()
          : tournamentId)

      const screenName =
        asString(getRowValue(rawRow, 'tableNumber')) ??
        asString(getRowValue(rawRow, 'screenIdentifier')) ??
        screenId

      const current = grouped.get(tournamentId) ?? {
        tournamentId,
        tournamentTitle,
        liveScreens: [],
      }

      const existingIndex = current.liveScreens.findIndex((screen) => screen.screenId === screenId)
      const screen: LiveScreen = {
        screenId,
        screenName,
        isActive: sessionStatus === 'in_progress',
        tournamentId,
        lastUpdate: typeof normalized.updatedAt === 'string' ? normalized.updatedAt : undefined,
      }

      if (existingIndex >= 0) {
        current.liveScreens[existingIndex] = screen
      } else {
        current.liveScreens.push(screen)
      }

      grouped.set(tournamentId, current)
    })

    return NextResponse.json({
      success: true,
      data: Array.from(grouped.values()),
    } satisfies LiveScreensResponse)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch live screens'
    console.error('Error fetching live screens:', error)
    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    let payload: Record<string, unknown> = {}
    try {
      const parsed = (await request.json()) as unknown
      if (parsed && typeof parsed === 'object') {
        payload = parsed as Record<string, unknown>
      }
    } catch {
      payload = {}
    }
    const tournamentId = asString(payload.tournamentId)
    const screenId = asString(payload.screenId)
    const screenName = asString(payload.screenName)
    const isActive = Boolean(payload.isActive)

    return NextResponse.json({
      success: true,
      data: {
        tournamentId,
        screenId,
        screenName,
        isActive,
        lastUpdate: new Date().toISOString()
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update live screen'
    console.error('Error updating live screen:', error)
    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: 500 }
    )
  }
}
