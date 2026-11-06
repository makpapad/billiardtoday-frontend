import Link from "next/link";
import type { TournamentSeoPlayer, TournamentSeoStage } from "@/lib/tournamentSeoServer";

/**
 * Server-rendered αποτελέσματα αγώνων ανά φάση.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: οι καρτέλες MATCHES/RANKING της σελίδας διοργάνωσης ζωγραφίζονται
 * με κλικ, οπότε στο HTML δεν υπήρχε ούτε ένα αποτέλεσμα — ο crawler έβλεπε τίτλο,
 * σύνοψη και λίστα συμμετεχόντων, αλλά κανέναν αγώνα (μετρημένο 02/11/2026: 0
 * πίνακες, 989 χαρακτήρες ορατού κειμένου στη σελίδα Yanggu).
 *
 * ΣΗΜΑΝΤΙΚΟ (Next.js): το «use client» ΔΕΝ σημαίνει client-only rendering — τα client
 * components αποδίδονται κανονικά και στον server. Αυτό που λείπει από το HTML δεν
 * είναι το directive, αλλά τα δεδομένα που φορτώνονται με `useEffect`: εκείνα δεν
 * υπάρχουν στο πρώτο HTML. Γι' αυτό τα αποτελέσματα έρχονται από εδώ, server-side.
 *
 * Ετικέτες: σύντομες (#, Grp, Inn, MP) με επεξήγηση στο title, όπως στις άλλες σελίδες.
 *
 * ΧΩΡΙΣ <details>: η πρώτη έκδοση έκλεινε κάθε φάση σε collapsed <details>, οπότε με
 * JavaScript κλειστό οι πίνακες υπήρχαν μεν στο DOM αλλά ήταν αόρατοι (μετρημένο:
 * 243 γραμμές σε 6 πίνακες, 0 ορατοί πίνακες, 0 ορατές γραμμές). Ο ιδιοκτήτης ζήτησε
 * «με JS κλειστό η σελίδα να μη φαίνεται άδεια», άρα κάθε φάση αποδίδεται ανοιχτή:
 * ένα <h3> και ο πίνακας της, χωρίς disclosure widget.
 *
 * ΣΤΗΛΕΣ: το high run μπήκε στο κελί του Inn («27/27 · HR 4/3») για να μη χρειάζεται
 * όγδοη στήλη — έτσι το min-w του πίνακα πέφτει στα 600px και δεν εμφανίζεται
 * οριζόντιο scroll σε laptop.
 *
 * ΜΕΓΕΘΟΣ HTML: 243 αγώνες σημαίνουν εκατοντάδες κελιά. Όταν κάθε <td> είχε δικό του
 * className, η σελίδα Yanggu έφτασε τα 836 KB (μετρημένο: 788 bytes/γραμμή, +695 KB
 * πάνω από το baseline των 141 KB), επειδή το Next στέλνει το δέντρο και στο RSC
 * payload. Γι' αυτό ΟΛΟ το στυλ των κελιών μπαίνει μία φορά στο <table> με arbitrary
 * variants ([&_td]:…, [&_a]:…). Μην ξαναβάλεις className σε <td>/<th>/<tr> εδώ.
 */
const formatScore = (left: number | null, right: number | null): string | null => {
  if (left === null && right === null) return null;
  return `${left ?? "-"}–${right ?? "-"}`;
};

const formatPair = (left: number | null, right: number | null): string | null => {
  if (left === null && right === null) return null;
  return `${left ?? "-"}/${right ?? "-"}`;
};

/** Inn και high run σε ένα κελί: «27/27 · HR 4/3». */
const formatInningsCell = (
  inningsLeft: number | null,
  inningsRight: number | null,
  runLeft: number | null,
  runRight: number | null,
): string | null => {
  const innings = formatPair(inningsLeft, inningsRight);
  const highRun = formatPair(runLeft, runRight);
  if (!innings && !highRun) return null;
  if (!highRun) return innings;
  if (!innings) return `HR ${highRun}`;
  return `${innings} · HR ${highRun}`;
};

