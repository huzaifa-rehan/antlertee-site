"use client";

import { useEffect } from "react";

/** Click burst for every pill button: a ring expands from the exact point of the tap. Pure decoration, no state. */
export function ButtonFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Element)) return;
      const btn = e.target.closest<HTMLElement>(".pill, .nl-btn");
      if (!btn || btn.hasAttribute("disabled") || btn.getAttribute("aria-disabled") === "true") return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const ring = document.createElement("span");
      ring.className = "fx-ring";
      ring.setAttribute("aria-hidden", "true");
      ring.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      btn.appendChild(ring);
      ring.addEventListener("animationend", () => ring.remove(), { once: true });
      window.setTimeout(() => ring.remove(), 900);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
