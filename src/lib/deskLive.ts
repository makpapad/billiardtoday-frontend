"use client";

/**
 * Το desk στέλνει το σκορ στο relay με το ίδιο μήνυμα που στέλνει η φυσική οθόνη
 * (`score:update`). Χωρίς αυτό, το Live δείχνει το ζευγάρι αλλά όχι πόντους —
 * το `session` στο Strapi δεν κουβαλά σκορ στα SESSION_UPDATED.
 */

const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || "BT_WS_RELAY_TOKEN_2025";

function buildUrl(screenId: string): string | null {
  const raw =
    process.env.NEXT_PUBLIC_WS_ENDPOINT ||
    process.env.NEXT_PUBLIC_WS_URL ||
    "wss://ws.billiardtoday.com/ws";
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("ws") ? raw : `wss://${raw}`);
    const params = new URLSearchParams();
    if (WS_TOKEN) params.set("token", WS_TOKEN);
    params.set("screenId", screenId);
    url.search = params.toString();
    return url.toString();
  } catch {
    return null;
  }
}

export type DeskLiveState = {
  screenId: string;
  sessionId: string;
  clubId?: string | null;
  clubName?: string | null;
  names: [string, string];
  points: [number, number];
  innings: [number, number];
  highRuns: [number, number];
  /** Το σερί της τελευταίας στεκιάς κάθε παίκτη (ό,τι δείχνει το Live ως “run”). */
  runs?: [number, number];
  /** Το σερί που γράφεται αυτή τη στιγμή — εμφανίζεται ζωντανά πριν πατηθεί ENTER. */
  liveRuns?: [number, number];
  targetPoints?: number | null;
  active: 0 | 1;
  isPublic?: boolean;
};

/** Μία σύνδεση ανά εικονική οθόνη (τραπέζι) — όπως ακριβώς κάνει το tablet της οθόνης. */
export class DeskLivePublisher {
  private sockets = new Map<string, WebSocket>();
  private queue = new Map<string, string[]>();
  private heartbeats = new Map<string, ReturnType<typeof setInterval>>();

  /** Η φυσική οθόνη δηλώνει «παρών» με hello + heartbeat κάθε 45s — το ίδιο κάνει το desk. */
  private presence(screenId: string) {
    if (this.heartbeats.has(screenId)) return;
    const beat = () => {
      const socket = this.sockets.get(screenId);
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      try {
        socket.send(JSON.stringify({ type: "scoreboard_heartbeat", screenId }));
      } catch {
        /* ignore */
      }
    };
    const timer = setInterval(beat, 45000);
    this.heartbeats.set(screenId, timer);
  }

  private socketFor(screenId: string): WebSocket | null {
    const existing = this.sockets.get(screenId);
    if (existing && existing.readyState === WebSocket.OPEN) return existing;
    const url = buildUrl(screenId);
    if (!url) return null;
    const socket = new WebSocket(url);
    socket.onopen = () => {
      try {
        socket.send(JSON.stringify({ type: "scoreboard_hello", screenId }));
      } catch {
        /* ignore */
      }
      this.presence(screenId);
      const pending = this.queue.get(screenId) || [];
      pending.forEach((message) => {
        try {
          socket.send(message);
        } catch {
          /* η σύνδεση έκλεισε στο μεταξύ */
        }
      });
      this.queue.set(screenId, []);
    };
    this.sockets.set(screenId, socket);
    return socket;
  }

  send(state: DeskLiveState) {
    const payload = {
      type: "score:update",
      screenId: state.screenId,
      sessionId: state.sessionId,
      clientId: `desk-${state.screenId}`,
      ts: Date.now(),
      keyboardMode: "total",
      activePlayer: state.active + 1,
      isRunning: false,
      innings: Math.max(1, state.innings[0], state.innings[1]),
      isPublic: state.isPublic !== false,
      clubId: state.clubId ?? null,
      clubName: state.clubName ?? null,
      liveRun: {
        player1: state.liveRuns?.[0] ?? 0,
        player2: state.liveRuns?.[1] ?? 0,
      },
      targetPoints: state.targetPoints ?? null,
      players: [
        {
          id: 1,
          name: state.names[0],
          points: state.points[0],
          run: state.runs?.[0] ?? 0,
          innings: Math.max(1, state.innings[0]),
          hr: state.highRuns[0],
          liveRun: state.liveRuns?.[0] ?? 0,
        },
        {
          id: 2,
          name: state.names[1],
          points: state.points[1],
          run: state.runs?.[1] ?? 0,
          innings: Math.max(1, state.innings[1]),
          hr: state.highRuns[1],
          liveRun: state.liveRuns?.[1] ?? 0,
        },
      ],
    };
    const message = JSON.stringify(payload);
    const socket = this.socketFor(state.screenId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(message);
      } catch {
        this.queue.set(state.screenId, [...(this.queue.get(state.screenId) || []), message]);
      }
      return;
    }
    this.queue.set(state.screenId, [...(this.queue.get(state.screenId) || []), message].slice(-5));
  }

  close(screenId?: string) {
    if (screenId) {
      const socket = this.sockets.get(screenId);
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
      const timer = this.heartbeats.get(screenId);
      if (timer) clearInterval(timer);
      this.heartbeats.delete(screenId);
      this.sockets.delete(screenId);
      this.queue.delete(screenId);
      return;
    }
    this.sockets.forEach((socket) => {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
    });
    this.heartbeats.forEach((timer) => clearInterval(timer));
    this.heartbeats.clear();
    this.sockets.clear();
    this.queue.clear();
  }
}
