"use client";

import type Lenis from "lenis";

/** Shared Lenis instance (created by <SmoothScroll>, null under reduced motion). */
let instance: Lenis | null = null;
const listeners = new Set<(lenis: Lenis | null) => void>();

export function setLenis(lenis: Lenis | null): void {
  instance = lenis;
  listeners.forEach((fn) => fn(lenis));
}

export function getLenis(): Lenis | null {
  return instance;
}

/** Calls `fn` now and whenever the instance changes. Returns an unsubscribe function. */
export function onLenis(fn: (lenis: Lenis | null) => void): () => void {
  listeners.add(fn);
  fn(instance);
  return () => {
    listeners.delete(fn);
  };
}

/** Pause smooth scrolling (and page scroll) while a dialog is open. */
export function lockScroll(locked: boolean): void {
  if (instance) {
    if (locked) instance.stop();
    else instance.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}
