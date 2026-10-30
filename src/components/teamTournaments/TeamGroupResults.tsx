"use client";

/**
 * Αποτελέσματα ομαδικού τουρνουά.
 *
 * Κάθε αγωνιστική είναι ΕΝΑ box· μέσα του οι αγώνες ανά γραμμή, όπως πριν.
 * Όταν το τουρνουά έχει πολλούς ομίλους, το box της αγωνιστικής περιέχει ένα
 * box ανά όμιλο (κλειστό) και με κλικ στον όμιλο ανοίγουν οι αγώνες του.
 * Δεξιά μένει σταθερή η βαθμολογία, με pills ομίλων από πάνω.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  TeamMatchRow,
  isCompletedMatch,
} from "@/components/teamTournaments/TeamMatchBlock";
import type {
  ComputedStandingRow,
  NormalizedTeamMatch,
  TeamGroup,
  TeamTournamentSummary,
} from "@/lib/teamTournaments";
import type { NameVariant } from "@/lib/playerNameVariant";
import {
  buildRoundHighlights,
  buildTeamTournamentStats,
  type PlayerStatRow,
  type RoundHighlights,
  type TeamStatRow,
  type TeamTournamentStats,
} from "@/lib/teamTournamentStats";
import { TeamPlayersModal } from "@/components/teamTournaments/TeamPlayersModal";

const formatDate = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const avgText = (value: number): string => (value > 0 ? value.toFixed(3) : "—");

/** Κλειδί αγώνα — το ίδιο και στο `data-bt-match-key` της γραμμής (TeamMatchBlock). */
const matchKeyOf = (match: NormalizedTeamMatch): string =>
  match.documentId || String(match.id ?? "");

/* ------------------------------------------------------------------ */
/* «Καλύτεροι της αγωνιστικής» — κάτω από τον τελευταίο αγώνα του γύρου */
/* ------------------------------------------------------------------ */

