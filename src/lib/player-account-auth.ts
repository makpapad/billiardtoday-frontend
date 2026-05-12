export type PlayerAccountSummary = {
  id: number;
  documentId: string | null;
  email: string | null;
  fullName: string | null;
  status:
    | "active"
    | "pending_verification"
    | "disabled"
    | "active_unlinked"
    | "active_pending_player_review"
    | "active_linked"
    | "suspended"
    | null;
  isOfficiallyVerified?: boolean;
  emailVerifiedAt: string | null;
  mobile?: string | null;
  phoneVerifiedAt?: string | null;
  socialProvider?: "google" | "facebook" | null;
  socialProviderLinked?: boolean;
  ownership?: {
    methods: Array<"email" | "phone" | "google" | "facebook">;
    primaryMethod: "email" | "phone" | "google" | "facebook" | null;
    emailVerifiedAt: string | null;
    mobile: string | null;
    mobileMasked: string | null;
    phoneVerifiedAt: string | null;
    socialProvider: "google" | "facebook" | null;
    socialProviderLabel: string | null;
    socialVerified: boolean;
  };
  player: {
    id: number | null;
    documentId: string | null;
    fullName: string | null;
    country: string | null;
  } | null;
  enrollmentRequest: {
    id: number | null;
    documentId: string | null;
    displayName: string | null;
    fullName: string | null;
    fullNameSubmitted?: string | null;
    status: string | null;
    identityStatus?: string | null;
    accountCompletionStatus: string | null;
  } | null;
};

export type PlayerAccountClaimInfo = {
  enrollmentRequestId: string | null;
  displayName: string | null;
  fullName: string | null;
  fullNameSubmitted?: string | null;
  email: string | null;
  mobile: string | null;
  country: string | null;
  clubName: string | null;
  status: string | null;
  identityStatus?: string | null;
  accountCompletionStatus: string | null;
  linkedPlayerDocumentId: string | null;
};

export type PlayerAccountEnrollmentPreview = {
  enrollmentRequestId: string | null;
  displayName: string | null;
  fullName: string | null;
  fullNameSubmitted?: string | null;
  email: string | null;
  mobile: string | null;
  country: string | null;
  clubName: string | null;
  status: string | null;
  identityStatus?: string | null;
  accountCompletionStatus: string | null;
  linkedPlayerDocumentId: string | null;
};

export type PlayerAccountDevice = {
  id: number | null;
  documentId: string | null;
  deviceLabel: string | null;
  platform: string | null;
  browser: string | null;
  appVersion: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  deviceTokenLast4: string | null;
};

export type PlayerAccountFriendlyMatch = {
  id: number | null;
  documentId: string | null;
  screenIdentifier: string | null;
  clubName: string | null;
  venueName: string | null;
  tableLabel: string | null;
  player1Name: string | null;
  player2Name: string | null;
  player1DocumentId: string | null;
  player2DocumentId: string | null;
  player1_points: number | null;
  player2_points: number | null;
  player1_innings: number | null;
  player2_innings: number | null;
  player1_high_run: number | null;
  player2_high_run: number | null;
  targetPoints: number | null;
  maxInnings: number | null;
  matchDateTime: string | null;
  reportedAt: string | null;
  winner: string | null;
  winnerSide: string | null;
  notes: string | null;
  tags: string[];
};

export type PlayerAccountFriendlyRecording = {
  id: number | null;
  documentId: string | null;
  status: "starting" | "live" | "stopped" | "failed" | "expired" | "deleted" | null;
  streamPath: string | null;
  publishUrl: string | null;
  playbackUrl: string | null;
  hlsUrl: string | null;
  recordingPath: string | null;
  processedPlaybackUrl: string | null;
  processedPath: string | null;
  processedAt: string | null;
  processedDurationSec: number | null;
  processingStatus: "not-requested" | "pending" | "processing" | "ready" | "failed" | null;
  processingError: string | null;
  requestedPlayerSlot: "p1" | "p2" | "both" | "unknown" | null;
  screenIdentifier: string | null;
  tableLabel: string | null;
  source: string | null;
  encoder: string | null;
  resolution: string | null;
  fps: number | null;
  bitrateKbps: number | null;
  startedAt: string | null;
  endedAt: string | null;
  expiresAt: string | null;
  durationSec: number | null;
  failureReason: string | null;
  clubName: string | null;
  friendlyMatchId: number | string | null;
};

export type PlayerAccountFriendlyRecordingEvent = {
  id: number | null;
  documentId: string | null;
  recordingId: number | string | null;
  offsetMs: number;
  eventType: string | null;
  sequence: number | null;
  screenIdentifier: string | null;
  state: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
};

