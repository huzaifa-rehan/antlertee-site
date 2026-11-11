"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Picture } from "@/components/Picture";
import { collections } from "@/content/copy";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const N = collections.length;
const SPACING = (30 * Math.PI) / 180;
const A0 = (-64 * Math.PI) / 180;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Collections orbit: pieces swing round an arc as you scroll (pinned, snapping to each piece).
 * The two-weight title wipes in, the spec card swaps and a colour band follows the active piece.
 * Under reduced motion it is not pinned; the buttons switch pieces directly.
 */
export function Orbit() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<SVGCircleElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const specRefs = useRef<(HTMLDListElement | null)[]>([]);
  const stRef = useRef<ScrollTrigger | null>(null);
  const orbit = useRef({ phase: 0 });
  const activeRef = useRef(-1);
  const goToRef = useRef<((i: number) => void) | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    const band = bandRef.current;
    const section = sectionRef.current;
    if (!stage || !band || !section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const orbitState = orbit.current;

    const layout = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const small = window.innerWidth < 860;
      const cx = small ? w * 0.08 : w * 0.05;
      const cy = small ? h * 1.5 : h * 1.32;
      const R = small ? h * 1.18 : h * 0.98;
      band.setAttribute("cx", String(cx));
      band.setAttribute("cy", String(cy));
      band.setAttribute("r", String(R));
      band.setAttribute("stroke-width", String(Math.max(80, Math.min(130, w * 0.11))));
      const C = 2 * Math.PI * R;
      const arc = C * 0.085;
      band.setAttribute("stroke-dasharray", `${arc} ${C - arc}`);
      const startA = (((A0 - Math.PI * 0.085) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      band.setAttribute("stroke-dashoffset", String(-(startA / (2 * Math.PI)) * C));
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = i - orbit.current.phase;
        const a = A0 + d * SPACING;
        const x = cx + R * Math.cos(a) - el.offsetWidth / 2;
        const y = cy + R * Math.sin(a) - el.offsetHeight / 2;
        const s = 1 - Math.min(Math.abs(d), 1.4) * 0.28;
        gsap.set(el, {
          x,
          y,
          scale: s,
          rotation: d * 9,
          opacity: Math.abs(d) > 1.6 ? 0 : 1 - Math.abs(d) * 0.35,
          zIndex: 10 - Math.round(Math.abs(d) * 3),
        });
      });
    };

    const show = (i: number) => {
      if (i === activeRef.current) return;
      const prev = activeRef.current;
      activeRef.current = i;
      setActive(i);
      gsap.to(band, { attr: { stroke: collections[i]?.accent ?? "#ffe500" }, duration: reduce ? 0 : 0.8 });
      const t = titleRefs.current;
      const s = specRefs.current;
      // overwrite: a fast scroll can pass several pieces before a delayed fade-in starts; without it the
      // late tween would bring an old title/spec back on top of the current one.
      if (prev >= 0) {
        gsap.to(t[prev] ?? [], { opacity: 0, clipPath: "inset(0 0 0 100%)", duration: reduce ? 0 : 0.35, overwrite: true });
        gsap.to(s[prev] ?? [], { opacity: 0, y: -8, duration: reduce ? 0 : 0.25, overwrite: true });
      }
      gsap.fromTo(
        t[i] ?? [],
        { opacity: 1, clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          duration: reduce ? 0 : 0.7,
          delay: prev >= 0 && !reduce ? 0.2 : 0,
          ease: "power3.out",
          overwrite: true,
        },
      );
      gsap.fromTo(
        s[i] ?? [],
        { opacity: 0, y: reduce ? 0 : 10 },
        { opacity: 1, y: 0, duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.25, overwrite: true },
      );
    };

    // Hide all titles/specs, then reveal the first.
    gsap.set(titleRefs.current, { opacity: 0 });
    gsap.set(specRefs.current, { opacity: 0 });
    band.setAttribute("stroke", collections[0]?.accent ?? "#ffe500");
    layout();
    show(0);

    const goTo = (i: number) => {
      gsap.to(orbit.current, { phase: i, duration: reduce ? 0 : 0.6, ease: "power3.out", onUpdate: layout, overwrite: true });
      show(i);
    };
    goToRef.current = goTo;

    const ro = new ResizeObserver(layout);
    ro.observe(stage);

    let st: ScrollTrigger | null = null;
    if (!reduce) {
      st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * 0.7 * (N - 1))}`,
        pin: true,
        refreshPriority: 1,
        invalidateOnRefresh: true,
        snap: { snapTo: 1 / (N - 1), duration: { min: 0.3, max: 0.7 }, ease: "power2.inOut" },
        onUpdate: (self) => {
          const target = self.progress * (N - 1);
          gsap.to(orbit.current, { phase: target, duration: 0.6, ease: "power3.out", onUpdate: layout, overwrite: true });
          show(Math.round(target));
        },
      });
      stRef.current = st;
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    }

    return () => {
      ro.disconnect();
      st?.kill();
      stRef.current = null;
      gsap.killTweensOf(orbitState);
      activeRef.current = -1;
      goToRef.current = null;
    };
  }, []);

  const select = (i: number) => {
    const st = stRef.current;
    if (st) {
      const y = st.start + (st.end - st.start) * (i / (N - 1));
      window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      goToRef.current?.(i);
    }
  };

  const current = collections[active];

  // GSAP wraps the pinned <section> in a "pin-spacer". React must own the node it later removes, so the section sits
  // inside this wrapper: on navigation React removes the wrapper (and the spacer inside it) instead of throwing
  // "removeChild: not a child of this node" and showing the error page.
  return (
    <div className="pin-host">
      <section
        ref={sectionRef}
        className="orbit"
        id="collections"
        data-nav="light"
        aria-roledescription="carousel"
        aria-labelledby="orbit-title"
      >
        <h2 id="orbit-title" className="sr-only">
          Collections
        </h2>
        <div className="orbit-in">
          <div className="stage" ref={stageRef}>
            <svg aria-hidden="true">
              <circle ref={bandRef} fill="none" strokeLinecap="round" opacity={0.28} />
            </svg>
            {collections.map((c, i) => (
              <div
                key={c.slug}
                className="o-item"
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                aria-hidden={i !== active}
              >
                <Picture id={c.image} sizes="(max-width: 860px) 40vw, 19vw" alt={i === active ? undefined : ""} />
              </div>
            ))}
          </div>
          <div className="o-copy">
            <p className="br" style={{ color: "var(--mute)" }}>
              ( {pad(active + 1)} / {pad(N)} ) &nbsp; Collections
            </p>
            <div className="o-titles" aria-live="polite">
              {collections.map((c, i) => (
                <div
                  key={c.slug}
                  className="o-title"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${N}`}
                  aria-hidden={i !== active}
                  ref={(el) => {
                    titleRefs.current[i] = el;
                  }}
                >
                  <h3>
                    <span className="t1">{c.t1}</span>
                    <span className="t2">{c.t2}</span>
                  </h3>
                </div>
              ))}
            </div>
            <div className="o-card">
              {collections.map((c, i) => (
                <dl
                  key={c.slug}
                  className="o-spec"
                  aria-hidden={i !== active}
                  ref={(el) => {
                    specRefs.current[i] = el;
                  }}
                >
                  {c.spec.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              ))}
            </div>
            <div className="o-foot">
              <div className="o-dots" role="group" aria-label="Choose a collection">
                {collections.map((c, i) => (
                  <button
                    key={c.slug}
                    type="button"
                    aria-label={`${c.t1} ${c.t2}`}
                    aria-current={i === active ? "true" : undefined}
                    onClick={() => select(i)}
                  />
                ))}
              </div>
              {current && (
                <Link className="pill" href={`/products/${current.slug}/`}>
                  View {current.t2.toLowerCase()} →
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
