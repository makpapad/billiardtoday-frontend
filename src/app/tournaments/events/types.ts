export type StrapiEventStage = {
    id?: number | string | null
    documentId?: string | null
    title?: string | null
    start_date?: string | null
    end_date?: string | null
    order?: number | null
    is_final?: boolean | null
    groups?: unknown
    results?: unknown
}

export type StrapiGroup = {
    id?: number | string | null
    documentId?: string | null
    number?: number | string | null
    date_time?: string | null
    player1?: unknown
    player2?: unknown
    player1_points?: number | string | null
    player1_match_points?: number | string | null
    player1_innings?: number | string | null
    player1_high_run?: number | string | null
    player1_high_run_2?: number | string | null
    player2_points?: number | string | null
    player2_match_points?: number | string | null
    player2_innings?: number | string | null
    player2_high_run?: number | string | null
    player2_high_run_2?: number | string | null
}

export type StrapiResult = {
    id?: number | string | null
    documentId?: string | null
    match_points?: number | string | null
    points?: number | string | null
    innings?: number | string | null
    high_run?: number | string | null
    group_number?: number | string | null
    group_position?: number | string | null
    final_position?: number | string | null
    player?: unknown
}

export type StrapiEvent = {
    id?: number | string | null
    documentId?: string | null
    title?: string | null
    season?: number | string | null
    start_date?: string | null
    end_date?: string | null
    event_stages?: StrapiEventStage[] | null
}

export type EventApiResponse = {
    data?: StrapiEvent | null
}

export type NormalizedEventStage = {
    id: string
    documentId: string
    title: string
    startDate: string | null
    endDate: string | null
    order: number | null
    isFinal: boolean
    groups: NormalizedGroupMatch[]
    results: NormalizedStageResult[]
}

export type NormalizedGroupPlayer = {
    name: string
    documentId: string | null
    points: number | null
    matchPoints: number | null
    innings: number | null
    highRun: number | null
    highRun2: number | null
}

export type NormalizedGroupMatch = {
    id: string
    documentId: string
    number: number | null
    dateTime: string | null
    player1: NormalizedGroupPlayer
    player2: NormalizedGroupPlayer
}

export type NormalizedStageResult = {
    id: string
    documentId: string
    playerName: string
    matchPoints: number | null
    points: number | null
    innings: number | null
    highRun: number | null
    groupNumber: number | null
    groupPosition: number | null
    finalPosition: number | null
}

export type StageMatchGroup = {
    key: string
    number: number | null
    matches: {
        key: string
        dateTime: string | null
        top: {
            player: NormalizedGroupPlayer
            outcome: 'W' | 'L' | 'D' | null
        }
        bottom: {
            player: NormalizedGroupPlayer
            outcome: 'W' | 'L' | 'D' | null
        }
    }[]
}

export type PlayerRecord = {
    wins: number
    draws: number
    losses: number
}

export type GroupStanding = {
    key: string
    playerName: string
    record: PlayerRecord
    totalMatchPoints: number
    totalPoints: number
    totalInnings: number
    average: number | null
    highRun: number | null
    highRun2: number | null
    place: number
}
