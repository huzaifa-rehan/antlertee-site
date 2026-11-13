import Link from "next/link";
import { YarnToPack } from "@/components/process/YarnToPack";
import { hero } from "@/content/copy";

/** Home hero: the headline beside the auto-playing "Yarn to pack." animation (knit, cut, stitch, wash, print, pack). */
export function HomeHero() {
  return (
    <section className="pr-hero home-hero" data-nav="dark" data-snap="fit" aria-labelledby="hero-title">
      <div className="pr-hero-in">
        <div className="pr-copy">
          <p className="eyebrow">
            {hero.label[0]}, {hero.label[1]}
          </p>
          <h1 id="hero-title" className="h-page pr-title home-title">
            Yarn to
            <br />
            pack<span className="dot">.</span>
          </h1>
          <p className="pr-lead">{hero.lede}</p>
          <div className="pr-ctas">
            <Link className="pill solid lg" href="/process/#tech-pack">
              Start my collection
            </Link>
            <Link className="pill on-dark lg" href="/products/">
              Peek inside the rack
            </Link>
          </div>
          <ul className="hero-chips" aria-label="Key facts">
            {hero.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <YarnToPack />
      </div>
    </section>
  );
}
