import Link from "next/link";
import { getFederations } from "@/lib/directory";

export default async function EmbedFederationsPage() {
  const federations = await getFederations();

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Federations
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Embedded directory of federations, affiliated clubs and related tournaments.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {federations.map((federation) => (
            <article
              key={federation.documentId}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]"
            >
              <div className="text-xl font-semibold tracking-tight text-slate-950">
                {federation.name}
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {federation.country ? <div>Country: {federation.country}</div> : null}
                <div>Clubs: {federation.clubs?.length || 0}</div>
              </div>
              <div className="mt-5">
                <Link
                  href={`/embed/federations/${federation.slug}`}
                  className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View federation
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
