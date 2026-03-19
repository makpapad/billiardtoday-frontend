import Link from "next/link";
import { getClubs } from "@/lib/directory";

export default async function ClubsPage() {
  const clubs = await getClubs();

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Clubs
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Browse registered billiard clubs and open their dedicated pages to view related
            tournaments.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club) => (
            <article
              key={club.documentId}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]"
            >
              <div className="text-xl font-semibold tracking-tight text-slate-950">{club.name}</div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {club.federation?.name ? <div>Federation: {club.federation.name}</div> : null}
                {club.city ? <div>City: {club.city}</div> : null}
                {club.contactEmail ? <div>Email: {club.contactEmail}</div> : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/clubs/${club.slug}`}
                  className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View club
                </Link>
                <Link
                  href={`/live/${club.documentId}`}
                  className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Live
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
