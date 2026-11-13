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
    <section className="page-hero" data-nav="light" aria-labelledby="credits-title" style={{ paddingBottom: "14vh" }}>
      <p className="br kicker">Credits</p>
      <h1 id="credits-title" className="h-page" style={{ marginTop: 18 }}>
        Credits<span className="dot">.</span>
      </h1>
      <dl className="mt-[8vh] max-w-[900px]">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-3 border-t-[1.5px] border-ink/15 py-7 md:grid-cols-[220px_1fr]">
            <dt className="br text-mute">{r.label}</dt>
            <dd className="grid gap-3 text-[17px] leading-relaxed [&_a]:underline [&_a]:decoration-yellow [&_a]:decoration-2 [&_a]:underline-offset-4">
              {r.body}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
