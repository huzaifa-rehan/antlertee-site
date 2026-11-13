"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { detectHeroMode, type HeroMode } from "@/components/hero/capability";
import { createGhostInput, type GhostInput } from "@/components/hero/ghostInput";
import { HeroSvg } from "@/components/hero/HeroSvg";
import { usePrefersReducedMotion } from "@/lib/use-media";

// three + R3F + drei live only in this chunk, fetched after hydration and only when the 3D hoodie is used.
const GhostHoodie = dynamic(() => import("@/components/hero/GhostHoodie"), { ssr: false });

const subscribeNever = () => () => {};
/** Drag sensitivity: radians per pixel. */
const TURN = 0.011;
const TILT = 0.004;
const SLEEVE = 0.009;

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
 * The Process page hero garment: the transparent ghost hoodie, floating, that the visitor turns by dragging (mouse or
 * touch; vertical swipes still scroll the page) or with the arrow keys, with inertia, a drift back to a 3/4 pose and
 * swinging sleeves (a drag on either side grabs that sleeve). Rendering stops offscreen and in hidden tabs; reduced
 * motion drops the float and renders only on input. Without capable WebGL it shows the 2D drawing instead.
 */
export function ProcessHoodie() {
  const detected = useSyncExternalStore<HeroMode>(subscribeNever, detectHeroMode, () => "pending");
  const reduced = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);
  // Reduced motion still gets the draggable 3D hoodie (it only moves on input); ?hero=static forces the 2D still.
  const [forcedStatic] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("hero") === "static");
  const wants3d = detected === "3d" || (detected === "static" && reduced && !forcedStatic);
  const mode: HeroMode = wants3d ? (failed ? "svg" : "3d") : detected;
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<GhostInput>(createGhostInput());

  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; t: number; mode: "turn" | "sleeve" } | null>(null);

  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);

  // Stop rendering while the hero is offscreen or the tab is hidden.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let inView = true;
    const update = () => setActive(inView && !document.hidden);
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting);
        update();
      },
      { rootMargin: "120px" },
    );
    io.observe(stage);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const firstTouch = () => {
    inputRef.current.lastInput = performance.now();
    if (!touched) setTouched(true);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (e.button !== 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - box.left) / box.width;
    const fy = (e.clientY - box.top) / box.height;
    // The outer fifths at sleeve height grab that sleeve; anywhere else turns the hoodie.
    const side = fy > 0.32 && fy < 0.92 ? (fx < 0.22 ? -1 : fx > 0.78 ? 1 : 0) : 0;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, mode: side ? "sleeve" : "turn" };
    input.grab = side;
    input.grabOut = 0;
    input.grabFwd = 0;
    input.yawVel = side ? input.yawVel : 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    firstTouch();
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const dt = Math.max((e.timeStamp - d.t) / 1000, 1 / 240);
    if (d.mode === "turn") {
      input.yaw += dx * TURN;
      input.pitch = Math.max(-0.35, Math.min(0.4, input.pitch + dy * TILT));
      input.yawVel = Math.max(-6, Math.min(6, input.yawVel * 0.4 + ((dx * TURN) / dt) * 0.6));
    } else {
      // Dragging a sleeve: outward / inward with the horizontal move, forward / back with the vertical one.
      input.grabOut = Math.max(-0.35, Math.min(1.1, input.grabOut + dx * SLEEVE * input.grab));
      input.grabFwd = Math.max(-0.9, Math.min(0.9, input.grabFwd - dy * SLEEVE));
    }
    d.x = e.clientX;
    d.y = e.clientY;
    d.t = e.timeStamp;
    firstTouch();
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    input.grab = 0;
    // A drag that stopped before release should not fling.
    if (e.timeStamp - d.t > 80) input.yawVel = 0;
    input.lastInput = performance.now();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!step) return;
    e.preventDefault();
    const [h = 0, v = 0] = step;
    input.yawVel += h * 2.4;
    input.pitch = Math.max(-0.35, Math.min(0.4, input.pitch + v * 0.08));
    firstTouch();
  };

  return (
    <div className="tph-stage" ref={stageRef}>
      <div className="tph-glow" aria-hidden="true" />
      {mode === "3d" && (
        <div
          className="hero-canvas tph-ghost"
          data-ready={ready}
          role="img"
          tabIndex={0}
          aria-label="3D hoodie. Drag it, or use the arrow keys, to turn it."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={onKeyDown}
        >
          <CanvasBoundary onError={onError}>
            <GhostHoodie input={inputRef} active={active} reduced={reduced} onReady={onReady} />
          </CanvasBoundary>
        </div>
      )}
      {(mode === "svg" || mode === "static") && <HeroSvg animated={false} />}
      {(mode === "pending" || mode === "3d") && (
        <div className="hero-poster br" data-hidden={ready} aria-hidden="true">
          <div>
            Threading the needle
            <i />
          </div>
        </div>
      )}
      {mode === "3d" && (
        <p className="tph-hint br" data-hidden={touched || !ready} aria-hidden="true">
          Drag to turn it
        </p>
      )}
    </div>
  );
}
