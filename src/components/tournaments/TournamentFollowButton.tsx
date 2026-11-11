"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellRing, Check, Loader2, Search, X } from "lucide-react";
import {
  disablePushAlerts,
  enablePushAlerts,
  pushSupported,
  type PushSubscriptionPayload,
} from "@/lib/webPush";

/**
 * «Follow this tournament» — κουμπί στο hero της διοργάνωσης + φόρμα εγγραφής.
 *
 * Κανόνες που τηρούνται εδώ:
 * - Η εγγραφή είναι ΑΝΑ ΔΙΟΡΓΑΝΩΣΗ (ποτέ «όλο το site»): το κουμπί ζει στη σελίδα
 *   του συγκεκριμένου τουρνουά και στέλνει το `eventDocumentId` του.
 * - Ο αθλητής δηλώνεται ΠΡΟΑΙΡΕΤΙΚΑ από τη λίστα συμμετεχόντων· μόνο τότε ενεργεί
 *   η ειδοποίηση «ο επόμενος αγώνας μου».
 * - Η λίστα συμμετεχόντων φορτώνει ΜΟΝΟ όταν τη ζητήσει ο χρήστης (ελαφρύ route),
 *   όχι μαζί με τη σελίδα.
 */

type Participant = {
  documentId: string;
  name: string;
  country: string | null;
};

type FollowEventKey = "draw" | "daily" | "final" | "nextMatch";

const EVENT_OPTIONS: Array<{
  key: FollowEventKey;
  label: string;
  hint: string;
  requiresPlayer?: boolean;
}> = [
  { key: "draw", label: "Draw & schedule", hint: "When the draw or the timetable is published" },
  { key: "daily", label: "Daily recap", hint: "Every evening — what happened today and what plays tomorrow" },
  { key: "final", label: "Final standings", hint: "When the tournament is over" },
  {
    key: "nextMatch",
    label: "My next match",
    hint: "Table and time, 45 minutes before you play — and when you start",
    requiresPlayer: true,
  },
];

const DEFAULT_EVENTS: FollowEventKey[] = ["draw", "daily", "final"];

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export type TournamentFollowButtonProps = {
  eventDocumentId: string;
  tournamentTitle: string;
};

export function TournamentFollowButton({
  eventDocumentId,
  tournamentTitle,
}: TournamentFollowButtonProps) {
  const [open, setOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  return (
    <>
      <button
        type="button"
        title={following ? "You follow this tournament" : "Follow this tournament"}
        aria-label={following ? "You follow this tournament" : "Follow this tournament"}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`group relative inline-flex h-[56px] w-[56px] items-center justify-center rounded-[20px] border transition duration-200 sm:h-[62px] sm:w-[62px] ${
          following
            ? "border-white/70 bg-white text-[#0284C7] shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
            : "border-white/15 bg-white/10 text-white hover:bg-white/15"
        }`}
      >
        {following ? (
          <BellRing aria-hidden className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.7} />
        ) : (
          <Bell aria-hidden className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.7} />
        )}
        <span className="pointer-events-none absolute -bottom-11 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-slate-950/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_32px_rgba(15,23,42,0.38)] group-hover:block group-focus-visible:block">
          {following ? "Following" : "Follow"}
        </span>
      </button>

      {open ? (
        <TournamentFollowDialog
          eventDocumentId={eventDocumentId}
          tournamentTitle={tournamentTitle}
          onClose={() => setOpen(false)}
          onSubscribed={() => setFollowing(true)}
        />
      ) : null}
    </>
  );
}

type DialogProps = {
  eventDocumentId: string;
  tournamentTitle: string;
  onClose: () => void;
  onSubscribed: () => void;
};

