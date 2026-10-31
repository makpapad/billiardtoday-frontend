import { getTournamentList, type TournamentListPayload } from "@/lib/tournamentListing";

/**
 * Μικρή in-process cache για το SSR της λίστας τουρνουά.
 *
 * ΓΙΑΤΙ: το `getTournamentList` σαρώνει τα bt-events (έως 5.000 γραμμές) για να
 * φιλτράρει drafts πριν σελιδοποιήσει. Ζωντανό σε κάθε αίτημα θα πίεζε το Strapi
 * σε κάθε render του /tournaments. Τα 60 δευτερόλεπτα είναι αρκετά φρέσκα για μια
 * λίστα που αλλάζει λίγες φορές την ημέρα.
 */
const TTL_MS = 60_000;

let cache: { at: number; key: string; payload: TournamentListPayload } | null = null;

export const getTournamentListSeed = async (
  pageSize: number,
): Promise<TournamentListPayload | null> => {
  const key = `page1:${pageSize}`;
  if (cache && cache.key === key && Date.now() - cache.at < TTL_MS) {
    return cache.payload;
  }

  try {
    const payload = await getTournamentList(
      new URLSearchParams({ page: "1", pageSize: String(pageSize) }),
    );
    cache = { at: Date.now(), key, payload };
    return payload;
  } catch {
    return null;
  }
};
