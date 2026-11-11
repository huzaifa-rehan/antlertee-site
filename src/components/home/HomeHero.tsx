import Link from "next/link";
import { YarnToPack } from "@/components/process/YarnToPack";
import { hero } from "@/content/copy";

/** Home hero: the headline beside the auto-playing "Yarn to pack." animation (knit, cut, stitch, wash, print, pack). */
export function HomeHero() {
  return (
    <section className="pr-hero home-hero" data-nav="dark" aria-labelledby="hero-title">
      <div className="pr-hero-in">
        <div className="pr-copy">
          <p className="br kicker">( Private-label streetwear )</p>
          <h1 id="hero-title" className="h-page pr-title home-title">
            Yarn to
            <br />
            pack<span className="dot">.</span>
          </h1>
          <p className="pr-lead">{hero.lede}</p>
          <p className="home-label br">
            {hero.label[0]} &nbsp; {hero.label[1]}
          </p>
          <p className="home-tags br">
            {hero.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </p>
          <div className="pr-ctas">
            <Link className="pill solid lg" href="/process/#tech-pack">
              Start your tech pack
            </Link>
            <Link className="pill on-dark lg" href="/products/">
              See the rack
            </Link>
          </div>
        </div>
        <YarnToPack />
      </div>
    </section>
  );
}
