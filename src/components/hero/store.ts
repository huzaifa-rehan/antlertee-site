"use client";

/**
 * Tiny mutable stores shared by the hero DOM, the SVG fallback and the 3D scene.
 * Values change every frame, so they live outside React state to avoid re-renders.
 */

type Listener = (value: number) => void;

function createProgress() {
  let value = 0;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(v: number) {
      value = v;
      listeners.forEach((fn) => fn(v));
    },
    subscribe(fn: Listener) {
      listeners.add(fn);
      fn(value);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

/** Scroll progress through the pinned hero, 0..1 (smoothed by GSAP scrub). */
export const heroProgress = createProgress();

/** Where the garment should sit, as fractions of the hero box (from the empty grid "slot"). */
export const heroLayout = { cx: 0.59, cy: 0.5, w: 0.38, h: 0.74 };

/** Screen-space anchor for the "YOUR BRAND" label, written by the 3D scene each frame. */
export const brandAnchor = { x: 0, y: 0, visible: false };

/** Phase boundaries on the 0..1 timeline: pattern & cut | stitch | wash | print & brand. */
export const PHASES = [0, 0.3, 0.6, 0.8] as const;

export function phaseAt(p: number): number {
  let i = 0;
  PHASES.forEach((start, k) => {
    if (p >= start) i = k;
  });
  return i;
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Maps p from [a, b] to [0, 1], clamped. */
export const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
