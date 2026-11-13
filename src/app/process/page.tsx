import Link from "next/link";
import { Faq } from "@/components/Faq";
import { Picture } from "@/components/Picture";
import { QuoteCta } from "@/components/QuoteCta";
import { Reveal } from "@/components/Reveal";
import { TechPackSection } from "@/components/techpack/TechPackSection";
import { bulkSubsteps, faqs, steps } from "@/content/copy";
import { facts } from "@/content/site";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Process, tech pack builder and FAQs: yarn to pack",
  description: `How private-label production works at Antlertee: build or send your tech pack, approve a sample, bulk production on our own floor, then QC and worldwide shipping. MOQ ${facts.moqLong}.`,
  path: "/process/",
});

/** One tone per step screen: the page alternates ink and paper between its yellow screens. */
const TONES = ["ink", "paper", "ink", "ink"] as const;

/*
 * Screens, in colour order: ink hero (tech pack choice) / paper builder panels / yellow "how it works" opener /
 * four step screens (ink, paper, ink, ink) with the stages of bulk production as a yellow strip over paper after step 3 /
 * paper FAQ (long list) / yellow call to action.
 */
export default function ProcessPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <TechPackSection />

      <section id="how-it-works" className="hiw" aria-labelledby="how-title">
        <div className="hiw-intro fit band-yellow" data-nav="yellow" data-snap="fit">
          <p className="br kicker">How it works</p>
          <h2 id="how-title" className="h-page hiw-big">
            How it
            <br />
            works<span className="dot">.</span>
          </h2>
          <p className="hiw-lead">
            Four steps from your idea to finished, labelled garments. MOQ {facts.moqLong}; typical turnaround {facts.turnaround}.
          </p>
        </div>

        {steps.map((s, i) => {
          const tone = TONES[i] ?? "ink";
          return (
            <div key={s.n}>
              <section
                className={`hiw-step fit band-${tone}`}
                data-nav={tone === "ink" ? "dark" : "light"}
                data-snap="fit"
                aria-labelledby={`step-${s.n}`}
              >
                <div className="hiw-grid">
                  <span className="hiw-n" aria-hidden="true">
                    {s.n}
                  </span>
                  <Reveal className="hiw-copy">
                    <h3 id={`step-${s.n}`} className="hiw-title">
                      {s.title}
                      <span className="dot">.</span>
                    </h3>
                    <p>{s.detail}</p>
                  </Reveal>
                  <Reveal delay={0.1} className="hiw-pic">
                    <Picture id={s.image} sizes="(max-width: 768px) 60vw, 24vw" />
                  </Reveal>
                </div>
              </section>

              {s.substeps && (
                <section className="hiw-sub fit-bands" data-snap="fit" aria-labelledby="stages-title">
                  <div className="band band-yellow band-head" data-nav="yellow">
                    <h3 id="stages-title" className="hiw-sub-title">
                      Inside bulk production<span className="dot">.</span>
                    </h3>
                    <p className="br">{bulkSubsteps.length} stages, all in house</p>
                  </div>
                  <div className="band band-paper band-main" data-nav="light">
                    <ol className="hiw-stages" aria-label={`${s.title}: stages`}>
                      {s.substeps.map((sub, k) => (
                        <li key={sub.title}>
                          <b aria-hidden="true">
                            {s.n}.{k + 1}
                          </b>
                          <strong>{sub.title}</strong>
                          <span>{sub.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              )}
            </div>
          );
        })}
      </section>

      <section className="section pg-faq" data-nav="light" aria-labelledby="faq-title">
        <div className="faq-grid">
          <div className="faq-side">
            <p className="br kicker">FAQs</p>
            <h2 id="faq-title" className="h-section mt-4">
              Good
              <br />
              questions<span className="dot">.</span>
            </h2>
            <p className="mt-6 max-w-[34ch] leading-relaxed text-[#4f4a44]">
              Still unsure?{" "}
              <Link href="/contact/" className="font-semibold underline decoration-yellow decoration-2 underline-offset-4">
                Ask us directly
              </Link>{" "}
              and we will reply on WhatsApp or email.
            </p>
          </div>
          <Faq items={faqs} />
        </div>
      </section>

      <QuoteCta />
    </>
  );
}