function TournamentFollowDialog({
  eventDocumentId,
  tournamentTitle,
  onClose,
  onSubscribed,
}: DialogProps) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [events, setEvents] = useState<FollowEventKey[]>(DEFAULT_EVENTS);
  const [wantsPlayer, setWantsPlayer] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playerQuery, setPlayerQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Participant | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [successStatus, setSuccessStatus] = useState<"pending" | "already_confirmed">("pending");
  const [message, setMessage] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const loadParticipants = useCallback(async () => {
    if (participants.length > 0 || loadingPlayers) return;
    setLoadingPlayers(true);
    try {
      const response = await fetch(
        `/api/tournament-follow/participants?eventId=${encodeURIComponent(eventDocumentId)}`,
        { cache: "force-cache" },
      );
      if (response.ok) {
        const payload = (await response.json()) as { data?: Participant[] };
        setParticipants(Array.isArray(payload.data) ? payload.data : []);
      }
    } catch {
      setParticipants([]);
    } finally {
      setLoadingPlayers(false);
    }
  }, [eventDocumentId, loadingPlayers, participants.length]);

  const toggleEvent = (key: FollowEventKey) => {
    setEvents((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    );
  };

  const filteredParticipants = useMemo(() => {
    const query = normalizeForSearch(playerQuery.trim());
    if (!query) return participants.slice(0, 200);
    return participants
      .filter((participant) => normalizeForSearch(participant.name).includes(query))
      .slice(0, 200);
  }, [participants, playerQuery]);

  const choosePlayer = (participant: Participant) => {
    setSelectedPlayer(participant);
    setEvents((current) =>
      current.includes("nextMatch") ? current : [...current, "nextMatch"],
    );
  };

  const clearPlayer = () => {
    setSelectedPlayer(null);
    setEvents((current) => current.filter((value) => value !== "nextMatch"));
  };

  const activeEvents = selectedPlayer
    ? events
    : events.filter((value) => value !== "nextMatch");

  const canSubmit =
    status !== "submitting" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) &&
    activeEvents.length > 0;

  const [pushSupportedState, setPushSupportedState] = useState(false);
  const [pushState, setPushState] = useState<"idle" | "on" | "denied" | "error">("idle");
  const [pushSubscriptionPayload, setPushSubscriptionPayload] =
    useState<PushSubscriptionPayload | null>(null);

  useEffect(() => {
    setPushSupportedState(pushSupported());
  }, []);

  const handlePushToggle = async (next: boolean) => {
    if (!next) {
      setPushState("idle");
      setPushSubscriptionPayload(null);
      await disablePushAlerts();
      return;
    }
    const result = await enablePushAlerts();
    if (result.ok) {
      setPushSubscriptionPayload(result.subscription);
      setPushState("on");
      return;
    }
    setPushSubscriptionPayload(null);
    setPushState(result.reason === "denied" ? "denied" : "error");
  };

  const handleSubmit = async (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/tournament-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          eventDocumentId,
          playerDocumentId: selectedPlayer?.documentId ?? null,
          events: activeEvents,
          consent: true,
          pushSubscription: pushSubscriptionPayload,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        status?: string;
        message?: string;
        error?: string;
      };

      if (response.ok && payload.ok) {
        setSuccessStatus(payload.status === "already_confirmed" ? "already_confirmed" : "pending");
        setStatus("success");
        onSubscribed();
        return;
      }

      setStatus("error");
      setMessage(
        payload.message ||
          "We could not save your subscription. Please try again in a moment.",
      );
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again in a moment.");
    }
  };

  if (!mounted) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-dialog-title"
        className="max-h-[92vh] w-full max-w-[540px] overflow-y-auto rounded-t-[26px] border border-[#E7EBF0] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)] sm:rounded-[26px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EBF0] px-6 py-5 sm:px-8">
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#F0F9FF] text-[#0284C7]">
              <Bell aria-hidden className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h2
                id="follow-dialog-title"
                className="text-[19px] font-semibold leading-tight text-[#1F2937]"
              >
                Tournament alerts
              </h2>
              <p className="mt-1 truncate text-[13px] leading-snug text-[#64748B]">
                {tournamentTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[#94A3B8] transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X aria-hidden className="h-4.5 w-4.5" strokeWidth={2} />
          </button>
        </div>

        {status === "success" ? (
          <div className="px-6 py-10 text-center sm:px-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check aria-hidden className="h-7 w-7" strokeWidth={2.2} />
            </span>
            <h3 className="mt-5 text-[17px] font-semibold text-[#1F2937]">
              {successStatus === "already_confirmed" ? "You are already signed up" : "Almost done"}
            </h3>
            <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] leading-relaxed text-[#64748B]">
              {successStatus === "already_confirmed" ? (
                <>
                  <strong className="text-[#1F2937]">{email.trim()}</strong> already receives alerts
                  for this tournament. Nothing else to do.
                </>
              ) : (
                <>
                  We sent a confirmation link to{" "}
                  <strong className="text-[#1F2937]">{email.trim()}</strong>. Click it and you will
                  start receiving alerts for this tournament.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-[#0284C7] py-3 text-sm font-semibold text-white transition hover:bg-[#0369A1]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-6 sm:px-8">
            <label
              htmlFor="follow-email"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]"
            >
              Email
            </label>
            <input
              ref={emailRef}
              id="follow-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-2 h-11 w-full rounded-xl border border-[#E7EBF0] bg-white px-3.5 text-[15px] text-[#1F2937] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15"
            />

            <div className="mt-5 border-t border-[#E7EBF0] pt-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={wantsPlayer}
                  onChange={(changeEvent) => {
                    const next = changeEvent.target.checked;
                    setWantsPlayer(next);
                    if (next) {
                      void loadParticipants();
                    } else {
                      clearPlayer();
                    }
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
                />
                <span>
                  <span className="block text-[14px] font-semibold text-[#1F2937]">
                    I&apos;m playing in this tournament
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-[#64748B]">
                    Pick your name to also get your next match, table and time.
                  </span>
                </span>
              </label>

              {wantsPlayer ? (
                <div className="mt-3 rounded-xl border border-[#E7EBF0] bg-[#F8FAFC] p-3">
                  {selectedPlayer ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-[14px] font-semibold text-[#1F2937]">
                        <Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.4} />
                        <span className="truncate">{selectedPlayer.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={clearPlayer}
                        className="shrink-0 text-[12px] font-semibold text-[#0284C7] hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search
                          aria-hidden
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
                          strokeWidth={2}
                        />
                        <input
                          type="text"
                          value={playerQuery}
                          onChange={(changeEvent) => setPlayerQuery(changeEvent.target.value)}
                          placeholder="Search your name"
                          className="h-10 w-full rounded-lg border border-[#E7EBF0] bg-white pl-9 pr-3 text-[14px] text-[#1F2937] outline-none placeholder:text-[#94A3B8] focus:border-[#0284C7]"
                        />
                      </div>
                      <div className="mt-2 max-h-[168px] overflow-y-auto rounded-lg border border-[#E7EBF0] bg-white">
                        {loadingPlayers ? (
                          <div className="flex items-center justify-center gap-2 px-3 py-6 text-[13px] text-[#64748B]">
                            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                            Loading entrants…
                          </div>
                        ) : filteredParticipants.length === 0 ? (
                          <p className="px-3 py-6 text-center text-[13px] text-[#64748B]">
                            No entrants found.
                          </p>
                        ) : (
                          filteredParticipants.map((participant) => (
                            <button
                              key={participant.documentId}
                              type="button"
                              onClick={() => choosePlayer(participant)}
                              className="flex w-full items-center justify-between gap-3 border-b border-[#F1F5F9] px-3 py-2 text-left text-[13.5px] text-[#1F2937] transition last:border-b-0 hover:bg-[#F0F9FF]"
                            >
                              <span className="truncate">{participant.name}</span>
                              {participant.country ? (
                                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
                                  {participant.country}
                                </span>
                              ) : null}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="mt-5 border-t border-[#E7EBF0] pt-4">
              {pushSupportedState ? (
                <div className="mb-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={pushState === "on"}
                      onChange={(changeEvent) => {
                        void handlePushToggle(changeEvent.target.checked);
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
                    />
                    <span>
                      <span className="block text-[14px] font-semibold text-[#1F2937]">
                        Also notify this device
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-[#64748B]">
                        {pushState === "on"
                          ? "Notifications are on for this browser."
                          : "Instant alerts on this phone or computer, without waiting for email."}
                      </span>
                    </span>
                  </label>
                  {pushState === "denied" ? (
                    <p className="mt-1.5 pl-7 text-[12px] leading-snug text-amber-700">
                      Your browser blocked notifications. You can allow them in the site settings —
                      email alerts still work.
                    </p>
                  ) : null}
                  {pushState === "error" ? (
                    <p className="mt-1.5 pl-7 text-[12px] leading-snug text-amber-700">
                      Notifications could not be switched on in this browser. Email alerts still
                      work.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                What you&apos;ll receive
              </p>
              <div className="mt-2.5 space-y-2.5">
                {EVENT_OPTIONS.map((option) => {
                  const disabled = Boolean(option.requiresPlayer && !selectedPlayer);
                  const checked = activeEvents.includes(option.key);
                  return (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-start gap-3 ${
                        disabled ? "cursor-not-allowed opacity-45" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleEvent(option.key)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
                      />
                      <span>
                        <span className="block text-[13.5px] font-semibold text-[#1F2937]">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] leading-snug text-[#64748B]">
                          {option.hint}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {message ? (
              <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] leading-snug text-red-700">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#0284C7] py-3 text-sm font-semibold text-white transition hover:bg-[#0369A1] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Get alerts"
              )}
            </button>

            <p className="mt-3 text-center text-[11.5px] leading-relaxed text-[#94A3B8]">
              By signing up you agree to receive emails about this tournament only. We send a
              confirmation link first, and every email has a one-click unsubscribe.
            </p>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
