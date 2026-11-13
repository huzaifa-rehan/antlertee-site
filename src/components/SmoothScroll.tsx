"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getLenis, setLenis } from "@/lib/lenis";
import { SOFT_STOP_ENABLED, createSoftStop, type SoftStop } from "@/lib/soft-stop";
import { usePrefersReducedMotion } from "@/lib/use-media";

/** Lenis smooth scrolling for the whole site; off under prefers-reduced-motion. */
export function SmoothScroll() {
  const reduce = usePrefersReducedMotion();
  const pathname = usePathname();
  const softStop = useRef<SoftStop | null>(null);

  useEffect(() => {
    if (reduce) return;
    // lerp 0.1 trailed the wheel by about 0.4s, which read as lag; 0.16 still eases but follows the hand.
    // Fast flicks stop briefly at the next section start (src/lib/soft-stop.ts). Touch keeps native scrolling.
    const soft = SOFT_STOP_ENABLED ? createSoftStop() : null;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.16, anchors: true, virtualScroll: soft?.gate });
    soft?.attach(lenis);
    softStop.current = soft;
    setLenis(lenis);
    return () => {
      soft?.destroy();
      softStop.current = null;
      lenis.destroy();
      setLenis(null);
    };
  }, [reduce]);

  // New page: re-measure the document. (Next.js itself scrolls to the top; Lenis follows native scroll.)
  useEffect(() => {
    getLenis()?.resize();
    // The new page's sections mount after hydration: measure the section starts again once they have.
    softStop.current?.refresh();
    const t = window.setTimeout(() => softStop.current?.refresh(), 800);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}
