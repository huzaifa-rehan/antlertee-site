"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getLenis, setLenis } from "@/lib/lenis";
import { usePrefersReducedMotion } from "@/lib/use-media";

/** Lenis smooth scrolling for the whole site; off under prefers-reduced-motion. */
export function SmoothScroll() {
  const reduce = usePrefersReducedMotion();
  const pathname = usePathname();

  useEffect(() => {
    if (reduce) return;
    // lerp 0.1 trailed the wheel by about 0.4s, which read as lag; 0.16 still eases but follows the hand.
    const lenis = new Lenis({ autoRaf: true, lerp: 0.16, anchors: true });
    setLenis(lenis);
    return () => {
      lenis.destroy();
      setLenis(null);
    };
  }, [reduce]);

  // New page: re-measure the document. (Next.js itself scrolls to the top; Lenis follows native scroll.)
  useEffect(() => {
    getLenis()?.resize();
  }, [pathname]);

  return null;
}
