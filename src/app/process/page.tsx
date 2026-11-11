import Link from "next/link";
import { Faq } from "@/components/Faq";
import { Picture } from "@/components/Picture";
import { QuoteCta } from "@/components/QuoteCta";
import { Reveal } from "@/components/Reveal";
import { faqs, steps } from "@/content/copy";
import { facts } from "@/content/site";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Process and FAQs: tech pack to sample, bulk, QC and shipping",
  description: `How private-label production works at Antlertee: send a tech pack or mockup, approve a sample, bulk production on our own floor, then QC and worldwide shipping. MOQ ${facts.moqLong}.`,
  path: "/process/",
});

export default function ProcessPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <section className="page-hero dark" data-nav="dark" aria-labelledby="process-title">
        <p className="br kicker">( Process ) &nbsp; [ Tech pack → bulk ]</p>
        <h1 id="process-title" className="h-page" style={{ marginTop: 18 }}>
          How it
          <br />
          works<span className="dot">.</span>
        </h1>
        <p className="lead">
          Four steps from your idea to finished, labelled garments. MOQ {facts.moqLong}; typical turnaround {facts.turnaround}.
        </p>
      </section>

      <section className="section dark" data-nav="dark" aria-label="Steps" style={{ paddingTop: 0 }}>
        <ol className="grid gap-[10vh]">
          {steps.map((s) => (
            <li
              key={s.n}
              className="grid items-center gap-8 border-t-[1.5px] border-white/15 pt-8 md:grid-cols-[0.5fr_1.2fr_1fr] md:gap-[4vw]"
            >
              <span className="display text-[clamp(72px,10vw,160px)] text-yellow" aria-hidden="true">
                {s.n}
              </span>
              <Reveal>
                <h2 className="display text-[clamp(36px,4.6vw,72px)] leading-[0.92]">
                  {s.title}
                  <span className="dot">.</span>
                </h2>
                <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-[#c9c4bb]">{s.detail}</p>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="mx-auto max-w-[320px] overflow-hidden rounded-[18px] bg-ink-2">
                  <Picture id={s.image} sizes="(max-width: 768px) 80vw, 24vw" className="aspect-[3/4] w-full object-cover" />
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" data-nav="light" aria-labelledby="faq-title">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.4fr] md:gap-[6vw]">
          <div>
            <p className="br kicker">( FAQs )</p>
            <h2 id="faq-title" className="h-section mt-4">
              Good
              <br />
              questions<span className="dot">.</span>
            </h2>
            <p className="mt-6 max-w-[34ch] leading-relaxed text-[#4f4a44]">
              Still unsure? <Link href="/contact/" className="font-semibold underline decoration-yellow decoration-2 underline-offset-4">Ask us directly</Link> and we will reply on WhatsApp or email.
            </p>
          </div>
          <Faq items={faqs} />
        </div>
      </section>

      <QuoteCta />
    </>
  );
}
