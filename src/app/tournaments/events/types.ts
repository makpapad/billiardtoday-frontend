export type TimetableConfig = {
  tableCount?: number | null;
  slotMinutes?: number | null;
  breakBetweenSlotsMinutes?: number | null;
  defaultDayStartTime?: string | null;
  defaultLastStartTime?: string | null;
  timezoneOffsetMinutes?: number | null;
  training?: {
    enabled?: boolean | null;
    date?: string | null;
    endDate?: string | null;
    slotMinutes?: number | null;
    startTime?: string | null;
    lastStartTime?: string | null;
    allowedTables?: Array<number | string | null> | null;
  } | null;
};

export type StrapiEventStage = {
  id?: number | string | null;
  documentId?: string | null;
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  order?: number | null;
  is_final?: boolean | null;
  stage_type?: string | null;
  timetable_config?: TimetableConfig | null;
  groups?: unknown;
  results?: unknown;
};

export type StrapiGroup = {
  id?: number | string | null;
  documentId?: string | null;
  number?: number | string | null;
  date_time?: string | null;
  source?: string | null;
  round?: string | null;
  bracket_type?: string | null;
  match_number?: number | string | null;
  player1?: unknown;
  player2?: unknown;
  player1_points?: number | string | null;
  player1_match_points?: number | string | null;
  player1_innings?: number | string | null;
  player1_high_run?: number | string | null;
  player1_high_run_2?: number | string | null;
  player1_tie_break?: number | string | null;
  player2_points?: number | string | null;
  player2_match_points?: number | string | null;
  player2_innings?: number | string | null;
  player2_high_run?: number | string | null;
  player2_high_run_2?: number | string | null;
  player2_tie_break?: number | string | null;
  global_match_number?: number | string | null;
  winner_to_global_match_number?: number | string | null;
  winner_to_slot?: number | string | null;
  loser_to_global_match_number?: number | string | null;
  loser_to_slot?: number | string | null;
};

export type StrapiResult = {
  id?: number | string | null;
  documentId?: string | null;
  match_points?: number | string | null;
  points?: number | string | null;
  innings?: number | string | null;
  high_run?: number | string | null;
  group_number?: number | string | null;
  group_position?: number | string | null;
  final_position?: number | string | null;
  player?: unknown;
};

export type StrapiFinalResult = {
  id?: number | string | null;
  documentId?: string | null;
  position?: number | string | null;
  best_average?: number | string | null;
  caroms?: number | string | null;
  points?: number | string | null;
  innings?: number | string | null;
  high_run?: number | string | null;
  ranking_points?: number | string | null;
  penalty?: number | string | null;
  final_points?: number | string | null;
  player?: unknown;
};

export type StrapiEventTimetableSlot = {
  id?: number | string | null;
  documentId?: string | null;
  slot_type?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  date?: string | null;
  time?: string | null;
  date_time?: string | null;
  table_label?: string | null;
  table_order?: number | string | null;
  slot_order?: number | string | null;
  slot_status?: string | null;
  is_visible?: boolean | null;
  is_published?: boolean | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
  stage?: unknown;
  match?: unknown;
};

export type StrapiEvent = {
  id?: number | string | null;
  documentId?: string | null;
  title?: string | null;
  season?: number | string | null;
  start_date?: string | null;
  end_date?: string | null;
  timetable_config?: TimetableConfig | null;
  event_stages?: StrapiEventStage[] | null;
  results_final?: StrapiFinalResult[] | null;
  timetable_slots?: StrapiEventTimetableSlot[] | null;
};

export type EventApiResponse = {
  data?: StrapiEvent | null;
};

export type NormalizedEventStage = {
  id: string;
  documentId: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  order: number | null;
  isFinal: boolean;
  stageType: string | null;
  groups: NormalizedGroupMatch[];
  results: NormalizedStageResult[];
};

export type NormalizedGroupPlayer = {
  // numeric Strapi id
  id: number | null;
  // display name with preference (full_name_en if available, otherwise full_name)
  name: string;
  // native/localized name (usually full_name), may be same as name if no translation
  nativeName: string | null;
  country: string | null;
  documentId: string | null;
  points: number | null;
  matchPoints: number | null;
  innings: number | null;
  highRun: number | null;
  highRun2: number | null;
};

export type NormalizedGroupMatch = {
  id: string;
  documentId: string;
  number: number | null;
  dateTime: string | null;
  player1: NormalizedGroupPlayer;
  player2: NormalizedGroupPlayer;
};

export type NormalizedStageResult = {
  id: string;
  documentId: string;
  playerId: number | null;
  playerDocumentId: string | null;
  // display name with preference (full_name_en if available, otherwise full_name)
  playerName: string;
  playerNativeName: string | null;
  playerCountry: string | null;
  matchPoints: number | null;
  points: number | null;
  innings: number | null;
  highRun: number | null;
  groupNumber: number | null;
  groupPosition: number | null;
  finalPosition: number | null;
};

export type NormalizedFinalResult = {
  id: string;
  documentId: string;
  position: number | null;
  playerId: number | null;
  playerDocumentId: string | null;
  playerName: string;
  playerCountry: string | null;
  matchPoints: number | null;
  bestAverage: number | null;
  caroms: number | null;
  points: number | null;
  innings: number | null;
  highRun: number | null;
  rankingPoints: number | null;
  penalty: number | null;
  finalPoints: number | null;
};

export type NormalizedTimetableSlot = {
  id: string;
  documentId: string;
  slotType: string;
  title: string;
  subtitle: string;
  description: string;
  date: string;
  time: string;
  dateTime: string | null;
  tableLabel: string;
  tableOrder: number | null;
  slotOrder: number | null;
  slotStatus: string;
  isVisible: boolean;
  isPublished: boolean;
  stageTitle: string | null;
  stageDocumentId: string | null;
  groupNumber: number | null;
  matchNumber: number | null;
  matchLabel: string | null;
  trainingPlayerName: string | null;
  trainingPlayerCountry: string | null;
  matchPlayer1Name: string | null;
  matchPlayer2Name: string | null;
  matchPlayer1Country: string | null;
  matchPlayer2Country: string | null;
  matchDocumentId: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
};

export type StageMatchGroup = {
  key: string;
  number: number | null;
  matches: {
    key: string;
    matchDocumentId: string | null;
    dateTime: string | null;
    top: {
      player: NormalizedGroupPlayer;
      outcome: "W" | "L" | "D" | null;
    };
    bottom: {
      player: NormalizedGroupPlayer;
      outcome: "W" | "L" | "D" | null;
    };
  }[];
};

export type PlayerRecord = {
  wins: number;
  draws: number;
  losses: number;
};

export type GroupStanding = {
  key: string;
  playerId: number | null;
  playerName: string;
  playerNativeName: string | null;
  playerCountry: string | null;
  record: PlayerRecord;
  totalMatchPoints: number;
  totalPoints: number;
  totalInnings: number;
  average: number | null;
  bestAverage: number | null;
  highRun: number | null;
  highRun2: number | null;
  place: number;
};
