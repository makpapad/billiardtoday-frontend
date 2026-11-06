import type { Metadata } from "next";
import { PlayerLetterNav, PlayerPagination } from "@/components/public/PlayersDirectoryNav";
import { PlayersDirectoryContent } from "@/components/public/PlayersDirectoryContent";
import { getPlayersTotalCount, listPlayers } from "@/lib/publicSiteData";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { SITE_URL } from "@/lib/socialMetadata";

const PLAYERS_DIRECTORY_TITLE = "Billiard Players Directory";
const PLAYERS_DIRECTORY_DESCRIPTION =
  "Search thousands of billiard player profiles on Billiard Today, with countries, clubs, tournament history, match records, averages, rankings, and performance statistics.";

const PLAYERS_DIRECTORY_KEYWORDS = [
  "billiard players",
  "billiard player profiles",
  "3 cushion players",
  "carom billiards players",
  "billiard rankings",
  "billiard tournament history",
  "Billiard Today players",
];

/**
 * Κάθε σελίδα του καταλόγου δηλώνει ΤΟΝ ΕΑΥΤΟ ΤΗΣ ως canonical.
 *
 * ΓΙΑΤΙ: πριν, όλες οι σελίδες (και οι ~22 σελίδες και τα `?letter=`) έβγαζαν
 * `canonical: /players` — δηλαδή δήλωναν «αντίγραφο της 1ης σελίδας». Ο crawler
 * ακολουθεί τα links, αλλά το σήμα έλεγε «μην ξεχωρίσεις αυτές τις σελίδες».
 */
const playersCanonicalPath = (
  params: Record<string, string | string[] | undefined>,
): `/${string}` => {
  const letter = readParam(params.letter).trim().toUpperCase().slice(0, 1);
  const parsedPage = Number.parseInt(readParam(params.page, "1"), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 1 ? parsedPage : 1;
  const query = [
    /^[A-Z]$/.test(letter) ? `letter=${letter}` : "",
    page > 1 ? `page=${page}` : "",
  ]
    .filter(Boolean)
    .join("&");
  return (query ? `/players?${query}` : "/players") as `/${string}`;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = searchParams ? await searchParams : {};
  return buildPageMetadata({
    title: PLAYERS_DIRECTORY_TITLE,
    description: PLAYERS_DIRECTORY_DESCRIPTION,
    path: playersCanonicalPath(params),
    keywords: PLAYERS_DIRECTORY_KEYWORDS,
  });
}

/**
 * Ο κατάλογος είναι πλέον σελιδοποιημένος με ΠΡΑΓΜΑΤΙΚΑ links (πριν: 150 τυχαία
 * προφίλ την ημέρα + client-side αναζήτηση, άρα ο crawler δεν είχε δρόμο προς τις
 * υπόλοιπες ~3.300 σελίδες αθλητών). Το `?letter=` δίνει ευρετήριο πρώτου γράμματος
 * και το `?page=` αριθμημένες σελίδες — και τα δύο server-rendered.
 */
const PAGE_SIZE = 150;

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const readParam = (
  value: string | string[] | undefined,
  fallback = "",
): string => {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
};

/** Πρώτο γράμμα για το ευρετήριο — χωρίς τόνους, τα ψηφία/σύμβολα μαζεύονται στο "#". */
const letterBucket = (playerLabel: string): string => {
  const firstChar = playerLabel.trim().charAt(0);
  if (!firstChar) return "#";
  const normalised = firstChar
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return /^[0-9]/.test(normalised) || !/^[A-Z\u0391-\u03a9]/.test(normalised)
    ? "#"
    : normalised;
};

export default async function PlayersPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const requestedLetter = readParam(params.letter).trim().toUpperCase().slice(0, 1);
  const requestedPage = Number.parseInt(readParam(params.page, "1"), 10);

  const [allPlayers, totalPlayers] = await Promise.all([
    listPlayers(50000),
    getPlayersTotalCount(),
  ]);

  const letters = Array.from(
    new Set(allPlayers.map((player) => letterBucket(player.fullNameEn || player.fullName))),
  ).sort((left, right) => left.localeCompare(right, "en"));

  const activeLetter = requestedLetter && letters.includes(requestedLetter) ? requestedLetter : null;
  const filtered = activeLetter
    ? allPlayers.filter(
        (player) => letterBucket(player.fullNameEn || player.fullName) === activeLetter,
      )
    : allPlayers;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(1, requestedPage), pageCount) : 1;
  const pagePlayers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Billiard Players Directory",
    url: `${SITE_URL}/players`,
    description: PLAYERS_DIRECTORY_DESCRIPTION,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: pagePlayers.length,
      itemListElement: pagePlayers.map((player, index) => ({
        "@type": "ListItem",
        position: (page - 1) * PAGE_SIZE + index + 1,
        url: `${SITE_URL}${player.href}`,
        name: player.fullNameEn || player.fullName,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemList),
        }}
      />
      <PlayersDirectoryContent players={pagePlayers} totalPlayers={totalPlayers} />
      <div className="mx-auto w-full max-w-[1320px] px-2 pb-14 sm:px-6">
        <PlayerLetterNav letters={letters} activeLetter={activeLetter} />
        <PlayerPagination page={page} pageCount={pageCount} letter={activeLetter} />
      </div>
    </>
  );
}