/**
 * Το στυλ των κελιών μπαίνει ΜΙΑ φορά εδώ και όχι σε κάθε <td>: το markup των 243
 * γραμμών στέλνεται δύο φορές (HTML + RSC payload), άρα κάθε περιττό className
 * διπλασιάζεται σε μέγεθος σελίδας.
 */
const TABLE_CLASS = [
  "w-full min-w-[600px] border-collapse text-sm tabular-nums text-gray-600 dark:text-gray-300",
  "[&_a]:font-medium [&_a]:text-gray-900 [&_a]:underline [&_a]:decoration-dotted [&_a:hover]:text-blue-700 dark:[&_a]:text-white",
  "[&_tbody_tr]:border-t [&_tbody_tr]:border-gray-100 dark:[&_tbody_tr]:border-gray-700",
  "[&_td]:py-1.5 [&_td]:pr-2 [&_td]:align-top",
  "[&_th]:py-2 [&_th]:pr-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-normal [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-gray-500 dark:[&_th]:text-gray-400",
].join(" ");

/** Όνομα αθλητή με link στο προφίλ, αλλιώς placeholder (local_name) ή «TBD». */
const PlayerCell = ({
  player,
  fallback,
}: {
  player: TournamentSeoPlayer | null;
  fallback: string | null;
}) => {
  if (player) {
    return <Link href={player.href}>{player.name}</Link>;
  }
  return <span className="text-gray-500 dark:text-gray-400">{fallback ?? "TBD"}</span>;
};

export function TournamentResultsSection({
  stages,
  title,
}: {
  stages: TournamentSeoStage[];
  title: string;
}) {
  const withMatches = stages.filter((stage) => stage.matches.length > 0);
  if (withMatches.length === 0) return null;

  const totalMatches = withMatches.reduce((sum, stage) => sum + stage.matches.length, 0);

  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-50 px-4 pb-12 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl bg-white p-3 shadow-xl dark:bg-gray-800 sm:p-7">
          <h2 className="text-base font-semibold text-gray-950 dark:text-white">
            Match results by stage — {title}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {totalMatches} match{totalMatches === 1 ? "" : "es"} across {withMatches.length} stage
            {withMatches.length === 1 ? "" : "s"}. Every match listed below is part of the event
            schedule and shows the published score where a result exists.
          </p>

          <div className="mt-5 space-y-6">
            {withMatches.map((stage) => (
              <section key={stage.key}>
                <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
                  {stage.title}
                  <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                    ({stage.matches.length} match{stage.matches.length === 1 ? "" : "es"})
                  </span>
                </h3>
                <div className="mt-2 overflow-x-auto">
                  <table className={TABLE_CLASS}>
                    <thead>
                      <tr>
                        <th title="Match number">#</th>
                        <th title="Group">Grp</th>
                        <th>Player 1</th>
                        <th title="Score">Score</th>
                        <th>Player 2</th>
                        <th title="Innings (player 1 / player 2) · high run">Inn</th>
                        <th title="Match points (player 1 / player 2)">MP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stage.matches.map((match) => {
                        const score = formatScore(match.player1Points, match.player2Points);
                        const innings = formatInningsCell(
                          match.player1Innings,
                          match.player2Innings,
                          match.player1HighRun,
                          match.player2HighRun,
                        );
                        const matchPoints = formatPair(
                          match.player1MatchPoints,
                          match.player2MatchPoints,
                        );
                        return (
                          <tr key={match.key}>
                            <td>{match.label ?? "-"}</td>
                            <td>{match.group ?? "-"}</td>
                            <td>
                              <PlayerCell player={match.player1} fallback={match.player1Fallback} />
                            </td>
                            <td>{score ?? "–"}</td>
                            <td>
                              <PlayerCell player={match.player2} fallback={match.player2Fallback} />
                            </td>
                            <td>{innings ?? "-"}</td>
                            <td>{matchPoints ?? "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
