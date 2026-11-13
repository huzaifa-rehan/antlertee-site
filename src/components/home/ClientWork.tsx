import { Picture } from "@/components/Picture";
import { Reveal } from "@/components/Reveal";
import { brandLogos, hardGarments, spotify } from "@/content/clients";
import { CollabLockup } from "./CollabLockup";

/**
 * Client work, one screen each, every screen in its own colour mix:
 * collab = ink label strip over paper, hard garments = paper strip over an ink stage, brands = yellow strip over paper.
 */

/** Home: "Antlertee x Spotify": lockup, short text and three photos of the jackets. */
export function CollabSection() {
  return (
    <section className="cw fit-bands" data-snap="fit" aria-labelledby="cw-spot-title">
      <div className="band band-ink band-head" data-nav="dark">
        <h2 id="cw-spot-title" className="h-section cw-title">
          Featured collab<span className="dot">.</span>
        </h2>
        <p className="br kicker">{spotify.title}</p>
      </div>
      <div className="band band-paper band-main" data-nav="light">
        <div className="cw-spot">
          <Reveal className="cw-spot-copy">
            <CollabLockup />
            <p>{spotify.text}</p>
          </Reveal>
          <ul className="cw-spot-grid">
            {spotify.images.map((img, i) => (
              <Reveal as="li" key={img.id} delay={i * 0.08}>
                <Picture id={img.id} sizes="(max-width: 860px) 30vw, 20vw" />
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** "Brands we work with": one tile per client logo, on the colour each logo was supplied on. */
export function BrandsSection({ headingId = "cw-brands-title" }: { headingId?: string }) {
  return (
    <section className="cw fit-bands" data-snap="fit" aria-labelledby={headingId}>
      <div className="band band-yellow band-head" data-nav="yellow">
        <h2 id={headingId} className="h-section cw-title">
          Brands we work with<span className="dot">.</span>
        </h2>
      </div>
      <div className="band band-paper band-main" data-nav="light">
        <ul className="cw-logos">
          {brandLogos.map((b) => (
            <li key={b.file} style={{ background: b.bg }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- small client logo files */}
              <img src={`/brand/clients/${b.file}.jpg`} alt={b.name} width={b.w} height={b.h} loading="lazy" decoding="async" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** About: a run of pieces we made for one client (Valour), with a short note on how hard they are to make. */
export function HardGarmentsSection() {
  return (
    <section className="cw cw-hard fit-bands" data-snap="fit" aria-labelledby="cw-hard-title">
      <div className="band band-paper band-head" data-nav="light">
        <h2 id="cw-hard-title" className="h-section cw-title">
          {hardGarments.title}
          <span className="dot">.</span>
        </h2>
        <p className="br kicker">{hardGarments.brand}</p>
      </div>
      <div className="band band-ink band-main" data-nav="dark">
        <p className="cw-hard-text">{hardGarments.text}</p>
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
    </section>
  );
}

/** Home page client work: the Spotify collab, then the brands we make for. */
export function ClientWork() {
  return (
    <>
      <CollabSection />
      <BrandsSection />
    </>
  );
}

/** About page client work: the Valour pieces, then the full brand wall. */
export function ClientWorkAbout() {
  return (
    <>
      <HardGarmentsSection />
      <BrandsSection headingId="about-brands-title" />
    </>
  );
}
