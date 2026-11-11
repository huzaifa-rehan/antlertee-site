import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { proof, steps } from "@/content/copy";

/** Four steps + proof numbers (dark section). */
export function ProcessProof() {
  return (
    <section className="process" data-nav="dark" id="process" aria-labelledby="process-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <h2 id="process-title" className="h-section">
          How it works<span className="dot">.</span>
        </h2>
        <Link className="pill on-dark" href="/process/">
          Process &amp; FAQs →
        </Link>
      </div>
      <ol className="steps">
        {steps.map((s, i) => (
          <Reveal as="li" className="step" key={s.n} delay={i * 0.08}>
            <b aria-hidden="true">{s.n}</b>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </Reveal>
        ))}
      </ol>
      <dl className="proof">
        {proof.map((p, i) => (
          <Reveal key={p.label} delay={i * 0.08}>
            <dt>{p.value}</dt>
            <dd>{p.label}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