const RoundHighlightsStrip = ({
  highlights,
  onOpenMatch,
}: {
  highlights: RoundHighlights;
  /** Κλικ σε κουτάκι → άνοιγμα της γραμμής του αγώνα όπου βγήκε το ρεκόρ. */
  onOpenMatch?: (matchKey: string) => void;
}) => {
  const { bestTeam, bestPlayer, bestRun } = highlights;
  if (!bestTeam && !bestPlayer && !bestRun) return null;

  type Item = {
    key: string;
    matchKey: string;
    label: string;
    title: string;
    name: string;
    sub: string | null;
    value: string;
    /** Χρώμα του μπλοκ: μπλε = ομάδα, πράσινο = παίκτης, κόκκινο = high run. */
    tone: string;
  };

  const items: Item[] = [
    bestTeam && {
      key: "team",
      matchKey: bestTeam.matchKey,
      label: "ΟΜΑΔΑ ΜΕ ΤΟΝ ΚΑΛΥΤΕΡΟ Μ.Ο.",
      title: "Η ομάδα με τον μεγαλύτερο μέσο όρο στην αγωνιστική — κλικ για τον αγώνα της",
      name: bestTeam.name,
      sub: null,
      value: avgText(bestTeam.avg),
      tone: "bg-blue-600 text-white",
    },
    bestPlayer && {
      key: "player",
      matchKey: bestPlayer.matchKey,
      label: "ΚΑΛΥΤΕΡΟΣ ΠΑΙΚΤΗΣ",
      title: "Ο μεγαλύτερος μέσος όρος (πόντοι ÷ στεκιές) της αγωνιστικής — κλικ για τον αγώνα του",
      name: bestPlayer.name,
      sub: bestPlayer.teamName,
      value: avgText(bestPlayer.avg),
      tone: "bg-emerald-600 text-white",
    },
    bestRun && {
      key: "run",
      matchKey: bestRun.matchKey,
      label: "ΚΑΛΥΤΕΡΟ ΣΕΡΙ",
      title: "Το μεγαλύτερο σέρι (σειρά πόντων) της αγωνιστικής — κλικ για τον αγώνα",
      name: bestRun.name,
      sub: bestRun.teamName,
      value: String(bestRun.run),
      tone: "bg-red-600 text-white",
    },
  ].filter(Boolean) as Item[];

  return (
    <div className="flex flex-wrap items-stretch gap-2 rounded-b-[18px] border-t border-slate-200 bg-slate-50/80 px-3 py-2.5">
      {items.map((item) => {
        const clickable = Boolean(onOpenMatch && item.matchKey);
        const Tag = clickable ? "button" : "div";
        return (
          <Tag
            key={item.key}
            type={clickable ? "button" : undefined}
            title={item.title}
            onClick={clickable ? () => onOpenMatch?.(item.matchKey) : undefined}
            className={clsx(
              "flex min-w-[210px] flex-1 items-stretch gap-2.5 rounded-[14px] border border-slate-200 bg-white p-2.5 pl-3 text-left",
              clickable &&
                "cursor-pointer transition hover:border-cyan-300 hover:shadow-[0_2px_10px_rgba(15,23,42,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60",
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <span className="text-[9px] font-extrabold tracking-[0.1em] text-slate-500 uppercase">
                {item.label}
              </span>
              <span className="truncate text-[12.5px] font-bold leading-tight text-slate-900">
                {item.name}
              </span>
              {item.sub ? (
                <span className="truncate text-[10.5px] leading-tight text-slate-500">{item.sub}</span>
              ) : null}
            </span>
            <span
              className={clsx(
                "flex min-w-[64px] shrink-0 items-center justify-center self-stretch rounded-[11px] border border-slate-950/75 px-2.5 text-[20px] font-extrabold leading-none tracking-tight tabular-nums",
                item.tone,
              )}
            >
              {item.value}
            </span>
          </Tag>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Βαθμολογία ομίλου (δεξιά, σταθερή)                                  */
/* ------------------------------------------------------------------ */

export function GroupStandingsPanel({
  group,
  rows,
  highlightedTeams,
  highlightedTeamIds,
  qualifyingSpots = 4,
  stats = null,
}: {
  group: TeamGroup;
  rows: ComputedStandingRow[];
  /**
   * Στατιστικά του ομαδικού (ίδια πηγή με την καρτέλα «Στατιστικά»): κλικ στο όνομα
   * ομάδας ανοίγει το modal με τους αθλητές που έχουν παίξει και τα στατιστικά τους.
   */
  stats?: TeamTournamentStats | null;
  /** Ονόματα ομάδων που παίζουν στους αγώνες που είναι τώρα στο viewport — τονίζονται. */
  highlightedTeams?: Set<string>;
  /** Ίδιο με `highlightedTeams`, αλλά με το id της ομάδας (ταίριασμα χωρίς ρίσκο ονόματος). */
  highlightedTeamIds?: Set<number>;
  /**
   * Πόσες θέσεις προκρίνονται στην τελική φάση — βάφονται πράσινες.
   * ΠΡΟΣΩΡΙΝΟ: Α1/Α2 → οι 4 πρώτοι (μέχρι να οριστεί από τη διοργάνωση).
   */
  qualifyingSpots?: number;
}) {
  /** Η ομάδα της οποίας οι αθλητές δείχνονται σε modal (null = κλειστό). */
  const [selectedTeam, setSelectedTeam] = useState<TeamStatRow | null>(null);

  /** Η γραμμή στατιστικών της ομάδας αυτής της γραμμής της βαθμολογίας (όταν έχει παίξει). */
  const statsRowFor = (row: ComputedStandingRow): TeamStatRow | null => {
    if (!stats) return null;
    return (
      stats.teams.find(
        (item) => item.groupKey === group.groupKey && item.teamName === row.teamName,
      ) ??
      stats.teams.find((item) => item.teamName === row.teamName) ??
      null
    );
  };

  const playersOf = (row: TeamStatRow): PlayerStatRow[] =>
    stats?.players.filter(
      (item) => item.groupKey === row.groupKey && item.teamName === row.teamName,
    ) ?? [];

  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white lg:flex lg:max-h-[calc(100vh-200px)] lg:flex-col">
      <div className="flex items-baseline justify-between border-b border-slate-200 px-4 pb-2.5 pt-3.5">
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-950">
          {group.title || `Όμιλος ${group.groupKey}`}
        </h3>
        <span className="text-[11px] text-slate-500">Βαθμολογία ομίλου</span>
      </div>
      <div className="min-h-0 overflow-x-auto lg:flex-1 lg:overflow-y-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-slate-50">
              <th className="w-7 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">#</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.06em]">ΟΜΑΔΑ</th>
              <th title="Αγώνες" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Α</th>
              <th title="Νίκες" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Ν</th>
              <th title="Ισοπαλίες" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Ι</th>
              <th title="Ήττες" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Η</th>
              <th title="Επιμέρους πόντοι αγώνων" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Επιμ.</th>
              <th title="Διαφορά αγώνων" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Διαφ.</th>
              <th title="Μέσος όρος" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Μ.Ο.</th>
              <th title="Βαθμοί" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Βαθ.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const diff = row.framesFor - row.framesAgainst;
              const emphasized =
                (row.teamId !== null && (highlightedTeamIds?.has(row.teamId) ?? false)) ||
                (highlightedTeams?.has(row.teamName) ?? false);
              const qualifies = index < qualifyingSpots;
              /** Η ομάδα της γραμμής, όταν υπάρχουν στατιστικά (δηλαδή έχει παίξει). */
              const teamStats = statsRowFor(row);
              return (
                <tr
                  key={row.key}
                  className={clsx(
                    "border-t border-slate-100 transition-colors duration-200",
                    emphasized ? "bg-amber-100/70" : qualifies && "bg-emerald-50/70",
                  )}
                >
                  <td
                    className={clsx(
                      "px-2 py-1.5 text-center",
                      qualifies
                        ? "font-extrabold text-emerald-700 shadow-[inset_3px_0_0_0_#10b981]"
                        : emphasized
                          ? "font-extrabold text-amber-700 shadow-[inset_2px_0_0_0_#f59e0b]"
                          : "text-slate-400",
                    )}
                  >
                    {index + 1}
                  </td>
                  <th
                    scope="row"
                    className={clsx(
                      "max-w-[190px] px-2 py-1.5 text-left text-[12px] font-bold leading-tight",
                      emphasized ? "text-slate-950" : "text-slate-900",
                    )}
                  >
                    {teamStats ? (
                      <button
                        type="button"
                        title={`Στατιστικά αθλητών: ${row.teamName}`}
                        onClick={() => setSelectedTeam(teamStats)}
                        className="cursor-pointer text-left underline decoration-slate-300 decoration-dotted underline-offset-[3px] transition hover:text-sky-700 hover:decoration-sky-500 hover:decoration-solid focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                      >
                        {row.teamName}
                      </button>
                    ) : (
                      row.teamName
                    )}
                  </th>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">{row.matchesPlayed}</td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">{row.wins}</td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">{row.draws}</td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">{row.losses}</td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">
                    {row.framesFor} – {row.framesAgainst}
                  </td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">{avgText(row.avg)}</td>
                  <td className="px-1.5 py-1.5 text-center font-extrabold text-slate-900">{row.leaguePoints}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500">
        Οι {qualifyingSpots} πρώτοι προκρίνονται στην τελική φάση.
      </div>

      {selectedTeam ? (
        <TeamPlayersModal
          team={selectedTeam}
          players={playersOf(selectedTeam)}
          onClose={() => setSelectedTeam(null)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Box ομίλου μέσα στο box της αγωνιστικής                             */
/* ------------------------------------------------------------------ */

function GroupBox({
  title,
  matches,
  summary,
}: {
  title: string;
  matches: NormalizedTeamMatch[];
  summary: TeamTournamentSummary | null;
}) {
  const [open, setOpen] = useState(false);
  const played = matches.filter(isCompletedMatch).length;

  return (
    <div className="rounded-[14px] border border-slate-200">
      {/* Κολλημένο ακριβώς κάτω από την κεφαλίδα της αγωνιστικής — σε τουρνουά με
          πολλούς ομίλους ξέρεις σε ποιον όμιλο σκρολάρεις. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="sticky top-[129px] z-10 flex w-full items-center justify-center gap-2 rounded-t-[14px] border-b border-slate-200 bg-slate-100/95 px-8 py-2 text-center backdrop-blur transition hover:bg-slate-200/90 lg:top-[144px]"
      >
        <span className="text-[12px] font-bold text-slate-900">{title}</span>
        <span className="text-[11px] font-semibold text-slate-500">
          {played}/{matches.length} αγώνες
        </span>
        <span
          className={clsx(
            "absolute right-3 text-[11px] text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>
      {open ? (
        <div>
          {matches.map((match) => (
            <TeamMatchRow key={match.documentId || String(match.id)} match={match} summary={summary} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Η ενότητα                                                           */
/* ------------------------------------------------------------------ */

export function TeamGroupResults({
  groups,
  activeGroupKey,
  onSelectGroup,
  matchesByGroupKey,
  standingsForGroup,
  summary,
  qualifyingSpots = 4,
}: {
  groups: TeamGroup[];
  /** «all» = όλοι οι όμιλοι (boxes ανά όμιλο) — αλλιώς ένας όμιλος (γραμμές ανά αγωνιστική). */
  activeGroupKey: string;
  onSelectGroup: (groupKey: string) => void;
  matchesByGroupKey: Map<string, NormalizedTeamMatch[]>;
  standingsForGroup: (group: TeamGroup) => ComputedStandingRow[];
  summary: TeamTournamentSummary | null;
  /** Πόσες θέσεις κάθε ομίλου προκρίνονται — από τη διοργάνωση (`config.qualifyPerGroup`). */
  qualifyingSpots?: number;
}) {
  const multiGroup = groups.length > 1;
  const nameVariant: NameVariant = summary?.nameVariant ?? "international";
  const biathlon = summary?.config?.mode === "biathlon";
  /** Αγώνας που ζητήθηκε από τα «καλύτερα της αγωνιστικής» — token ώστε να ξανανοίγει. */
  const [revealTarget, setRevealTarget] = useState<{ key: string; token: number } | null>(null);
  const revealTokenRef = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  /** Ο αγώνας στην κορυφή της λίστας τώρα (κάτω από τις κολλημένες κεφαλίδες). */
  const [activeMatchKey, setActiveMatchKey] = useState<string | null>(null);

  const visibleGroups = useMemo(
    () =>
      !multiGroup || activeGroupKey === "all"
        ? groups
        : groups.filter((group) => group.groupKey === activeGroupKey),
    [activeGroupKey, groups, multiGroup],
  );

  /**
   * Όλες οι αγωνιστικές — και οι παιγμένες και οι επόμενες (το πρόγραμμα υπάρχει από
   * πριν). Οι παιγμένες δίνουν αποτελέσματα/στατιστικά, οι επόμενες μόνο τα ζευγάρια.
   */
  const rounds = useMemo(() => {
    const byRound = new Map<number, Map<string, NormalizedTeamMatch[]>>();
    visibleGroups.forEach((group) => {
      (matchesByGroupKey.get(group.groupKey) ?? []).forEach((match) => {
        const round = match.round ?? 0;
        const buckets = byRound.get(round) ?? new Map<string, NormalizedTeamMatch[]>();
        const list = buckets.get(group.groupKey) ?? [];
        list.push(match);
        buckets.set(group.groupKey, list);
        byRound.set(round, buckets);
      });
    });

    return Array.from(byRound.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, buckets]) => {
        const all = Array.from(buckets.values()).flat();
        const played = all.filter(isCompletedMatch).length;
        const dates = Array.from(
          new Set(
            all.map((match) => formatDate(match.matchDate)).filter((v): v is string => Boolean(v)),
          ),
        );
        return {
          round,
          dateLabel: dates.length === 0 ? null : dates.length === 1 ? dates[0] : dates.join(" · "),
          played,
          total: all.length,
          /** Κίτρινη μπάλα = έχει παιχτεί (έστω ένας αγώνας με αποτέλεσμα). */
          hasResults: played > 0,
          buckets: Array.from(buckets.entries())
            .map(([groupKey, matches]) => ({
              groupKey,
              matches: [...matches].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
            }))
            .sort((a, b) => a.groupKey.localeCompare(b.groupKey, undefined, { numeric: true })),
        };
      });
  }, [matchesByGroupKey, visibleGroups]);

  /** Προεπιλογή: η τελευταία παιγμένη αγωνιστική — αλλιώς η πρώτη του προγράμματος. */
  const defaultRound = useMemo(() => {
    const playedRounds = rounds.filter((entry) => entry.hasResults);
    if (playedRounds.length > 0) return playedRounds[playedRounds.length - 1].round;
    return rounds.length > 0 ? rounds[0].round : null;
  }, [rounds]);

  /** Ποια αγωνιστική δείχνεται τώρα — μία τη φορά. */
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const activeRound = selectedRound ?? defaultRound;

  // Αν αλλάξει όμιλος/δεδομένα και η επιλεγμένη αγωνιστική δεν υπάρχει πια → προεπιλογή.
  useEffect(() => {
    if (selectedRound !== null && !rounds.some((entry) => entry.round === selectedRound)) {
      setSelectedRound(null);
    }
  }, [rounds, selectedRound]);

  /**
   * Ποιον αγώνα «διαβάζει» τώρα ο επισκέπτης: η πρώτη γραμμή αγώνα που έχει περάσει τη
   * γραμμή των κολλημένων κεφαλίδων (μενού + κεφαλίδα αγωνιστικής). Οι δύο ομάδες του
   * τονίζονται στη βαθμολογία δεξιά, ώστε να βλέπεις πού βρίσκονται αυτοί που κοιτάς.
   */
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    let frame = 0;

    const compute = () => {
      frame = 0;
      const rows = Array.from(
        container.querySelectorAll<HTMLElement>("[data-bt-match-key]"),
      );
      if (rows.length === 0) {
        setActiveMatchKey((prev) => (prev === null ? prev : null));
        return;
      }
      const siteHeaderHeight = Math.round(
        document.querySelector("header")?.getBoundingClientRect().height ?? 0,
      );
      const roundHeaderHeight = container.querySelector("header")?.offsetHeight ?? 0;
      const line = siteHeaderHeight + roundHeaderHeight + 4;
      const viewportBottom = window.innerHeight;
      let next: string | null = null;
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (rect.bottom <= line) continue;
        if (rect.top > viewportBottom) break;
        next = row.dataset.btMatchKey ?? null;
        break;
      }
      setActiveMatchKey((prev) => (prev === next ? prev : next));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [rounds]);

  /** Κλικ σε «καλύτερο»: άνοιγμα της γραμμής του αγώνα και κύλιση κάτω από τις κολλημένες κεφαλίδες. */
  const revealMatch = useCallback((matchKey: string) => {
    revealTokenRef.current += 1;
    setRevealTarget({ key: matchKey, token: revealTokenRef.current });
  }, []);

  useEffect(() => {
    if (!revealTarget) return;
    const container = listRef.current;
    if (!container) return;
    const node = container.querySelector<HTMLElement>(
      `[data-bt-match-key="${revealTarget.key.replace(/"/g, '\\"')}"]`,
    );
    if (!node) return;
    const timer = window.setTimeout(() => {
      const siteHeaderHeight = Math.round(
        document.querySelector("header")?.getBoundingClientRect().height ?? 0,
      );
      const roundHeaderHeight = container.querySelector("header")?.offsetHeight ?? 42;
      const top = node.getBoundingClientRect().top + window.scrollY - siteHeaderHeight - roundHeaderHeight - 2;
      window.scrollTo({ top, behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [revealTarget]);

  const teamNamesByKey = useMemo(() => {
    const map = new Map<string, string[]>();
    rounds.forEach((entry) =>
      entry.buckets.forEach((bucket) =>
        bucket.matches.forEach((match) => {
          map.set(matchKeyOf(match), [match.homeTeamName, match.awayTeamName]);
        }),
      ),
    );
    return map;
  }, [rounds]);

  /** Ταυτότητες (id) των ομάδων κάθε αγώνα — πιο ασφαλές από το όνομα για το ταίριασμα. */
  const teamIdsByKey = useMemo(() => {
    const map = new Map<string, number[]>();
    rounds.forEach((entry) =>
      entry.buckets.forEach((bucket) =>
        bucket.matches.forEach((match) => {
          map.set(
            matchKeyOf(match),
            [match.homeTeamId, match.awayTeamId].filter(
              (id): id is number => typeof id === "number",
            ),
          );
        }),
      ),
    );
    return map;
  }, [rounds]);

  /** Στατιστικά όλων των αγώνων — ίδια πηγή με την καρτέλα «Στατιστικά» του ομαδικού. */
  const stats = useMemo(
    () => buildTeamTournamentStats(Array.from(matchesByGroupKey.values()).flat(), nameVariant),
    [matchesByGroupKey, nameVariant],
  );

  const highlightedTeams = useMemo(() => {
    if (!activeMatchKey) return undefined;
    const names = teamNamesByKey.get(activeMatchKey);
    return names ? new Set(names.filter(Boolean)) : undefined;
  }, [activeMatchKey, teamNamesByKey]);

  const highlightedTeamIds = useMemo(() => {
    if (!activeMatchKey) return undefined;
    const ids = teamIdsByKey.get(activeMatchKey);
    return ids && ids.length > 0 ? new Set(ids) : undefined;
  }, [activeMatchKey, teamIdsByKey]);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)]">
      <div ref={listRef} className="flex min-w-0 flex-col gap-3.5">
        {rounds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] border border-slate-200 bg-white px-4 py-2.5">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              ΑΓΩΝΙΣΤΙΚΕΣ
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {rounds.map((entry) => {
                const isActive = entry.round === activeRound;
                return (
                  <button
                    key={entry.round}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedRound(entry.round)}
                    title={
                      entry.hasResults
                        ? `Αγωνιστική ${entry.round} — έχει παιχτεί (${entry.played}/${entry.total} αγώνες)`
                        : `Αγωνιστική ${entry.round} — δεν έχει παιχτεί ακόμη`
                    }
                    className={clsx(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11.5px] font-extrabold tabular-nums transition",
                      entry.hasResults
                        ? "bg-[#ffc000] text-slate-950 ring-1 ring-slate-950/70"
                        : "bg-slate-950 text-white ring-1 ring-slate-950/70",
                      isActive
                        ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-white"
                        : "hover:scale-105",
                    )}
                  >
                    {entry.round}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {rounds.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-4 text-[13px] text-slate-500">
            Δεν υπάρχουν ακόμη αποτελέσματα. Οι αγώνες εμφανίζονται μόλις καταχωρηθούν.
          </div>
        ) : (
          rounds
            .filter((entry) => entry.round === activeRound)
            .map((entry) => {
              const roundMatches = entry.buckets.flatMap((bucket) => bucket.matches);
            const highlights = buildRoundHighlights(roundMatches, nameVariant, { biathlon });
            return (
            <section
              key={entry.round}
              className="rounded-[18px] border border-slate-200 bg-white"
            >
              {/* Η κεφαλίδα της αγωνιστικής μένει κολλημένη κάτω από το μενού όσο
                  διαρκεί το box της — έτσι ξέρεις πάντα σε ποια αγωνιστική βρίσκεσαι
                  όταν σκρολάρεις ανοιγμένους αγώνες. Χωρίς `overflow-hidden` στο
                  section, αλλιώς το sticky δεν δουλεύει. */}
              <header className="sticky top-[89px] z-20 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-t-[18px] border-b border-slate-950/15 bg-[#ffc000] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.14)] lg:top-[104px]">
                <span className="inline-flex items-center rounded-md bg-slate-950 px-2 py-0.5 text-[11.5px] font-extrabold tracking-[0.08em] text-[#ffc000]">
                  Αγωνιστική {entry.round}
                </span>
                {entry.dateLabel ? (
                  <span className="font-semibold text-slate-900/80">{entry.dateLabel}</span>
                ) : null}
                {!entry.hasResults ? (
                  <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-slate-700">
                    ΔΕΝ ΕΧΕΙ ΠΑΙΧΤΕΙ
                  </span>
                ) : null}
                <span className="ml-auto rounded-full bg-slate-950 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-white">
                  {entry.total} {entry.total === 1 ? "αγώνας" : "αγώνες"}
                </span>
              </header>

              {multiGroup && activeGroupKey === "all" ? (
                <div className="flex flex-col gap-2 p-2.5">
                  {entry.buckets.map((bucket) => {
                    const group = groups.find((item) => item.groupKey === bucket.groupKey);
                    return (
                      <GroupBox
                        key={bucket.groupKey}
                        title={group?.title || `Όμιλος ${bucket.groupKey.replace(/^GROUP-?/i, "")}`}
                        matches={bucket.matches}
                        summary={summary}
                      />
                    );
                  })}
                </div>
              ) : (
                <div>
                  {entry.buckets.flatMap((bucket) => bucket.matches).map((match) => (
                    <TeamMatchRow
                      key={match.documentId || String(match.id)}
                      match={match}
                      summary={summary}
                      emphasized={activeMatchKey !== null && activeMatchKey === matchKeyOf(match)}
                      revealToken={
                        revealTarget && revealTarget.key === matchKeyOf(match)
                          ? revealTarget.token
                          : 0
                      }
                      roundMarks={highlights}
                    />
                  ))}
                </div>
              )}
              <RoundHighlightsStrip highlights={highlights} onOpenMatch={revealMatch} />
            </section>
            );
          })
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-[104px]">
        {multiGroup ? (
          <div className="flex flex-wrap gap-1.5 rounded-[16px] border border-slate-200 bg-white px-2.5 py-2">
            {/* Χωρίς «Όλοι οι όμιλοι»: η προβολή είναι πάντα ένας όμιλος (προεπιλογή ο 1ος). */}
            {groups.map((item) => (
              <button
                key={item.documentId || item.groupKey}
                type="button"
                onClick={() => onSelectGroup(item.groupKey)}
                aria-pressed={item.groupKey === activeGroupKey}
                className={
                  item.groupKey === activeGroupKey
                    ? "rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white transition"
                    : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 transition hover:text-slate-800"
                }
              >
                {item.title || `Όμιλος ${item.groupKey}`}
              </button>
            ))}
          </div>
        ) : null}

        {visibleGroups.map((group) => (
          <GroupStandingsPanel
            key={group.documentId || group.groupKey}
            group={group}
            rows={standingsForGroup(group)}
            highlightedTeams={highlightedTeams}
            highlightedTeamIds={highlightedTeamIds}
            qualifyingSpots={qualifyingSpots}
            stats={stats}
          />
        ))}
      </div>
    </div>
  );
}
