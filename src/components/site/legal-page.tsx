import type { Metadata } from "next";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

/** One written page (Privacy, Terms, Guidelines, Safety): a title, a short intro, a contents list and numbered sections. */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-5 pb-20 pt-12">
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Last updated {updated}
        </p>
        <h1 className="mt-2 font-heading text-[2.2rem] font-extrabold leading-tight tracking-tight sm:text-[2.8rem]">
          {title}
        </h1>
        <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-muted">{intro}</div>

        <nav aria-label="On this page" className="glass-clear mt-8 rounded-2xl p-5">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.1em]">Contents</h2>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-[14.5px] sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-ink-muted hover:text-ink">
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-h`}
              className="scroll-mt-24"
            >
              <h2
                id={`${section.id}-h`}
                className="font-heading text-[1.35rem] font-bold tracking-tight"
              >
                {index + 1}. {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-[15.5px] leading-relaxed text-ink-muted [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_b]:font-semibold [&_b]:text-ink [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function legalMetadata(title: string, description: string): Metadata {
  return { title: `${title} | StudentOS`, description };
}
