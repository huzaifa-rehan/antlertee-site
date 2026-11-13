import { ClientWorkAbout } from "@/components/home/ClientWork";
import { Picture } from "@/components/Picture";
import { QuoteCta } from "@/components/QuoteCta";
import { Reveal } from "@/components/Reveal";
import { about, capabilities } from "@/content/copy";
import { facts } from "@/content/site";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "About: a Karachi studio that builds garments, yarn to pack",
  description:
    "Antlertee Creative Studios started with a college dropout and a clothing brand and grew into its own manufacturing unit in Karachi: fabric, cut and sew, print, embroidery, washes, QC and shipping.",
  path: "/about/",
});

export default function AboutPage() {
  return (
    <>
      <section className="page-hero dark" data-nav="dark" aria-labelledby="about-title">
        <p className="br kicker">About</p>
        <h1 id="about-title" className="h-page" style={{ marginTop: 18 }}>
          Built from
          <br />
          the floor up<span className="dot">.</span>
        </h1>
        <p className="lead">{about.intro}</p>
      </section>

      <section className="section" data-nav="light" aria-labelledby="story-title">
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:gap-[6vw]">
          <div>
            <h2 id="story-title" className="br kicker">
              The story
            </h2>
            <blockquote className="mt-6">
              <p className="display text-[clamp(34px,4.4vw,68px)] leading-[0.95]">
                {about.quote[0]}{" "}
                <span className="text-mute">{about.quote[1]}</span>
              </p>
              <footer className="br mt-6 text-mute">The founder, Antlertee Creative Studios</footer>
            </blockquote>
          </div>
          <div className="prose-lg self-end">
            {about.story.map((p) => (
              <Reveal key={p}>
                <p>{p}</p>
              </Reveal>
            ))}
            <Reveal>
              <p className="display mt-10 text-[clamp(26px,2.6vw,40px)] leading-none">
                {about.quoteAfter}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section dark" data-nav="dark" aria-labelledby="cap-title">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="cap-title" className="h-section">
            Yarn to pack<span className="dot">.</span>
          </h2>
          <p className="max-w-[36ch] leading-relaxed text-mute-inv">
            One partner from fabric to finished, packed garments. No juggling multiple suppliers.
          </p>
        </div>
        <ol className="mt-[8vh] grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((c, i) => (
            <Reveal as="li" key={c.title} delay={(i % 4) * 0.06} className="border-t-[1.5px] border-white/15 pt-5">
              <span className="display block text-[44px] text-yellow" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-[22px] font-extrabold leading-[1.1] tracking-[-0.02em]">{c.title}</h3>
              <p className="mt-2 text-[14.5px] leading-normal text-mute-inv">{c.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="section" data-nav="light" aria-labelledby="floor-title">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="floor-title" className="h-section">
            {about.factory.title.replace(".", "")}
            <span className="dot">.</span>
          </h2>
          <p className="max-w-[44ch] leading-relaxed text-[#4f4a44]">{about.factory.text}</p>
        </div>
        <ul className="mt-[7vh] grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {about.factory.images.map((f, i) => (
            <Reveal as="li" key={f.image} delay={(i % 3) * 0.06}>
              <figure>
                <div className="overflow-hidden rounded-[18px] bg-paper-2">
                  <Picture id={f.image} sizes="(max-width: 768px) 46vw, 31vw" className="aspect-[3/4] w-full object-cover" />
                </div>
                <figcaption className="mt-3 text-[14px] text-mute">{f.caption}</figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
        <dl className="mt-[10vh] grid grid-cols-2 gap-5 md:grid-cols-4">
          {[
            { v: facts.brandsServed, l: "clothing brands served" },
            { v: `${facts.yearsInBusiness} yrs`, l: "building garments" },
            { v: String(facts.exportMarkets.length), l: `export markets: ${facts.exportMarkets.join(", ")}` },
            { v: "1", l: "roof: our own manufacturing unit" },
          ].map((s) => (
            <div key={s.l} className="border-t-[1.5px] border-ink/15 pt-4">
              <dt className="display text-[clamp(36px,4vw,64px)]">{s.v}</dt>
              <dd className="mt-1.5 text-[14px] text-mute">{s.l}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ClientWorkAbout />

      <QuoteCta title={"Let's build\nyour line"} />
    </>
  );
}
