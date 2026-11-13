import { Picture } from "@/components/Picture";
import { Reveal } from "@/components/Reveal";
import { brandLogos, hardGarments, spotify } from "@/content/clients";
import { CollabLockup } from "./CollabLockup";

/** The "Antlertee x Spotify" feature: lockup, short text and three photos of the jackets. */
function SpotifyFeature() {
  return (
    <div className="cw-spot">
      <Reveal className="cw-spot-copy">
        <p className="br kicker">Featured collab</p>
        <h2 id="cw-spot-title" className="sr-only">
          Antlertee x {spotify.title}
        </h2>
        <CollabLockup />
        <h3 className="cw-sub">{spotify.title}</h3>
        <p>{spotify.text}</p>
      </Reveal>
      <ul className="cw-spot-grid">
        {spotify.images.map((img, i) => (
          <Reveal as="li" key={img.id} delay={i * 0.08}>
            <Picture id={img.id} sizes="(max-width: 860px) 44vw, 20vw" />
          </Reveal>
        ))}
      </ul>
    </div>
  );
}

/** "Brands we work with": one tile per client logo, on the colour each logo was supplied on. */
export function BrandLogos({ headingId = "cw-brands-title" }: { headingId?: string }) {
  return (
    <div className="cw-brands">
      <h2 id={headingId} className="h-section">
        Brands we work with<span className="dot">.</span>
      </h2>
      <ul className="cw-logos">
        {brandLogos.map((b) => (
          <li key={b.file} style={{ background: b.bg }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, small client logo files */}
            <img src={`/brand/clients/${b.file}.jpg`} alt={b.name} width={b.w} height={b.h} loading="lazy" decoding="async" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A run of pieces we made for one client (Valour), with a short note on how hard they are to make. */
export function HardGarments() {
  return (
    <div className="cw-hard">
      <div className="cw-head">
        <div>
          <p className="br kicker">{hardGarments.brand}</p>
          <h2 className="h-section">
            {hardGarments.title}
            <span className="dot">.</span>
          </h2>
        </div>
        <p>{hardGarments.text}</p>
      </div>
      <ul className="cw-pieces">
        {hardGarments.pieces.map((p, i) => (
          <Reveal as="li" key={p.id} delay={i * 0.06}>
            <figure>
              <Picture id={p.id} sizes="(max-width: 860px) 44vw, 22vw" />
              <figcaption>
                <b>{p.title}</b>
                <span>{p.spec}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}

/** Home page client work: the Spotify collab and the brands we make for. */
export function ClientWork() {
  return (
    <section className="cw" data-nav="light" id="clients" aria-labelledby="cw-spot-title">
      <SpotifyFeature />
      <BrandLogos />
    </section>
  );
}

/** About page client work: the Valour pieces and the full brand wall. */
export function ClientWorkAbout() {
  return (
    <section className="cw" data-nav="light" id="clients" aria-label="Our clients">
      <HardGarments />
      <BrandLogos headingId="about-brands-title" />
    </section>
  );
}
