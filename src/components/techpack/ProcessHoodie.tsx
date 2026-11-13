"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
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

/** Seconds the hoodie takes to go from ghost to the finished wash. */
const DURATION = 9;
/** Seconds the finished garment is held before the loop fades out and starts again. */
const HOLD = 3.2;
/** Seconds of cross-fade at the end and the start of each loop. */
const FADE = 0.6;

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

/**
 * The Process page hero garment: the 3D hoodie plays by itself, in a loop, from a transparent ghost to the grey
 * acid-washed garment, holds the finished piece for a moment, fades out and starts again (no button needed). It reuses
 * the home hero's scene (HeroCanvas) and 2D fallback (HeroSvg), both driven by `heroProgress`. The clock only runs
 * while the hero is on screen, and reduced motion gets the finished garment straight away.
 */
export function ProcessHoodie() {
  const detected = useSyncExternalStore<HeroMode>(subscribeNever, detectHeroMode, () => "pending");
  const [failed, setFailed] = useState(false);
  const mode: HeroMode = failed && detected === "3d" ? "svg" : detected;
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const activeRef = useRef(true);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
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

  // Stop rendering (and the clock) while the hero is offscreen.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = Boolean(entry?.isIntersecting);
        activeRef.current = on;
        setActive(on);
      },
      { rootMargin: "120px" },
    );
    io.observe(stage);
    return () => io.disconnect();
  }, []);

  // The clock: 0 -> END over DURATION seconds, a short hold, then around again. The 3D scene waits until its first
  // frame is on screen.
  const canPlay = mode === "svg" || (mode === "3d" && ready);
  useEffect(() => {
    if (mode === "static") {
      heroProgress.set(END);
      return;
    }
    if (!canPlay) {
      heroProgress.set(0);
      return;
    }
    const CYCLE = DURATION + HOLD;
    const canvas = canvasRef.current;
    let elapsed = 0;
    let last = performance.now();
    let frame = 0;
    heroProgress.set(0);
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (activeRef.current) elapsed = (elapsed + dt) % CYCLE;
      heroProgress.set(END * clamp01(elapsed / DURATION));
      // Fade the 3D canvas out at the end of the hold and back in at the start, so the restart is not a hard cut.
      if (canvas) {
        const fadeIn = clamp01(elapsed / FADE);
        const fadeOut = clamp01((CYCLE - elapsed) / FADE);
        canvas.style.opacity = String(Math.min(fadeIn, fadeOut).toFixed(3));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (canvas) canvas.style.opacity = "";
    };
  }, [mode, canPlay]);

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
        <div className="hero-canvas" data-ready={ready} ref={canvasRef} aria-hidden="true">
          <CanvasBoundary onError={onError}>
            <HeroCanvas active={active} onReady={onReady} labelRef={labelRef} />
          </CanvasBoundary>
        </div>
      )}
      {(mode === "svg" || mode === "static") && <HeroSvg animated={mode === "svg"} />}
      {(mode === "pending" || mode === "3d") && (
        <div className="hero-poster br" data-hidden={ready} aria-hidden="true">
          <div>
            Threading the needle
            <i />
          </div>
        </div>
      )}
      {mode !== "static" && (
        <div className="tph-meter br" ref={meterRef}>
          <span className="now" ref={nowRef} aria-hidden="true">
            01 Pattern &amp; cut
          </span>
          <i aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
