type DocumentSection = {
  title: string;
  paragraphs: string[];
};

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  sections: DocumentSection[];
};

export function DocumentPage({ eyebrow, title, intro, updatedAt, sections }: Props) {
  return (
    <main className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            {eyebrow}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600">{intro}</p>
          <p className="mt-4 text-sm text-slate-500">Last updated: {updatedAt}</p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-700 sm:text-base">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