export type PlayerAccountDashboard = {
  account: PlayerAccountSummary | null;
  stats: {
    friendlyMatches: number;
    tournaments: number;
    activeDevices: number;
    totalDevices: number;
    wins: number;
    official?: {
      totalMatches: number;
      totalWins: number;
      totalLosses: number;
      totalDraws: number;
      winPercentage: number | string | null;
      avgPerInning: number | string | null;
      bestAverageFromWins: number | string | null;
      highestRun: number;
    } | null;
  };
  visibility?: {
    officialSectionsEnabled?: boolean;
  };
  latestFriendlyMatches: PlayerAccountFriendlyMatch[];
  latestTournaments: PlayerAccountTournamentParticipation[];
  devices: PlayerAccountDevice[];
  playerCard: {
    displayName?: string | null;
    documentId: string | null;
    fullName: string | null;
    officialPlayerName?: string | null;
    country: string | null;
    photoUrl: string | null;
    identityStatus?: string | null;
    isTemporary?: boolean;
  } | null;
};

export type PlayerAccountAuthOptions = {
  socialProviders: {
    google: {
      provider: "google";
      label: string;
      enabled: boolean;
      clientId?: string | null;
    };
    facebook: {
      provider: "facebook";
      label: string;
      enabled: boolean;
      appId?: string | null;
      graphVersion?: string | null;
    };
  };
  phoneOtp: {
    enabled: boolean;
    mode: "webhook" | "console" | null;
  };
};

export type PlayerAccountSecurity = {
  account: PlayerAccountSummary | null;
  authOptions: PlayerAccountAuthOptions;
  phoneVerification: {
    mobile: string | null;
    mobileMasked: string | null;
    verifiedAt: string | null;
    sentAt: string | null;
    expiresAt: string | null;
    pending: boolean;
  };
};

export type PlayerAccountTournamentMatch = {
  id: string;
  num: number | null;
  date: string | null;
  opponent: string | null;
  opponentId: string | null;
  stage: string | null;
  result: "win" | "loss" | "draw";
  scoreFor: number | null;
  scoreAgainst: number | null;
  innings: number | null;
  highRun: number | null;
};

export type PlayerAccountTournamentParticipation = {
  id: string;
  tournament: string | null;
  year: number | null;
  gameType: string | null;
  tournamentType?: string | null;
  position: string;
  finals: Array<{ position: number | null }>;
  stageResults: Array<{
    stageTitle: string | null;
    finalPosition: number | null;
    groupPosition: number | null;
  }>;
  matches: PlayerAccountTournamentMatch[];
  totalMatches: number;
  wins: number;
  losses: number;
  highestRun: number;
  avgPerInning: number;
};

export type PlayerAccountDeviceLinkRequest = {
  linkToken: string;
  linkUrl: string;
  expiresAt: string | null;
  status: "pending" | "completed" | "expired" | "cancelled" | null;
};

type AuthEnvelope = {
  data?: PlayerAccountSummary;
  meta?: {
    jwt?: string;
  };
  error?: string;
};

type ClaimEnvelope = {
  data?: PlayerAccountClaimInfo;
  error?: string;
};

type EnrollmentPreviewEnvelope = {
  data?: PlayerAccountEnrollmentPreview | null;
  error?: string;
};

type VerifyEnvelope = {
  data?: PlayerAccountSummary;
  error?: string;
};

type SimpleSuccessEnvelope = {
  data?: { sent?: boolean } | PlayerAccountSummary;
  error?: string;
};

type FriendlyRecordingsEnvelope = {
  data?: PlayerAccountFriendlyRecording[];
  error?: string;
};

type FriendlyRecordingEventsEnvelope = {
  data?: PlayerAccountFriendlyRecordingEvent[];
  error?: string;
};

type FriendlyRecordingDeleteEnvelope = {
  data?: (PlayerAccountFriendlyRecording & { deleted?: boolean }) | { deleted?: boolean };
  error?: string;
};

type DashboardEnvelope = {
  data?: PlayerAccountDashboard;
  error?: string;
};

type DevicesEnvelope = {
  data?: PlayerAccountDevice[];
  error?: string;
};

type DeviceEnvelope = {
  data?: PlayerAccountDevice;
  error?: string;
};

type FriendlyMatchesEnvelope = {
  data?: PlayerAccountFriendlyMatch[];
  error?: string;
};

type FriendlyMatchEnvelope = {
  data?: PlayerAccountFriendlyMatch;
  error?: string;
};

type FriendlyMatchDeleteEnvelope = {
  data?: { id: number | string; documentId: string | null; deleted: boolean };
  error?: string;
};

