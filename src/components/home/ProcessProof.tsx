import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { proof, steps } from "@/content/copy";

/** Four steps on ink, with the proof numbers in a paper foot band (one screen). */
export function ProcessProof() {
  return (
    <section className="process fit-bands" data-snap="fit" id="process" aria-labelledby="process-title">
      <div className="band band-ink band-main process-main" data-nav="dark">
        <div className="process-head">
          <h2 id="process-title" className="h-section">
            How it works<span className="dot">.</span>
          </h2>
          <Link className="pill on-dark go" href="/process/">
            Peek behind the scenes
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
      </div>
      <div className="band band-paper process-proof" data-nav="light">
        <dl className="proof">
          {proof.map((p, i) => (
            <Reveal key={p.label} delay={i * 0.08}>
              <dt>{p.value}</dt>
              <dd>{p.label}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
