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

const stats = [
  { v: facts.brandsServed, l: "clothing brands served" },
  { v: `${facts.yearsInBusiness} yrs`, l: "building garments" },
  { v: String(facts.exportMarkets.length), l: `export markets: ${facts.exportMarkets.join(", ")}` },
  { v: "1", l: "roof: our own manufacturing unit" },
];

/*
 * Screens, in colour order: ink hero / paper story + yellow quote strip / ink capabilities /
 * yellow strip + paper floor photos + ink stats strip / client work (two screens) / yellow call to action.
 */
export default function AboutPage() {
  return (
    <>
      <section className="page-hero dark" data-nav="dark" data-snap="fit" aria-labelledby="about-title">
        <p className="br kicker">About</p>
        <h1 id="about-title" className="h-page" style={{ marginTop: 18 }}>
          Built from
          <br />
          the floor up<span className="dot">.</span>
        </h1>
        <p className="lead">{about.intro}</p>
      </section>

      <section className="ab-story fit-bands" data-snap="fit" aria-labelledby="story-title">
        <div className="band band-paper band-main" data-nav="light">
          <div className="ab-story-grid">
            <div>
              <h2 id="story-title" className="br kicker">
                The story
              </h2>
              <blockquote className="ab-quote">
                <p>
                  {about.quote[0]} <span className="text-mute">{about.quote[1]}</span>
                </p>
                <footer className="br">The founder, Antlertee Creative Studios</footer>
              </blockquote>
            </div>
            <div className="ab-prose">
              {about.story.map((p) => (
                <Reveal key={p}>
                  <p>{p}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
        <div className="band band-yellow band-foot ab-after" data-nav="yellow">
          <p>{about.quoteAfter}</p>
        </div>
      </section>

      <section className="ab-cap fit band-ink" data-nav="dark" data-snap="fit" aria-labelledby="cap-title">
        <div className="ab-cap-head">
          <h2 id="cap-title" className="h-section">
            Yarn to pack<span className="dot">.</span>
          </h2>
          <p>One partner from fabric to finished, packed garments. No juggling multiple suppliers.</p>
        </div>
        <ol className="ab-cap-list">
          {capabilities.map((c, i) => (
            <Reveal as="li" key={c.title} delay={(i % 4) * 0.06}>
              <span className="ab-cap-n" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="ab-floor fit-bands" data-snap="fit" aria-labelledby="floor-title">
        <div className="band band-yellow band-head" data-nav="yellow">
          <h2 id="floor-title" className="h-section">
            {about.factory.title.replace(".", "")}
            <span className="dot">.</span>
          </h2>
          <p className="ab-floor-text">{about.factory.text}</p>
        </div>
        <div className="band band-paper band-main" data-nav="light">
          <ul className="ab-floor-grid">
            {about.factory.images.map((f, i) => (
              <Reveal as="li" key={f.image} delay={(i % 3) * 0.06}>
                <figure>
                  <div className="ab-floor-img">
                    <Picture id={f.image} sizes="(max-width: 768px) 30vw, 17vw" />
                  </div>
                  <figcaption>{f.caption}</figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        </div>
        <div className="band band-ink band-foot ab-stats" data-nav="dark">
          <dl>
            {stats.map((s) => (
              <div key={s.l}>
                <dt>{s.v}</dt>
                <dd>{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <ClientWorkAbout />

      <QuoteCta title={"Let's build\nyour line"} />
    </>
  );
}
