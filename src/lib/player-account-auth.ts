export type PlayerAccountSummary = {
  id: number;
  documentId: string | null;
  email: string | null;
  fullName: string | null;
  status: "active" | "pending_verification" | "disabled" | null;
  emailVerifiedAt: string | null;
  player: {
    id: number | null;
    documentId: string | null;
    fullName: string | null;
    country: string | null;
  } | null;
  enrollmentRequest: {
    id: number | null;
    documentId: string | null;
    fullName: string | null;
    status: string | null;
    accountCompletionStatus: string | null;
  } | null;
};

export type PlayerAccountClaimInfo = {
  enrollmentRequestId: string | null;
  fullName: string | null;
  email: string | null;
  mobile: string | null;
  country: string | null;
  clubName: string | null;
  status: string | null;
  accountCompletionStatus: string | null;
  linkedPlayerDocumentId: string | null;
};

export type PlayerAccountEnrollmentPreview = {
  enrollmentRequestId: string | null;
  fullName: string | null;
  email: string | null;
  mobile: string | null;
  country: string | null;
  clubName: string | null;
  status: string | null;
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

export type PlayerAccountDashboard = {
  account: PlayerAccountSummary | null;
  stats: {
    friendlyMatches: number;
    tournaments: number;
    activeDevices: number;
    totalDevices: number;
    wins: number;
  };
  latestFriendlyMatches: PlayerAccountFriendlyMatch[];
  latestTournaments: PlayerAccountTournamentParticipation[];
  devices: PlayerAccountDevice[];
  playerCard: {
    documentId: string | null;
    fullName: string | null;
    country: string | null;
    photoUrl: string | null;
  } | null;
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

type TournamentsEnvelope = {
  data?: PlayerAccountTournamentParticipation[];
  error?: string;
};

type DeviceLinkEnvelope = {
  data?: PlayerAccountDeviceLinkRequest | PlayerAccountSummary;
  error?: string;
};

function extractErrorMessage(json: any, fallback: string) {
  const direct = typeof json?.error === "string" ? json.error : null;
  if (direct) return direct;
  const nested = typeof json?.error?.message === "string" ? json.error.message : null;
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
    playerDocumentId?: string | null;
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
