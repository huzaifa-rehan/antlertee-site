"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { heroProgress } from "./store";

const SEAMS = [
  "M140 120 Q170 108 200 138 Q230 108 260 120",
  "M120 122 Q102 162 116 230",
  "M280 122 Q298 162 284 230",
  "M102 152 L54 326",
  "M298 152 L346 326",
  "M146 297 L254 297 L268 345 L132 345 Z",
  "M104 376 L296 376",
  "M52 337 L92 343",
  "M348 337 L308 343",
];

/** Washed fabric colour: grey acid wash, so the garment stays visible on the ink hero. */
const ACID_GREY = "#76746f";

const SCATTER: Record<string, gsap.TweenVars> = {
  hood: { x: -40, y: -150, rotation: -38 },
  slL: { x: -230, y: 30, rotation: -55 },
  slR: { x: 230, y: 50, rotation: 48 },
  pocket: { x: 170, y: 150, rotation: 28 },
  band: { x: -150, y: 170, rotation: -18 },
  cufL: { x: -200, y: 140, rotation: 70 },
  cufR: { x: 200, y: 150, rotation: -60 },
  body: { x: 10, y: 30, rotation: 5, scale: 0.92 },
};

/**
 * 2D hero fallback (reduced motion, no WebGL, low-end devices): pattern pieces fly together,
 * seams stitch in yellow thread, the garment is acid-washed, then "YOUR BRAND" prints on.
 * In "static" mode it renders the finished garment with no animation.
 */
export function HeroSvg({ animated }: { animated: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const q = gsap.utils.selector(svg);
    const ctx = gsap.context(() => {
      const masks = q(".seam-mask");
      if (!animated) {
        gsap.set(masks, { attr: { "stroke-dashoffset": 0 } });
        gsap.set(q(".wash"), { opacity: 0.5 });
        gsap.set(svg, { "--fabric": ACID_GREY });
        gsap.set(q(".print"), { opacity: 1 });
        return;
      }
      Object.entries(SCATTER).forEach(([id, v]) =>
        gsap.set(q(`[data-piece="${id}"]`), { ...v, transformOrigin: "50% 50%", opacity: 0.9 }),
      );
      gsap.set(q(".grainfx"), { opacity: 0 });
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
      tl.to(q("[data-piece]"), { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 3.4, stagger: 0.12 }, 0)
        .to(q(".grainfx"), { opacity: 0.9, duration: 1 }, 2.6)
        .to(masks, { attr: { "stroke-dashoffset": 0 }, duration: 1.2, stagger: 0.35 }, 3.8)
        .to(svg, { "--fabric": ACID_GREY, duration: 1.6 }, 7.2)
        .to(q(".wash"), { opacity: 0.5, duration: 1.6 }, 7.4)
        .fromTo(
          q(".print"),
          { opacity: 0, scale: 1.35, transformOrigin: "50% 50%" },
          { opacity: 1, scale: 1, duration: 0.9, ease: "back.out(2)" },
          9,
        )
        .to({}, { duration: 0.8 });
      const unsubscribe = heroProgress.subscribe((p) => tl.progress(p));
      return () => unsubscribe();
    }, svg);
    return () => ctx.revert();
  }, [animated]);

  return (
    <svg
      ref={svgRef}
      className="garment"
      viewBox="0 0 400 440"
      role="img"
      aria-label="A hoodie whose pattern pieces come together, get stitched, washed and printed with your brand"
    >
      <defs>
        <filter id="hs-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .18 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="hs-acid" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="5" seed="8" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -9 5.2" />
        </filter>
        <clipPath id="hs-clip">
          <path d="M140 120 Q140 40 200 36 Q260 40 260 120 Z" />
          <path d="M120 120 L280 120 L300 150 L300 380 L100 380 L100 150 Z" />
          <path d="M100 150 L48 330 L94 338 L118 232 Z" />
          <path d="M300 150 L352 330 L306 338 L282 232 Z" />
          <rect x="102" y="372" width="196" height="24" rx="3" />
        </clipPath>
        {SEAMS.map((d, i) => (
          <mask id={`hs-m${i}`} key={d} maskUnits="userSpaceOnUse">
            <path
              className="seam-mask"
              d={d}
              stroke="#fff"
              strokeWidth={5}
              fill="none"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1}
            />
          </mask>
        ))}
      </defs>
      <g>
        <path className="piece" data-piece="slL" d="M100 150 L48 330 Q46 340 56 342 L88 347 Q96 348 98 340 L118 232 Z" />
        <path className="piece" data-piece="slR" d="M300 150 L352 330 Q354 340 344 342 L312 347 Q304 348 302 340 L282 232 Z" />
        <path className="piece" data-piece="body" d="M120 120 L280 120 L300 150 L300 380 L100 380 L100 150 Z" />
        <path className="piece" data-piece="hood" d="M140 120 Q140 40 200 36 Q260 40 260 120 Q230 106 200 138 Q170 106 140 120 Z" />
        <path className="piece" data-piece="pocket" d="M142 292 L258 292 L274 350 L126 350 Z" />
        <rect className="piece" data-piece="band" x="102" y="372" width="196" height="24" rx="3" />
        <rect className="piece" data-piece="cufL" x="44" y="334" width="50" height="16" rx="3" transform="rotate(8 69 342)" />
        <rect className="piece" data-piece="cufR" x="306" y="334" width="50" height="16" rx="3" transform="rotate(-8 331 342)" />
      </g>
      <rect className="grainfx" x="0" y="0" width="400" height="440" filter="url(#hs-grain)" clipPath="url(#hs-clip)" fill="#000" opacity=".9" />
      <rect className="wash" x="0" y="0" width="400" height="440" filter="url(#hs-acid)" clipPath="url(#hs-clip)" opacity="0" />
      <g>
        {SEAMS.map((d, i) => (
          <path key={d} className="seam" d={d} mask={`url(#hs-m${i})`} />
        ))}
      </g>
      <g className="print" opacity="0">
        <text x="200" y="214" textAnchor="middle" fontFamily="var(--font-gabarito), Arial Black" fontWeight="900" fontSize="34" letterSpacing="-1.5" fill="#ffe500">
          YOUR
        </text>
        <text x="200" y="248" textAnchor="middle" fontFamily="var(--font-gabarito), Arial Black" fontWeight="900" fontSize="34" letterSpacing="-1.5" fill="#ffe500">
          BRAND
        </text>
      </g>
    </svg>
  );
}