export type PlayerAccountFriendlyMatchCreateInput = {
  player1Name: string;
  player2Name: string;
  player1_points?: number | null;
  player2_points?: number | null;
  innings?: number | null;
  player1_high_run?: number | null;
  player2_high_run?: number | null;
  targetPoints?: number | null;
  clubName?: string | null;
  venueName?: string | null;
  tableLabel?: string | null;
  matchDateTime?: string | null;
  notes?: string | null;
  tags?: string[];
};

type TournamentsEnvelope = {
  data?: PlayerAccountTournamentParticipation[];
  error?: string;
};

type DeviceLinkEnvelope = {
  data?: PlayerAccountDeviceLinkRequest | PlayerAccountSummary;
  error?: string;
};

type TrustedDeviceRecoveryEnvelope = {
  data?: {
    deviceToken: string;
    player: {
      id?: number | null;
      documentId?: string | null;
      displayName?: string | null;
      fullName?: string | null;
      officialPlayerName?: string | null;
      country?: string | null;
      photoUrl?: string | null;
      identityStatus?: string | null;
      isTemporary?: boolean;
      enrollmentRequestId?: string | null;
      mobile?: string | null;
      email?: string | null;
    } | null;
    account?: PlayerAccountSummary | null;
  };
  error?: string;
};

type AuthOptionsEnvelope = {
  data?: PlayerAccountAuthOptions;
  error?: string;
};

type SecurityEnvelope = {
  data?: PlayerAccountSecurity;
  error?: string;
};

type PhoneVerificationStartEnvelope = {
  data?: {
    sent: boolean;
    alreadyVerified?: boolean;
    mobileMasked: string | null;
    expiresAt: string | null;
  };
  error?: string;
};

type SocialLoginEnvelope = AuthEnvelope;

function extractErrorMessage(json: any, fallback: string) {
  const parseMaybeJson = (value: string) => {
    const clean = value.trim();
    if (!clean || (!clean.startsWith("{") && !clean.startsWith("["))) return null;
    try {
      return JSON.parse(clean);
    } catch {
      return null;
    }
  };

  const pickMessage = (value: any): string | null => {
    if (!value || typeof value !== "object") return null;

    const directNested = typeof value?.error?.message === "string" ? value.error.message : null;
    if (directNested) return directNested;

    const dataNested = typeof value?.data?.error?.message === "string" ? value.data.error.message : null;
    if (dataNested) return dataNested;

    const topLevel = typeof value?.message === "string" ? value.message : null;
    if (topLevel) return topLevel;

    return null;
  };

  if (typeof json?.error === "string") {
    const parsedError = parseMaybeJson(json.error);
    const parsedMessage = pickMessage(parsedError);
    if (parsedMessage) return parsedMessage;
    return json.error;
  }

  const nested = pickMessage(json);
  if (nested) return nested;

  return fallback;
}

const TOKEN_KEY = "player_account_jwt";
const ACCOUNT_KEY = "player_account_summary";

class PlayerAccountAuth {
  private jwt: string | null = null;
  private account: PlayerAccountSummary | null = null;
  private hydrated = false;

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage() {
    if (this.hydrated) return;
    if (typeof window === "undefined") return;

    this.jwt = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (raw) {
      try {
        this.account = JSON.parse(raw) as PlayerAccountSummary;
      } catch {
        this.account = null;
      }
    }
    this.hydrated = true;
  }

  private persist() {
    if (typeof window === "undefined") return;
    if (this.jwt) localStorage.setItem(TOKEN_KEY, this.jwt);
    else localStorage.removeItem(TOKEN_KEY);

    if (this.account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(this.account));
    else localStorage.removeItem(ACCOUNT_KEY);
  }

