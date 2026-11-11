"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/use-media";

interface RailScrollerProps {
  /** Compartment name, used in the arrow labels. */
  label: string;
  /** `<li className="wd-item">` elements. */
  children: ReactNode;
}

/**
 * One brass rail of hangers. Scrolls sideways when the garments don't fit (swipe on touch,
 * trackpad, or the arrow knobs that appear on mouse devices). Keyboard focus scrolls items into view.
 */
export function RailScroller({ label, children }: RailScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const start = el.scrollLeft <= 2;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    el.addEventListener("scroll", update, { passive: true });
    // Fires once on observe, so the initial state is measured too.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div className="wd-rail" data-start={edges.start} data-end={edges.end}>
      <div ref={ref} className="wd-scroll">
        <ul className="wd-list">{children}</ul>
      </div>
      {/* Mouse helpers only: touch users swipe and keyboard focus scrolls each garment into view. */}
      <button
        type="button"
        className="wd-knob prev"
        tabIndex={-1}
        aria-hidden="true"
        hidden={edges.start}
        title={`Slide ${label} left`}
        onClick={() => scroll(-1)}
      />
      <button
        type="button"
        className="wd-knob next"
        tabIndex={-1}
        aria-hidden="true"
        hidden={edges.end}
        title={`Slide ${label} right`}
        onClick={() => scroll(1)}
      />
    </div>
  );
}
