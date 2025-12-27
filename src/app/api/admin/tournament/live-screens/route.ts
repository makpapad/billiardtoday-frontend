import { NextRequest, NextResponse } from 'next/server'

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

// Mock data - θα αντικατασταθεί με πραγματικά δεδομένα από το admin
const mockLiveScreens: LiveScreensResponse = {
  success: true,
  data: [
    {
      tournamentId: "tournament-1",
      tournamentTitle: "Local Test Tournament",
      liveScreens: [
        {
          screenId: "GR-ATH-DEV-S1-897c20d4-1426",
          screenName: "Dev Table 1 (Local)",
          isActive: true,
          tournamentId: "tournament-1",
          lastUpdate: new Date().toISOString()
        }
      ]
    }
  ]
}

export async function GET(request: NextRequest) {
  try {
    // Προσωρινά επιστρέφουμε mock data
    // Στο μέλλον θα φέρνουμε δεδομένα από το admin API
    return NextResponse.json(mockLiveScreens)
  } catch (error) {
    console.error('Error fetching live screens:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch live screens'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tournamentId, screenId, screenName, isActive } = body

    // Εδώ θα γίνεται η αποθήκευση στο admin system
    // Προς το παρόν απλά επιστρέφουμε επιτυχία
    
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
  } catch (error) {
    console.error('Error updating live screen:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update live screen'
      },
      { status: 500 }
    )
  }
}