  async login(email: string, password: string) {
    this.hydrateFromStorage();
    const res = await fetch("/account-access/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = (await res.json().catch(() => null)) as AuthEnvelope | null;
    if (!res.ok || !json?.data || !json?.meta?.jwt) {
      throw new Error(extractErrorMessage(json, "Login failed"));
    }
    this.jwt = json.meta.jwt;
    this.account = json.data;
    this.persist();
    return this.account;
  }

  async register(input: {
    email: string;
    password: string;
    fullName?: string | null;
    enrollmentRequestId?: string | null;
  }) {
    this.hydrateFromStorage();
    const res = await fetch("/account-access/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => null)) as AuthEnvelope | null;
    if (!res.ok || !json?.data || !json?.meta?.jwt) {
      throw new Error(extractErrorMessage(json, "Registration failed"));
    }
    this.jwt = json.meta.jwt;
    this.account = json.data;
    this.persist();
    return this.account;
  }

  async getAuthOptions() {
    const res = await fetch("/account-access/auth-options", {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as AuthOptionsEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Account auth options request failed"));
    }
    return json.data;
  }

  async socialLogin(
    provider: "google" | "facebook",
    payload: { idToken?: string | null; accessToken?: string | null; claimToken?: string | null },
  ) {
    this.hydrateFromStorage();
    const res = await fetch("/account-access/social/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        idToken: payload.idToken || null,
        accessToken: payload.accessToken || null,
        claimToken: payload.claimToken || null,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as SocialLoginEnvelope | null;
    if (!res.ok || !json?.data || !json?.meta?.jwt) {
      throw new Error(extractErrorMessage(json, "Social login failed"));
    }
    this.jwt = json.meta.jwt;
    this.account = json.data;
    this.persist();
    return this.account;
  }

  async me() {
    this.hydrateFromStorage();
    if (!this.jwt) return null;
    const res = await fetch("/account-access/me", {
      headers: { Authorization: `Bearer ${this.jwt}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as AuthEnvelope | null;
    if (!res.ok || !json?.data) {
      if (res.status === 401 || res.status === 403) {
        this.logout();
        return null;
      }
      return null;
    }
    this.account = json.data;
    this.persist();
    return this.account;
  }

  async getClaimInfo(claimToken: string) {
    this.hydrateFromStorage();
    const params = new URLSearchParams({ token: claimToken });
    const res = await fetch(`/account-access/claim?${params.toString()}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as ClaimEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Claim lookup failed"));
    }
    return json.data;
  }

  async getEnrollmentPreview(email: string) {
    this.hydrateFromStorage();
    const normalized = email.trim();
    if (!normalized) return null;
    const params = new URLSearchParams({ email: normalized });
    const res = await fetch(`/account-access/enrollment-preview?${params.toString()}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as EnrollmentPreviewEnvelope | null;
    if (!res.ok) {
      throw new Error(extractErrorMessage(json, "Enrollment preview lookup failed"));
    }
    return json?.data || null;
  }

  async completeClaim(input: { claimToken: string; email: string; password: string; fullName?: string | null }) {
    this.hydrateFromStorage();
    const res = await fetch("/account-access/claim/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => null)) as AuthEnvelope | null;
    if (!res.ok || !json?.data || !json?.meta?.jwt) {
      throw new Error(extractErrorMessage(json, "Claim completion failed"));
    }
    this.jwt = json.meta.jwt;
    this.account = json.data;
    this.persist();
    return this.account;
  }

  async verifyEmail(token: string) {
    this.hydrateFromStorage();
    const params = new URLSearchParams({ token });
    const res = await fetch(`/account-access/email-check?${params.toString()}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as VerifyEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Email verification failed"));
    }
    if (this.account && this.account.id === json.data.id) {
      this.account = json.data;
      this.persist();
    }
    return json.data;
  }

  async resendVerificationEmail(input?: { email?: string | null }) {
    this.hydrateFromStorage();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.jwt) {
      headers.Authorization = `Bearer ${this.jwt}`;
    }

    const res = await fetch("/account-access/email-check/resend", {
      method: "POST",
      headers,
      body: JSON.stringify({ email: input?.email || null }),
    });
    const json = (await res.json().catch(() => null)) as { data?: { sent?: boolean }; error?: string } | null;
    if (!res.ok || !json?.data?.sent) {
      throw new Error(extractErrorMessage(json, "Verification email resend failed"));
    }
    return true;
  }

  async forgotPassword(email: string) {
    const res = await fetch("/account-access/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = (await res.json().catch(() => null)) as SimpleSuccessEnvelope | null;
    if (!res.ok || !(json?.data as { sent?: boolean } | undefined)?.sent) {
      throw new Error(extractErrorMessage(json, "Password reset request failed"));
    }
    return true;
  }

  async resetPassword(token: string, password: string) {
    const res = await fetch("/account-access/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const json = (await res.json().catch(() => null)) as { data?: PlayerAccountSummary; error?: string } | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Password reset failed"));
    }
    return json.data;
  }

  async dashboard() {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/dashboard", {
      headers: { Authorization: `Bearer ${this.jwt}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as DashboardEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Dashboard request failed"));
    }
    return json.data;
  }

  async security() {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/security", {
      headers: { Authorization: `Bearer ${this.jwt}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as SecurityEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Security request failed"));
    }
    if (json.data.account) {
      this.account = json.data.account;
      this.persist();
    }
    return json.data;
  }

  async updateProfile(input: { fullName?: string | null }) {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/profile", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as VerifyEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Profile update failed"));
    }
    this.account = json.data;
    this.persist();
    return json.data;
  }

  async startPhoneVerification(mobile?: string | null) {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/phone-verification/start", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mobile: mobile || null }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as PhoneVerificationStartEnvelope | null;
    if (!res.ok || !json?.data?.sent) {
      throw new Error(extractErrorMessage(json, "Phone verification start failed"));
    }
    return json.data;
  }

  async completePhoneVerification(code: string) {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/phone-verification/complete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as VerifyEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Phone verification failed"));
    }
    this.account = json.data;
    this.persist();
    return json.data;
  }

