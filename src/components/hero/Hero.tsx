"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { hero } from "@/content/copy";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { detectHeroMode, type HeroMode } from "./capability";
import { HeroSvg } from "./HeroSvg";
import { heroLayout, heroProgress, phaseAt } from "./store";

// three + R3F + drei live only in this chunk, fetched after hydration and only when the 3D hero is used.
const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

const subscribeNever = () => () => {};
function useHeroMode(): HeroMode {
  return useSyncExternalStore(subscribeNever, detectHeroMode, () => "pending");
}

class CanvasBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("3D hero failed to start; using the 2D hero instead.", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * "Yarn to pack." A pinned, scroll-scrubbed hero. The scroll timeline (GSAP ScrollTrigger) is shared by
 * the 3D garment and the 2D SVG fallback through `heroProgress`.
 */
export function Hero() {
  const detected = useHeroMode();
  const [failed, setFailed] = useState(false);
  const mode: HeroMode = failed && detected === "3d" ? "svg" : detected;
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);

  const sectionRef = useRef<HTMLElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const nowRef = useRef<HTMLSpanElement>(null);
  const phasesRef = useRef<HTMLOListElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const onReady = useCallback(() => setReady(true), []);
  const onCanvasError = useCallback(() => setFailed(true), []);

  // Where the garment goes: the empty middle grid cell, measured relative to the hero.
  useEffect(() => {
    const section = sectionRef.current;
    const slot = slotRef.current;
    if (!section || !slot) return;
    const measure = () => {
      const a = section.getBoundingClientRect();
      const b = slot.getBoundingClientRect();
      if (!a.width || !a.height) return;
      heroLayout.cx = (b.left + b.width / 2 - a.left) / a.width;
      heroLayout.cy = (b.top + b.height / 2 - a.top) / a.height;
      heroLayout.w = b.width / a.width;
      heroLayout.h = b.height / a.height;
      section.style.setProperty("--gx", `${(heroLayout.cx * 100).toFixed(1)}%`);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    ro.observe(slot);
    measure();
    return () => ro.disconnect();
  }, []);

  // Stop rendering the canvas when the hero is offscreen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(([entry]) => setActive(Boolean(entry?.isIntersecting)), { rootMargin: "120px" });
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // Pin + scrub. Reduced motion ("static") gets no pin and the finished state.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || mode === "pending") return;
    if (mode === "static") {
      heroProgress.set(1);
      return;
    }
    const ctx = gsap.context(() => {
      const proxy = { p: heroProgress.get() };
      gsap.to(proxy, {
        p: 1,
        ease: "none",
        onUpdate: () => heroProgress.set(proxy.p),
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 2.6)}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          refreshPriority: 3,
          invalidateOnRefresh: true,
        },
      });
    }, section);
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [mode]);

  // Phase list, meter and percentage follow the progress without React re-renders.
  useEffect(() => {
    const items = phasesRef.current ? [...phasesRef.current.children] : [];
    let last = -1;
    return heroProgress.subscribe((p) => {
      meterRef.current?.style.setProperty("--p", p.toFixed(4));
      if (pctRef.current) pctRef.current.textContent = `${Math.round(p * 100)}%`;
      const i = mode === "static" ? hero.phases.length : phaseAt(p);
      if (i === last) return;
      last = i;
      items.forEach((li, k) => {
        const on = mode === "static" ? true : k === i;
        li.setAttribute("data-on", String(on));
        if (k === i) li.setAttribute("aria-current", "step");
        else li.removeAttribute("aria-current");
      });
      if (nowRef.current) nowRef.current.textContent = `${hero.phases[Math.min(i, 3)]?.n} ${hero.phases[Math.min(i, 3)]?.title}`;
    });
  }, [mode]);

  return (
    <section ref={sectionRef} className="hero" data-nav="dark" aria-labelledby="hero-title">
      <div className="hero-glow" aria-hidden="true" />
      {mode === "3d" && (
        <div className="hero-canvas" data-ready={ready} aria-hidden="true">
          <CanvasBoundary onError={onCanvasError}>
            <HeroCanvas active={active} onReady={onReady} labelRef={labelRef} />
          </CanvasBoundary>
        </div>
      )}

      <div className="hero-in">
        <div>
          <h1 id="hero-title" className="hero-title">
            Your name,
            <br />
            sewn in<span className="dot">.</span>
          </h1>
          <p className="hero-lede">{hero.lede}</p>
          <p className="hero-label br">
            {hero.label[0]} &nbsp; {hero.label[1]}
          </p>
          <p className="hero-tags br">
            {hero.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </p>
        </div>

        <div className="hero-slot" ref={slotRef}>
          {(mode === "svg" || mode === "static") && <HeroSvg animated={mode === "svg"} />}
          {(mode === "pending" || mode === "3d") && (
            <div className="hero-poster br" data-hidden={ready} aria-hidden="true">
              <div>
                ( Threading the needle )
                <i />
              </div>
            </div>
          )}
        </div>

        <ol className="phases" ref={phasesRef} aria-label="From yarn to pack">
          {hero.phases.map((ph, k) => (
            <li key={ph.n} data-on={k === 0}>
              <b>{ph.n}</b>
              <span>
                <strong>{ph.title}</strong>
                {ph.detail}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {mode === "3d" && (
        <div className="brand-tag" ref={labelRef} aria-hidden="true">
          <div className="brand-tag-in">
            <div className="brand-label">
              {/* A woven neck label: the Antlertee logo, standing in for the client's own. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, decorative */}
              <img src="/brand/logo-full-white.png" alt="" width={520} height={1012} />
              <small>( Your label here )</small>
            </div>
          </div>
        </div>
      )}

      {mode !== "static" && (
        <div className="meter br" ref={meterRef} aria-hidden="true">
          <span className="hint">Scroll to stitch</span>
          <span className="now" ref={nowRef}>
            01 Pattern &amp; cut
          </span>
          <i />
          <span ref={pctRef}>0%</span>
        </div>
      )}
    </section>
  );
}
