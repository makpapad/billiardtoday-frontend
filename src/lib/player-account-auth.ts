export type PlayerAccountSummary = {
  id: number;
  documentId: string | null;
  email: string | null;
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

type VerifyEnvelope = {
  data?: PlayerAccountSummary;
  error?: string;
};

const TOKEN_KEY = "player_account_jwt";
const ACCOUNT_KEY = "player_account_summary";

class PlayerAccountAuth {
  private jwt: string | null = null;
  private account: PlayerAccountSummary | null = null;

  constructor() {
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
  }

  private persist() {
    if (typeof window === "undefined") return;
    if (this.jwt) localStorage.setItem(TOKEN_KEY, this.jwt);
    else localStorage.removeItem(TOKEN_KEY);

    if (this.account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(this.account));
    else localStorage.removeItem(ACCOUNT_KEY);
  }

  async login(email: string, password: string) {
    const res = await fetch("/api/account-access/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = (await res.json().catch(() => null)) as AuthEnvelope | null;
    if (!res.ok || !json?.data || !json?.meta?.jwt) {
      throw new Error(json?.error || "Login failed");
    }
    this.jwt = json.meta.jwt;
    this.account = json.data;
    this.persist();
    return this.account;
  }

  async register(input: {
    email: string;
    password: string;
    playerDocumentId?: string | null;
    enrollmentRequestId?: string | null;
  }) {
    const res = await fetch("/api/account-access/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => null)) as AuthEnvelope | null;
    if (!res.ok || !json?.data || !json?.meta?.jwt) {
      throw new Error(json?.error || "Registration failed");
    }
    this.jwt = json.meta.jwt;
    this.account = json.data;
    this.persist();
    return this.account;
  }

  async me() {
    if (!this.jwt) return null;
    const res = await fetch("/api/account-access/me", {
      headers: { Authorization: `Bearer ${this.jwt}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as AuthEnvelope | null;
    if (!res.ok || !json?.data) {
      this.logout();
      return null;
    }
    this.account = json.data;
    this.persist();
    return this.account;
  }

  async getClaimInfo(claimToken: string) {
    const params = new URLSearchParams({ token: claimToken });
    const res = await fetch(`/api/account-access/claim?${params.toString()}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as ClaimEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(json?.error || "Claim lookup failed");
    }
    return json.data;
  }

  async completeClaim(input: { claimToken: string; email: string; password: string }) {
    const res = await fetch("/api/account-access/claim/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => null)) as AuthEnvelope | null;
    if (!res.ok || !json?.data || !json?.meta?.jwt) {
      throw new Error(json?.error || "Claim completion failed");
    }
    this.jwt = json.meta.jwt;
    this.account = json.data;
    this.persist();
    return this.account;
  }

  async verifyEmail(token: string) {
    const params = new URLSearchParams({ token });
    const res = await fetch(`/api/account-access/email-check?${params.toString()}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as VerifyEnvelope | null;
    if (!res.ok || !json?.data) {
      throw new Error(json?.error || "Email verification failed");
    }
    if (this.account && this.account.id === json.data.id) {
      this.account = json.data;
      this.persist();
    }
    return json.data;
  }

  async resendVerificationEmail(input?: { email?: string | null }) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.jwt) {
      headers.Authorization = `Bearer ${this.jwt}`;
    }

    const res = await fetch("/api/account-access/email-check/resend", {
      method: "POST",
      headers,
      body: JSON.stringify({ email: input?.email || null }),
    });
    const json = (await res.json().catch(() => null)) as { data?: { sent?: boolean }; error?: string } | null;
    if (!res.ok || !json?.data?.sent) {
      throw new Error(json?.error || "Verification email resend failed");
    }
    return true;
  }

  logout() {
    this.jwt = null;
    this.account = null;
    this.persist();
  }

  isAuthenticated() {
    return Boolean(this.jwt && this.account);
  }

  getJwt() {
    return this.jwt;
  }

  getAccount() {
    return this.account;
  }
}

export const playerAccountAuth = new PlayerAccountAuth();
