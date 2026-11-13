"use client";

import { useEffect, useRef } from "react";
import { Marquee } from "@/components/Marquee";
import { marquee, statement } from "@/content/copy";
import { gsap } from "@/lib/gsap";

/**
 * The second screen, in three bands: an ink label strip (where we are), the statement on paper, and the yellow marquee.
 * Words light up as you read; the effect is tied to the section so it is complete when the section sits on screen.
 * Full opacity without JS or under reduced motion.
 */
export function Statement() {
  const sectionRef = useRef<HTMLElement>(null);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = sectionRef.current;
    if (!el || !section) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el.querySelectorAll(".w"),
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.06,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top 72%", end: "top 10%", scrub: true },
        },
      );
    });
    return () => mm.revert();
  }, []);

  const words = statement.text.split(" ");
  return (
    <section
      ref={sectionRef}
      className="statement fit-bands"
      data-snap="fit"
      aria-label="About Antlertee Creative Studios"
    >
      <div className="band band-ink band-head" data-nav="dark">
        <p className="br kicker">The studio</p>
        <p className="meta br">
          {statement.meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </p>
      </div>
      <div className="band band-paper band-main" data-nav="light">
        <p ref={ref} className="statement-text">
          {words.map((w, i) => (
            <span className="w" key={`${w}-${i}`}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
      </div>
      <Marquee items={marquee} className="band band-yellow" />
    </section>
  );
}
