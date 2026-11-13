import { modelCredit } from "@/content/credits";
import { contact } from "@/content/site";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Credits",
  description: "Credits and licences for the 3D model, typefaces, imagery and open-source software used on this website.",
  path: "/credits/",
});

const rows: { label: string; body: React.ReactNode }[] = [
  {
    label: "3D model",
    body: (
      <>
        <p>
          <strong>{modelCredit.title}</strong> by{" "}
          <a href={modelCredit.authorUrl} target="_blank" rel="noopener noreferrer">
            {modelCredit.author} (sketchfab.com/krrril_)
          </a>
          , licensed under{" "}
          <a href={modelCredit.licenseUrl} target="_blank" rel="noopener noreferrer">
            {modelCredit.license}
          </a>
          .
        </p>
        <p>Changes: {modelCredit.changes}</p>
      </>
    ),
  },
  {
    label: "Typefaces",
    body: (
      <p>
        Gabarito (display) and Onest (body), both under the SIL Open Font License 1.1, served with the site via
        next/font.
      </p>
    ),
  },
  {
    label: "Photography",
    body: (
      <p>
        Product and factory photos are Antlertee Creative Studios&apos; own, from{" "}
        <a href={contact.instagram} target="_blank" rel="noopener noreferrer">
          {contact.instagramHandle}
        </a>
        .
      </p>
    ),
  },
  {
    label: "Software",
    body: (
      <p>
        Built with Next.js, React, Tailwind CSS, Motion, GSAP with ScrollTrigger, Lenis, three.js, React Three Fiber
        and drei.
      </p>
    ),
  },
];

export default function CreditsPage() {
  return (
    <section className="cr fit-bands" data-snap="fit" aria-labelledby="credits-title">
      <div className="band band-ink band-head is-first" data-nav="dark">
        <h1 id="credits-title" className="h-section cr-title">
          Credits<span className="dot">.</span>
        </h1>
        <p className="br kicker">Model, typefaces, photos, software</p>
      </div>
      <div className="band band-paper band-main" data-nav="light">
        <dl className="cr-list">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="br">{r.label}</dt>
              <dd>{r.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
