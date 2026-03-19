import Link from "next/link";
import { getClubs } from "@/lib/directory";

export default async function EmbedLivePage() {
  const clubs = await getClubs();

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Embed live</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Club live directory
          </h1>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club) => (
            <article
              key={club.documentId}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]"
            >
              <div className="text-xl font-semibold tracking-tight text-slate-950">{club.name}</div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {club.federation?.name ? <div>Federation: {club.federation.name}</div> : null}
                {club.city ? <div>City: {club.city}</div> : null}
              </div>

              <div className="mt-5">
                <Link
                  href={`/embed/live/${club.documentId}`}
                  className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open embed
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
