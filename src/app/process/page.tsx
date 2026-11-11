import Link from "next/link";
import { Faq } from "@/components/Faq";
import { Picture } from "@/components/Picture";
import { QuoteCta } from "@/components/QuoteCta";
import { YarnToPack } from "@/components/process/YarnToPack";
import { Reveal } from "@/components/Reveal";
import { TechPackSection } from "@/components/techpack/TechPackSection";
import { faqs, steps } from "@/content/copy";
import { facts } from "@/content/site";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Process, tech pack builder and FAQs: yarn to pack",
  description: `How private-label production works at Antlertee: build or send your tech pack, approve a sample, bulk production on our own floor, then QC and worldwide shipping. MOQ ${facts.moqLong}.`,
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
      <section className="pr-hero" data-nav="dark" aria-labelledby="process-title">
        <div className="pr-hero-in">
          <div className="pr-copy">
            <p className="br kicker">( Process ) &nbsp; [ Tech pack → bulk ]</p>
            <h1 id="process-title" className="h-page pr-title">
              Yarn to
              <br />
              pack<span className="dot">.</span>
            </h1>
            <p className="pr-lead">
              Pattern, stitch, wash, print and your label, all on our own floor in Karachi. Tech pack in, finished garments out.
            </p>
            <div className="pr-ctas">
              <a className="pill solid lg" href="#tech-pack">
                Start your tech pack
              </a>
              <a className="pill on-dark lg" href="#how-it-works">
                How it works
              </a>
            </div>
          </div>
          <YarnToPack />
        </div>
      </section>

      <section id="how-it-works" className="section dark pr-how" data-nav="dark" aria-labelledby="how-title">
        <div className="pr-how-head">
          <p className="br kicker">( How it works ) &nbsp; [ 4 steps ]</p>
          <h2 id="how-title" className="h-section mt-4">
            How it
            <br />
            works<span className="dot">.</span>
          </h2>
          <p className="pr-how-lead">
            Four steps from your idea to finished, labelled garments. MOQ {facts.moqLong}; typical turnaround {facts.turnaround}.
          </p>
        </div>
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
                <h3 className="display text-[clamp(36px,4.6vw,72px)] leading-[0.92]">
                  {s.title}
                  <span className="dot">.</span>
                </h3>
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

      <TechPackSection />

      <section className="section pr-faq" data-nav="light" aria-labelledby="faq-title">
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
