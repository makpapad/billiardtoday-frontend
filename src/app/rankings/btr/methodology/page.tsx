import type { Metadata } from "next";
import Link from "next/link";
import { PresentationHero, SectionHeading } from "@/components/public/PresentationBlocks";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getBtrCoverageStats } from "@/lib/publicSiteData";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "How the BTR Works — Rating Method and Data Coverage",
  description:
    "Full explanation of the BilliardToday Rating: what it measures, which matches count, how much of the world it covers, why some ratings are provisional, and what the rating does not claim to be.",
  path: "/rankings/btr/methodology",
  keywords: [
    "BTR rating explained",
    "billiard rating method",
    "three cushion rating system",
    "glicko billiards",
  ],
});

const card =
  "rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8";

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{children}</h2>
);

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold text-slate-900">{children}</h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{children}</p>
);

const num = (value: number) => value.toLocaleString("en-US");

export default async function BtrMethodologyPage() {
  const coverage = await getBtrCoverageStats();
  const provisionalShare =
    coverage.ranked > 0 ? Math.round((coverage.provisional / coverage.ranked) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="BTR Rating"
        title="How the BTR works, and how far you should trust it"
        description="The BilliardToday Rating is our own rating for three-cushion players. It is not an official federation ranking. This page explains exactly what goes into it, what it measures well, and where the data is still thin — including the parts we would rather not have to admit."
        actions={[
          { label: "See the leaderboard", href: "/rankings/btr" },
          { label: "Browse players", href: "/players", variant: "secondary" },
        ]}
        meta={[
          `${num(coverage.ranked)} ranked players`,
          `${coverage.countries} countries`,
          "Three-cushion matches only",
        ]}
      />

      <section className={card}>
        <H2>The short version</H2>
        <ul className="mt-5 grid gap-3 text-sm leading-7 text-slate-600 sm:text-base">
          <li className="max-w-3xl">
            <strong className="text-slate-900">It rates three-cushion only.</strong> A player&apos;s
            results in libre, balk-line, one-cushion or five-pins are ignored completely. A player
            who mostly plays other disciplines will have a rating built on very few matches.
          </li>
          <li className="max-w-3xl">
            <strong className="text-slate-900">It uses who you played and how you played.</strong>{" "}
            Beating a strong opponent moves your rating more than beating a weak one, and winning
            with a high average is worth more than grinding out a win.
          </li>
          <li className="max-w-3xl">
            <strong className="text-slate-900">It fades when you stop playing.</strong> A rating
            fades toward the baseline while a player is inactive, so the list shows who is competing
            now rather than who was strong years ago.
          </li>
          <li className="max-w-3xl">
            <strong className="text-slate-900">The data is not evenly spread around the world.</strong>{" "}
            We hold deep domestic results for Greece and mainly international results for everyone
            else. That asymmetry is the single biggest limitation of this rating.
          </li>
          <li className="max-w-3xl">
            <strong className="text-slate-900">Uncertainty is published, not hidden.</strong> Every
            rating carries a confidence level. A number marked with an asterisk is genuinely
            provisional and should not be read as a ranking claim.
          </li>
        </ul>
      </section>

      <section className={card}>
        <H2>How a rating moves</H2>
        <div className="mt-5 grid gap-6">
          <P>
            Every match updates both players. The size of the change depends on three things: the
            result, the strength of the opponent, and how well you played.
          </P>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[20px] border border-slate-100 bg-slate-50/60 p-5">
              <H3>1. The result</H3>
              <P>
                Win, draw or loss. A three-cushion match can be drawn when the innings limit is
                reached with both players on the same points.
              </P>
            </div>
            <div className="rounded-[20px] border border-slate-100 bg-slate-50/60 p-5">
              <H3>2. The opponent</H3>
              <P>
                Beating a stronger player earns more than beating a weaker one, and losing to a
                stronger player costs less.
              </P>
            </div>
            <div className="rounded-[20px] border border-slate-100 bg-slate-50/60 p-5">
              <H3>3. Your performance</H3>
              <P>
                Your average per inning is compared with what is normal for a player at your level,
                measured over your last ten matches so a single good day changes nothing.
              </P>
            </div>
          </div>
          <div className="rounded-[20px] border border-sky-100 bg-sky-50/60 p-5">
            <H3>A worked example</H3>
            <P>
              A 1800-rated player beats an 1800-rated opponent. That is exactly what the rating
              expected, so the gain is small. The same player beats a 1400-rated opponent while
              scoring well below their usual average: the win was expected and the performance was
              poor, so the rating can actually fall. Winning is not automatically rewarded — winning
              as expected, in the way you were expected to, is.
            </P>
          </div>
          <div>
            <H3>Two things that are deliberately not part of it</H3>
            <P>
              Past titles do not count toward the rating, and neither does reputation. A former
              champion who has stopped competing loses ground to an active player. Where a match was
              played is weighted, though: a World Cup match counts more than a club match, because
              the field is stronger.
            </P>
          </div>
          <div>
            <H3>Event weighting</H3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-4 py-3">Event level</th>
                    <th className="px-4 py-3">Examples</th>
                    <th className="px-4 py-3 text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  <tr className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">World</td>
                    <td className="px-4 py-3">World Cup, World Championship</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">1.5×</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">Continental / national</td>
                    <td className="px-4 py-3">
                      European Championship, national championship, Euro Grand Prix
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">1.0×</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-900">Club / other</td>
                    <td className="px-4 py-3">Club events, open and invitational tournaments</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">0.5×</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className={card}>
        <H2>Where the results come from</H2>
        <div className="mt-5 grid gap-5">
          <P>
            The rating is only as good as the results behind it, and that is where our coverage is
            uneven. Being upfront about this matters more than the formula.
          </P>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-4 py-3">Event level</th>
                  <th className="px-4 py-3 text-right">Events</th>
                  <th className="px-4 py-3 text-right">Matches</th>
                  <th className="px-4 py-3">Where</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">World Cup</td>
                  <td className="px-4 py-3 text-right tabular-nums">78</td>
                  <td className="px-4 py-3 text-right tabular-nums">17,387</td>
                  <td className="px-4 py-3">Worldwide</td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">National championship</td>
                  <td className="px-4 py-3 text-right tabular-nums">88</td>
                  <td className="px-4 py-3 text-right tabular-nums">10,637</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-amber-700">Greece only</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">European Championship</td>
                  <td className="px-4 py-3 text-right tabular-nums">36</td>
                  <td className="px-4 py-3 text-right tabular-nums">1,650</td>
                  <td className="px-4 py-3">Worldwide</td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">World Championship</td>
                  <td className="px-4 py-3 text-right tabular-nums">27</td>
                  <td className="px-4 py-3 text-right tabular-nums">1,413</td>
                  <td className="px-4 py-3">Worldwide</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">Other rated events</td>
                  <td className="px-4 py-3 text-right tabular-nums">17</td>
                  <td className="px-4 py-3 text-right tabular-nums">1,261</td>
                  <td className="px-4 py-3">Mostly Greece and Europe</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-[20px] border border-amber-100 bg-amber-50/60 p-5">
            <H3>The asymmetry, stated plainly</H3>
            <P>
              We have nationwide domestic results for Greece and no other country. Every player
              outside Greece appears in the rating only through international events. A Greek club
              player can therefore build a rating from a hundred local matches, while a Korean or
              Turkish player of similar ability may have only a handful of World Cup appearances to
              be judged on. Their confidence levels are not comparable, and their ratings should not
              be treated as directly comparable either.
            </P>
          </div>
          <div>
            <H3>Why Greek players are not simply ranked higher</H3>
            <P>
              National matches carry the lower 1.0× weight, and they are played against a shallower
              field than a World Cup. A high domestic average still has to be earned against
              international opponents to move a player far up the table — which is why the top of
              the list is still dominated by players who compete worldwide.
            </P>
          </div>
        </div>
      </section>

      <section className={card}>
        <H2>How much to trust a number</H2>
        <div className="mt-5 grid gap-5">
          <P>
            Every rating carries an uncertainty figure, which grows when a player has few matches or
            has not played for a long time. We publish it rather than hide it, and the leaderboard
            marks the weakest cases with an asterisk.
          </P>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] border border-emerald-100 bg-emerald-50/60 p-5">
              <div className="text-2xl font-semibold tabular-nums text-emerald-800">
                {num(coverage.solid)}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">Read at face value</div>
              <P>
                Enough recent matches behind them for the number to mean what it says.
              </P>
            </div>
            <div className="rounded-[20px] border border-amber-100 bg-amber-50/60 p-5">
              <div className="text-2xl font-semibold tabular-nums text-amber-800">
                {num(coverage.provisional)}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">Still provisional</div>
              <P>
                Marked with an asterisk on the leaderboard. Shown for completeness, not as a
                ranking claim.
              </P>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/60 p-5">
              <div className="text-2xl font-semibold tabular-nums text-slate-800">
                {provisionalShare}%
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">Of all ratings</div>
              <P>
                Roughly {provisionalShare} out of every 100 numbers on the leaderboard are still
                provisional. That is the honest state of the data today.
              </P>
            </div>
          </div>
        </div>
      </section>

      <section className={card}>
        <H2>Why a rating can look wrong</H2>
        <div className="mt-5 grid gap-5">
          <div>
            <H3>Too few matches</H3>
            <P>
              A player with a handful of recorded matches can sit far from their true level in
              either direction. This is common outside Greece, where a player may only appear in
              one or two events.
            </P>
          </div>
          <div>
            <H3>Long gaps</H3>
            <P>
              Ratings fade while a player is inactive. Someone who was world class five years ago
              and has not competed since will have drifted toward the middle of the table, which is
              deliberate: we no longer know their current level.
            </P>
          </div>
          <div>
            <H3>Playing mostly other disciplines</H3>
            <P>
              Strong carom players who compete mainly in libre or balk-line will show a low
              three-cushion rating built on very few matches. That is not a judgement on their
              ability, only a statement that we have little three-cushion evidence.
            </P>
          </div>
          <div>
            <H3>Age categories</H3>
            <P>
              Junior and youth events are currently weighted the same as senior events, because the
              source records do not separate them cleanly. A young player with a strong junior
              record may therefore appear higher than their open-category results alone would
              suggest. We would rather flag this than quietly adjust it.
            </P>
          </div>
          <div>
            <H3>Countries we simply do not cover</H3>
            <P>
              Federations that do not publish results in a form we can read are invisible here,
              however strong their players are. Absence from the leaderboard usually means missing
              data, not a weak player.
            </P>
          </div>
        </div>
      </section>

      <section className={card}>
        <H2>How it gets better</H2>
        <div className="mt-5 grid gap-5">
          <P>
            Ratings mostly get more accurate on their own as players accumulate matches and as the
            gaps between their appearances shrink. Newly added events also raise the confidence of
            everyone who took part.
          </P>
          <P>
            The three things that would move the needle most are: more clubs recording their results
            in a format we can import, national federations sharing their domestic championships
            with us, and more frequent World Cup data. Two of those are outside our control, and we
            would rather say so than pretend the coverage is even.
          </P>
          <P>
            Coverage already exists in machine-readable form for some federations, so the constraint
            is integration work rather than availability. We add sources as time allows and
            recalculate the whole table afterwards, which is why ratings sometimes shift for
            everyone at once.
          </P>
        </div>
      </section>

      <section className={card}>
        <H2>What the BTR is not</H2>
        <ul className="mt-5 grid gap-3 text-sm leading-7 text-slate-600 sm:text-base">
          <li className="max-w-3xl">
            <strong className="text-slate-900">Not an official ranking.</strong> It is not
            sanctioned by the UMB, the CEB or any national federation, and it carries no seeding or
            qualification rights.
          </li>
          <li className="max-w-3xl">
            <strong className="text-slate-900">Not a measure of a career.</strong> It describes
            recent competitive form in one discipline. It says nothing about a player&apos;s record,
            titles or contribution to the sport.
          </li>
          <li className="max-w-3xl">
            <strong className="text-slate-900">Not the same as the official UMB ranking.</strong>{" "}
            The UMB rank is built on a season of World Cup results and decides entries. The BTR is
            built on everything we hold, over the whole history, and is intended to be descriptive.
          </li>
          <li className="max-w-3xl">
            <strong className="text-slate-900">Not comparable across disciplines.</strong> A strong
            BTR is a three-cushion statement and nothing more.
          </li>
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/rankings/btr"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            See the leaderboard
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
          >
            Send us results we are missing
          </Link>
        </div>
      </section>
    </div>
  );
}