  async devices() {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/devices", {
      headers: { Authorization: `Bearer ${this.jwt}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as DevicesEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Devices request failed"));
    }
    return json.data;
  }

  async revokeDevice(deviceId: number | string) {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/devices/revoke", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceId }),
    });
    const json = (await res.json().catch(() => null)) as DeviceEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Device revoke failed"));
    }
    return json.data;
  }

  async friendlyMatches() {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/friendly-matches", {
      headers: { Authorization: `Bearer ${this.jwt}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as FriendlyMatchesEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Friendly matches request failed"));
    }
    return json.data;
  }

  async updateFriendlyMatch(input: {
    matchId: number | string;
    notes?: string | null;
    tags?: string[];
  }) {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/friendly-matches/update", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => null)) as FriendlyMatchEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Friendly match update failed"));
    }
    return json.data;
  }

  async createFriendlyMatch(input: PlayerAccountFriendlyMatchCreateInput) {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/friendly-matches/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as FriendlyMatchEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Friendly match create failed"));
    }
    return json.data;
  }

  async deleteFriendlyMatch(matchId: number | string) {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/friendly-matches/delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ matchId }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as FriendlyMatchDeleteEnvelope | null;
    if (!res.ok || !json?.data?.deleted) {
      throw new Error(extractErrorMessage(json, "Friendly match delete failed"));
    }
    return json.data;
  }

  async friendlyRecordings() {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/friendly-recordings", {
      headers: { Authorization: `Bearer ${this.jwt}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as FriendlyRecordingsEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Friendly recordings request failed"));
    }
    return json.data;
  }

  async friendlyRecordingEvents(recordingId: number | string) {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch(`/account-access/friendly-recordings/${encodeURIComponent(String(recordingId))}/events`, {
      headers: { Authorization: `Bearer ${this.jwt}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as FriendlyRecordingEventsEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Friendly recording events request failed"));
    }
    return json.data;
  }

  async deleteFriendlyRecording(recordingId: number | string) {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/friendly-recordings/delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recordingId }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as FriendlyRecordingDeleteEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Friendly recording delete failed"));
    }
    return json.data;
  }

  async tournaments() {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/tournaments", {
      headers: { Authorization: `Bearer ${this.jwt}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as TournamentsEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(extractErrorMessage(json, "Tournament request failed"));
    }
    return json.data;
  }

  async startDeviceLink() {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/device-link/start", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as DeviceLinkEnvelope | null;
    if (!res.ok || !json?.data || !("linkToken" in json.data)) {
      throw new Error(extractErrorMessage(json, "Device link request failed"));
    }
    return json.data;
  }

  async completeDeviceLink(input: { linkToken: string; deviceToken: string }) {
    const res = await fetch("/account-access/device-link/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as DeviceLinkEnvelope | null;
    if (!res.ok || !json?.data || !("id" in json.data)) {
      throw new Error(extractErrorMessage(json, "Device link completion failed"));
    }
    return json.data;
  }

  async recoverTrustedDevice(input: {
    deviceLabel?: string | null;
    platform?: string | null;
    browser?: string | null;
    appVersion?: string | null;
  }) {
    this.hydrateFromStorage();
    if (!this.jwt) throw new Error("Not authenticated");
    const res = await fetch("/account-access/device/recover", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as TrustedDeviceRecoveryEnvelope | null;
    if (!res.ok || !json?.data?.deviceToken) {
      throw new Error(extractErrorMessage(json, "Trusted device recovery failed"));
    }
    if (json.data.account) {
      this.account = json.data.account;
      this.persist();
    }
    return json.data;
  }

  logout() {
    this.hydrateFromStorage();
    this.jwt = null;
    this.account = null;
    this.persist();
  }

  isAuthenticated() {
    this.hydrateFromStorage();
    return Boolean(this.jwt && this.account);
  }

  getJwt() {
    this.hydrateFromStorage();
    return this.jwt;
  }

  getAccount() {
    this.hydrateFromStorage();
    return this.account;
  }
}

export const playerAccountAuth = new PlayerAccountAuth();
