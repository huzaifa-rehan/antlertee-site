"use client";

import { useEffect, useRef } from "react";
import { statement } from "@/content/copy";
import { gsap } from "@/lib/gsap";

/** Words light up as you read. Full opacity without JS or under reduced motion. */
export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el.querySelectorAll(".w"),
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.06,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 42%", scrub: true },
        },
      );
    });
    return () => mm.revert();
  }, []);

  const words = statement.text.split(" ");
  return (
    <section className="statement" data-nav="light" aria-label="About Antlertee Creative Studios">
      <p ref={ref}>
        {words.map((w, i) => (
          <span className="w" key={`${w}-${i}`}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
      <p className="meta br">
        {statement.meta.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </p>
    </section>
  );
}
