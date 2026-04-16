import type { LandingScreenshotsContent } from "@/components/landing/content";

export function Screenshots({ content }: { content: LandingScreenshotsContent }) {
  return (
    <section id="screenshots" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
            {content.eyebrow}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {content.title}
          </h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {content.items.map((item, index) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
            >
              <div className="border-b border-slate-200 bg-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
              </div>
              <div className="space-y-5 p-5">
                <div
                  className={`rounded-[24px] p-5 ${
                    index === 0
                      ? "bg-slate-950"
                      : index === 1
                        ? "bg-gradient-to-br from-slate-950 to-slate-800"
                        : "bg-gradient-to-br from-cyan-500 to-teal-400"
                  }`}
                >
                  {index === 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                        <span>Table 05</span>
                        <span>{item.tag || "Match view"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/5 p-4">
                          <div className="text-xs text-slate-400">Player A</div>
                          <div className="mt-3 text-3xl font-semibold text-white">09</div>
                        </div>
                        <div className="rounded-2xl bg-white/5 p-4">
                          <div className="text-xs text-slate-400">Player B</div>
                          <div className="mt-3 text-3xl font-semibold text-white">11</div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {index === 1 ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-white/10 p-4 text-white">
                        <div className="text-xs text-slate-300">{item.tag || "Event view"}</div>
                        <div className="mt-2 text-lg font-semibold">Tournament control panel</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/10 p-4 text-sm text-slate-200">
                          Player lists
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4 text-sm text-slate-200">
                          Table status
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {index === 2 ? (
                    <div className="space-y-3 text-slate-950">
                      <div className="rounded-2xl bg-white/80 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {item.tag || "Sponsor view"}
                        </div>
                        <div className="mt-2 text-lg font-semibold">Partner message rotation</div>
                      </div>
                      <div className="rounded-2xl bg-slate-950/10 p-4 text-sm font-medium">
                        Return to match overlay after rotation
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">{item.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
