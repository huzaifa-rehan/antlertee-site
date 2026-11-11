"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { hero } from "@/content/copy";
import { detectHeroMode, type HeroMode } from "@/components/hero/capability";
import { HeroSvg } from "@/components/hero/HeroSvg";
import { clamp01, heroLayout, heroProgress, phaseAt } from "@/components/hero/store";

// three + R3F + drei live only in this chunk, fetched after hydration and only when the 3D hoodie is used.
const HeroCanvas = dynamic(() => import("@/components/hero/HeroCanvas"), { ssr: false });

/**
 * The hoodie's timeline ends here: the grey acid wash is complete (the hero scene's wash phase ends at 0.80) and the
 * garment has settled into its 3/4 turn. The "your brand" label that follows in the home hero is not used here.
 */
const END = 0.84;

const subscribeNever = () => () => {};

class CanvasBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("3D hoodie failed to start; using the 2D drawing instead.", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface ProcessHoodieProps {
  /** The tall wrapper the hoodie is pinned inside (CSS sticky): its scroll position drives the animation. */
  zoneRef: RefObject<HTMLElement | null>;
}

/**
 * The Process page hero garment: the 3D hoodie goes from a transparent ghost to the grey acid-washed garment as the
 * visitor scrolls through the pinned hero. It reuses the home hero's scene (HeroCanvas) and 2D fallback (HeroSvg),
 * both driven by `heroProgress`. Pinning is plain CSS `position: sticky`, so there is no script-built wrapper for
 * React to trip over when the page unmounts.
 */
export function ProcessHoodie({ zoneRef }: ProcessHoodieProps) {
  const detected = useSyncExternalStore<HeroMode>(subscribeNever, detectHeroMode, () => "pending");
  const [failed, setFailed] = useState(false);
  const mode: HeroMode = failed && detected === "3d" ? "svg" : detected;
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);

  const stageRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLSpanElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);

  // The scene fills this stage and centres the garment in it.
  useEffect(() => {
    heroLayout.cx = 0.5;
    heroLayout.cy = 0.5;
    heroLayout.w = 1;
    heroLayout.h = 1;
  }, []);

  // Stop rendering while the hero is offscreen (the stage stays inside the pinned zone, so this is the zone).
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const io = new IntersectionObserver(([entry]) => setActive(Boolean(entry?.isIntersecting)), { rootMargin: "120px" });
    io.observe(zone);
    return () => io.disconnect();
  }, [zoneRef]);

  // Scroll through the pinned zone -> timeline progress. Reduced motion gets the finished garment and no pin.
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone || mode === "pending") return;
    if (mode === "static") {
      heroProgress.set(END);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = zone.getBoundingClientRect();
      const run = r.height - window.innerHeight;
      heroProgress.set(END * clamp01(run > 0 ? -r.top / run : 1));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mode, zoneRef]);

  // Phase name and meter follow the progress without React re-renders.
  useEffect(() => {
    let last = -1;
    return heroProgress.subscribe((p) => {
      meterRef.current?.style.setProperty("--p", clamp01(p / END).toFixed(4));
      const i = Math.min(phaseAt(p), 2);
      if (i === last) return;
      last = i;
      const ph = hero.phases[i];
      if (nowRef.current && ph) nowRef.current.textContent = `${ph.n} ${ph.title}`;
    });
  }, []);

  return (
    <div className="tph-stage" ref={stageRef}>
      <div className="tph-glow" aria-hidden="true" />
      {mode === "3d" && (
        <div className="hero-canvas" data-ready={ready} aria-hidden="true">
          <CanvasBoundary onError={onError}>
            <HeroCanvas active={active} onReady={onReady} labelRef={labelRef} />
          </CanvasBoundary>
        </div>
      )}
      {(mode === "svg" || mode === "static") && <HeroSvg animated={mode === "svg"} />}
      {(mode === "pending" || mode === "3d") && (
        <div className="hero-poster br" data-hidden={ready} aria-hidden="true">
          <div>
            ( Threading the needle )
            <i />
          </div>
        </div>
      )}
      {mode !== "static" && (
        <div className="tph-meter br" ref={meterRef} aria-hidden="true">
          <span className="now" ref={nowRef}>
            01 Pattern &amp; cut
          </span>
          <i />
          <span className="hint">Scroll</span>
        </div>
      )}
    </div>
  );
}
