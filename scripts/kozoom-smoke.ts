// Smoke test for the Kozoom live score client.
//   node --experimental-strip-types --no-warnings scripts/kozoom-smoke.ts
import {
  lookupKozoomEvents,
  fetchKozoomStreams,
  getKozoomLiveContexts,
  kozoomTableNumber,
  parseKozoomLiveMatch,
} from "../src/lib/kozoomLive.ts";

const main = async () => {
  console.log("— 1) auto-detection from our event data —");
  const candidates = await lookupKozoomEvents({
    title: "European Championship 3-Cushion U25",
    city: "Los Alcázares",
    from: "2026-10-16",
    to: "2026-10-18",
    gameId: 2,
  });
  console.log(
    "candidates:",
    candidates.map((c) => `#${c.id} ${c.eventTypeName} ${c.city} ${c.startTime?.slice(0, 10)}`),
  );
  const eventId = candidates[0]?.id;
  if (!eventId) {
    console.log("!! no candidate found");
    return;
  }

  console.log("— 2) table streams —");
  const streams = await fetchKozoomStreams(eventId);
  console.log(streams.map((s) => `${s.label ?? s.name} (${s.token})`).join(", "));

  console.log("— 3) live scores —");
  const contexts = await getKozoomLiveContexts(streams.map((s) => s.token));
  for (const stream of streams) {
    const match = parseKozoomLiveMatch(contexts.get(stream.token) ?? null);
    if (!match) {
      console.log(`  table ${kozoomTableNumber(stream)}: no live match`);
      continue;
    }
    const [a, b] = match.players;
    console.log(
      `  table ${match.tableNo ?? kozoomTableNumber(stream)}: ${match.status} | ` +
        `${a?.name ?? "?"} ${a?.score ?? 0}/${a?.innings ?? 0} (HR ${a?.bestRun ?? 0}) — ` +
        `${b?.name ?? "?"} ${b?.score ?? 0}/${b?.innings ?? 0} (HR ${b?.bestRun ?? 0}) | ` +
        `raceTo ${match.raceTo} | inning ${match.currentInningNo} | turn ${match.currentTurnPlayerSlot} | ` +
        `clock ${match.shotClock?.timeLeftSeconds ?? "-"}s`,
    );
  }
};

void main();
