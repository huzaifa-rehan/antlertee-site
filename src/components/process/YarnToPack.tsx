"use client";

import { useEffect, useRef, useState } from "react";
import { yarnToPackPhases as PHASES } from "@/content/copy";
import { usePrefersReducedMotion } from "@/lib/use-media";
import "./process.css";

/*
 * "Yarn to pack." in the home hero: a time-based (not scroll-driven) loop of a hoodie going through the four
 * making phases, then folded, stacked into a bulk run and boxed under the Antlertee label. One
 * requestAnimationFrame loop writes only transforms, opacity and stroke-dashoffset, and skips writes whose value
 * has not changed. It plays when the stage is on screen and the tab is visible, has a pause/play button
 * (WCAG 2.2.2), and renders the finished garment under reduced motion.
 *
 * The SVG is authored in its finished state, so the server render, no-JS and reduced motion all show the
 * finished garment; the loop starts from that hold, folds and packs, then fades out and begins at "Pattern & cut".
 */

// Times below run on the garment clock `t`; the knitting intro plays for KNIT seconds before it (t < 0).
const KNIT = 3.8;
const D = 22.5; // garment clock length, seconds (the loop is KNIT + D)
const PHASE_AT = [0, 4.2, 7.2, 10, 12.9] as const; // phase start times after knitting
const DONE = 21; // progress line reaches 100%
const FINAL = 12.4; // the finished garment (also the static frame)
// Yarn cones over the knitting bed, and where each yarn meets the bed.
const CONES = [
  { x: 150, to: 196 },
  { x: 240, to: 240 },
  { x: 330, to: 284 },
] as const;

/*
 * Fold & pack. At 12.9 the garment hands over to a fold rig (same shapes, washed grey, drawn once in <defs>):
 * the sleeves flip back behind the body, then the half below FOLD_Y flips up behind the top half, so the print
 * stays on the front. That folded hoodie is cloned with <use>: it shrinks, three copies slide out of it into a
 * row of four, the four settle into a stack and drop into the box.
 * Copy coordinates are the pack group's (outer SVG, PACK_LIFT lower); rig coordinates are the garment's.
 */
const PACK_LIFT = 36; // the whole pack scene is raised by this much so the box sits mid-stage
const FOLD_Y = 262; // the fold line across the body
const FOLDED = { cx: 200, cy: 149 }; // centre of the folded hoodie in rig coordinates (hood top 36 to FOLD_Y)
const SMALL = 0.46; // folded hoodie scale in the row, stack and box
const START = { x: 240, y: 197 }; // where the folded hoodie sits before it shrinks (over the garment)
const MID = { x: 240, y: 190 };
// Copies in DOM order: three clones (behind), then the folded original on top.
const ROW = [90, 290, 390, 190] as const;
const PILE = [
  { x: 240, y: 186 },
  { x: 243, y: 176 },
  { x: 238, y: 166 },
  { x: 241, y: 156 },
] as const;
const STACK_DROP = 188; // how far the stack falls into the box
const RIG_GREY = "#6f6d69";
const RIG_EDGE = "rgba(0,0,0,.35)";

// Garment pieces (same geometry as the home hero's 2D hoodie), with where each lies on the cutting table.
const PIECES: { id: string; d?: string; rect?: [number, number, number, number, number?]; x: number; y: number; r: number; s?: number }[] = [
  { id: "slL", d: "M100 150 L48 330 Q46 340 56 342 L88 347 Q96 348 98 340 L118 232 Z", x: -40, y: 8, r: -14 },
  { id: "slR", d: "M300 150 L352 330 Q354 340 344 342 L312 347 Q304 348 302 340 L282 232 Z", x: 40, y: 12, r: 12 },
  { id: "body", d: "M120 120 L280 120 L300 150 L300 380 L100 380 L100 150 Z", x: 0, y: 4, r: 0, s: 0.92 },
  { id: "hood", d: "M140 120 Q140 40 200 36 Q260 40 260 120 Q230 106 200 138 Q170 106 140 120 Z", x: 0, y: -30, r: -7 },
  { id: "pocket", d: "M142 292 L258 292 L274 350 L126 350 Z", x: 96, y: 64, r: 9 },
  { id: "band", rect: [102, 372, 196, 24], x: -52, y: 44, r: -5 },
  { id: "cufL", rect: [44, 334, 50, 16, 8], x: -34, y: 52, r: 34 },
  { id: "cufR", rect: [306, 334, 50, 16, -8], x: 34, y: 56, r: -34 },
];

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
const SEAM_START = 4.4;
const SEAM_EACH = 0.5;
const SEAM_GAP = 0.3;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const phaseAt = (t: number) => {
  let i = PHASE_AT.length - 1;
  while (i > 0 && t < (PHASE_AT[i] ?? 0)) i--;
  return i;
};

type Pt = { x: number; y: number };

function PieceShape({ piece, className }: { piece: (typeof PIECES)[number]; className?: string }) {
  if (piece.d) return <path className={className} d={piece.d} pathLength={1} />;
  const [x, y, w, h, rot] = piece.rect ?? [0, 0, 0, 0];
  return (
    <rect
      className={className}
      x={x}
      y={y}
      width={w}
      height={h}
      rx="3"
      pathLength={1}
      transform={rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : undefined}
    />
  );
}

// Fold rig geometry: the garment's own shapes (see PIECES and SEAMS).
const BODY = "M120 120 L280 120 L300 150 L300 380 L100 380 L100 150 Z";
const HOOD = "M140 120 Q140 40 200 36 Q260 40 260 120 Q230 106 200 138 Q170 106 140 120 Z";
const POCKET = "M142 292 L258 292 L274 350 L126 350 Z";
const RIG_SLEEVES = [
  { d: "M100 150 L48 330 Q46 340 56 342 L88 347 Q96 348 98 340 L118 232 Z", cx: 69, rot: 8, blot: 80, seam: "M102 152 L54 326", cuff: "M52 337 L92 343" },
  { d: "M300 150 L352 330 Q354 340 344 342 L312 347 Q304 348 302 340 L282 232 Z", cx: 331, rot: -8, blot: 320, seam: "M298 152 L346 326", cuff: "M348 337 L308 343" },
];
const RIG_BLOTS: [number, number, number, number][] = [
  [150, 170, 70, 38],
  [250, 250, 80, 34],
  [170, 330, 60, 30],
  [270, 150, 34, 18],
  [120, 390, 40, 10],
];
const RIG_SEAM = { fill: "none", stroke: "#ffe500", strokeWidth: 1.7, strokeDasharray: "4 4", strokeLinecap: "round" as const };
const RIG_PIECE = { fill: RIG_GREY, stroke: RIG_EDGE, strokeWidth: 0.8 };
const RIG_PRINT = { textAnchor: "middle" as const, fontFamily: "var(--font-gabarito), Arial Black, sans-serif", fontWeight: 900, fontSize: 34, letterSpacing: -1.5, fill: "#ffe500" };

/**
 * The washed, printed hoodie as separately movable parts, for folding (presentation attributes only: it is
 * cloned by <use>). `#pr-rig-folded` stacks two clips of it: the top half, and the bottom half that flips up behind.
 */
function FoldRig() {
  return (
    <>
      <clipPath id="pr-rig-top">
        <rect x="0" y="0" width="400" height={FOLD_Y} />
      </clipPath>
      <clipPath id="pr-rig-bot">
        <rect x="0" y={FOLD_Y} width="400" height={440 - FOLD_Y} />
      </clipPath>
      <clipPath id="pr-rig-body">
        <path d={BODY} />
        <rect x="102" y="372" width="196" height="24" />
      </clipPath>
      <g id="pr-rig">
        {RIG_SLEEVES.map((s) => (
          <g key={s.cx} className="pr-rig-sleeve">
            <path d={s.d} {...RIG_PIECE} />
            <rect x={s.cx - 25} y="334" width="50" height="16" rx="3" transform={`rotate(${s.rot} ${s.cx} 342)`} {...RIG_PIECE} />
            <ellipse cx={s.blot} cy="262" rx="13" ry="42" fill="url(#pr-blot)" opacity=".8" />
            <path d={s.seam} {...RIG_SEAM} />
            <path d={s.cuff} {...RIG_SEAM} />
            <path className="pr-rig-shade" d={s.d} fill="#000" opacity="0" />
          </g>
        ))}
        <path d={BODY} {...RIG_PIECE} />
        <rect x="102" y="372" width="196" height="24" rx="3" {...RIG_PIECE} />
        <g clipPath="url(#pr-rig-body)" opacity=".8">
          {RIG_BLOTS.map(([cx, cy, rx, ry]) => (
            <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#pr-blot)" />
          ))}
        </g>
        <path d={HOOD} {...RIG_PIECE} />
        <ellipse cx="200" cy="80" rx="46" ry="30" fill="url(#pr-blot)" opacity=".8" />
        <path d={POCKET} fill="none" stroke="rgba(13,12,11,.3)" />
        {[SEAMS[0], SEAMS[1], SEAMS[2], SEAMS[5], SEAMS[6]].map((d) => (
          <path key={d} d={d} {...RIG_SEAM} />
        ))}
        <text x="200" y="214" {...RIG_PRINT}>
          YOUR
        </text>
        <text x="200" y="250" {...RIG_PRINT}>
          BRAND
        </text>
        <rect x="190" y="124" width="20" height="9" rx="1" fill="#0d0c0b" stroke="#ffe500" strokeWidth=".8" strokeDasharray="1.5 1.5" />
      </g>
      <g id="pr-rig-folded">
        <g className="pr-rig-flap">
          <use href="#pr-rig" clipPath="url(#pr-rig-bot)" />
        </g>
        <use href="#pr-rig" clipPath="url(#pr-rig-top)" />
      </g>
    </>
  );
}

export function YarnToPack() {
  const reduce = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const syncRef = useRef<() => void>(() => {});

  const figRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const nowRef = useRef<HTMLSpanElement>(null);
  const phasesRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const fig = figRef.current;
    if (!svg || !fig) return;
    const q = <T extends Element>(sel: string) => [...svg.querySelectorAll<T>(sel)];
    const pieces = q<SVGGElement>("[data-piece]");
    const outlines = q<SVGGeometryElement>(".pr-cut");
    const fills = q<SVGGeometryElement>(".pr-fill");
    const seamMasks = q<SVGPathElement>(".pr-seam-mask");
    const [mat] = q<SVGGElement>(".pr-mat");
    const [stage] = q<SVGGElement>(".pr-all");
    const [dyed] = q<SVGGElement>(".pr-dyed");
    const [acid] = q<SVGGElement>(".pr-acid");
    const [sweep] = q<SVGRectElement>(".pr-sweep");
    const [needle] = q<SVGGElement>(".pr-needle");
    const [printClip] = q<SVGRectElement>(".pr-print-clip");
    const [squeegee] = q<SVGRectElement>(".pr-squeegee");
    const [neckTag] = q<SVGRectElement>(".pr-necktag");
    const [garment] = q<SVGGElement>(".pr-garment");
    const [stack] = q<SVGGElement>(".pr-stack");
    const copies = q<SVGUseElement>(".pr-copy");
    const sleeves = q<SVGGElement>(".pr-rig-sleeve");
    const shades = q<SVGPathElement>(".pr-rig-shade");
    const [rigFlap] = q<SVGGElement>(".pr-rig-flap");
    const boxParts = q<SVGGElement>(".pr-box-back, .pr-box-front");
    const [flap] = q<SVGRectElement>(".pr-flap");
    const [lid] = q<SVGRectElement>(".pr-box-lid");
    const [tape] = q<SVGRectElement>(".pr-tape");
    const [boxLabel] = q<SVGGElement>(".pr-box-label");
    const [fabric] = q<SVGGElement>(".pr-fabric");
    const [fabricClip] = q<SVGRectElement>(".pr-fabric-clip");
    const [knitter] = q<SVGGElement>(".pr-knitter");
    const [carriage] = q<SVGRectElement>(".pr-carriage");
    const yarns = q<SVGPathElement>(".pr-yarn");
    const items = phasesRef.current ? [...phasesRef.current.children] : [];

    // Piece centres for rotation, and points along each seam for the needle.
    const centres = pieces.map((g) => {
      const b = g.getBBox();
      return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    });
    const seamPts: Pt[][] = seamMasks.map((p) => {
      const len = p.getTotalLength();
      return Array.from({ length: 24 }, (_, i) => {
        const pt = p.getPointAtLength((len * i) / 23);
        return { x: pt.x, y: pt.y };
      });
    });

    const cache = new Map<string, string>();
    let uid = 0;
    const ids = new WeakMap<Element, number>();
    const key = (el: Element, prop: string) => {
      let id = ids.get(el);
      if (id === undefined) ids.set(el, (id = uid++));
      return `${id}:${prop}`;
    };
    const style = (el: Element | undefined, prop: "opacity" | "strokeDashoffset" | "transform", value: string) => {
      if (!el) return;
      const k = key(el, prop);
      if (cache.get(k) === value) return;
      cache.set(k, value);
      (el as HTMLElement | SVGElement).style[prop] = value;
    };
    const attr = (el: Element | undefined, name: string, value: string) => {
      if (!el) return;
      const k = key(el, name);
      if (cache.get(k) === value) return;
      cache.set(k, value);
      el.setAttribute(name, value);
    };
    let lastPhase = -2;

    const apply = (tt: number) => {
      const t = tt - KNIT; // garment clock
      // Fade the whole scene out at the end of the loop and back in at the start.
      style(stage, "opacity", String(r3(Math.min(seg(tt, 0, 0.5), 1 - seg(t, DONE, D)))));

      // 0. Knit: the carriage runs along the bed and fabric grows row by row; the machine then lifts away and
      //    the fabric is laid out over the whole table for cutting. Leftover fabric clears as the pieces lift.
      const laid = ease(seg(tt, 3, 3.6));
      const top = 110 - 100 * laid;
      const bottom = 110 + Math.floor(seg(tt, 0.5, 3) * 34.5) * 10;
      attr(fabricClip, "y", String(r3(top)));
      attr(fabricClip, "height", String(r3(bottom - top)));
      style(fabric, "opacity", String(r3(Math.min(seg(tt, 0.1, 0.4), 1 - seg(t, 2.4, 3)))));
      style(knitter, "opacity", String(r3(Math.min(seg(tt, 0.1, 0.5), 1 - seg(tt, 3, 3.5)))));
      attr(knitter, "transform", `translate(0 ${r3(-120 * laid)})`);
      if (tt < 3.6) {
        const pass = (tt * 1.8) % 2;
        attr(carriage, "transform", `translate(${r3((pass < 1 ? pass : 2 - pass) * 386)} 0)`);
        yarns.forEach((y) => style(y, "strokeDashoffset", String(r3(-tt * 30))));
      }

      // 1. Pattern & cut: lines are cut on the fabric, pieces fill in, then fly together.
      style(mat, "opacity", String(r3(0.9 * seg(tt, 3, 3.6) * (1 - seg(t, 3.2, 4.2)))));
      pieces.forEach((g, i) => {
        const p = PIECES[i];
        const c = centres[i];
        if (!p || !c) return;
        const k = 1 - ease(seg(t, 2.6 + i * 0.08, 4.0 + i * 0.08));
        const s = 1 - (1 - (p.s ?? 1)) * k;
        attr(
          g,
          "transform",
          `translate(${r3(p.x * k)} ${r3(p.y * k)}) rotate(${r3(p.r * k)} ${r3(c.cx)} ${r3(c.cy)}) translate(${r3(c.cx)} ${r3(c.cy)}) scale(${r3(s)}) translate(${r3(-c.cx)} ${r3(-c.cy)})`,
        );
        style(outlines[i], "strokeDashoffset", String(r3(1 - ease(seg(t, 0.5 + i * 0.13, 1.7 + i * 0.13)))));
        style(outlines[i], "opacity", String(r3(1 - seg(t, 2.8, 3.4))));
        style(fills[i], "opacity", String(r3(seg(t, 1.5 + i * 0.1, 2.5 + i * 0.1))));
      });

      // 2. Stitch: seams sew in one after another, a needle point leads the thread.
      let needleAt: Pt | null = null;
      seamMasks.forEach((m, i) => {
        const a = SEAM_START + i * SEAM_GAP;
        const k = seg(t, a, a + SEAM_EACH);
        style(m, "strokeDashoffset", String(r3(1 - k)));
        if (k > 0 && k < 1) {
          const pts = seamPts[i];
          const pt = pts?.[Math.min(pts.length - 1, Math.floor(k * pts.length))];
          if (pt) needleAt = pt;
        }
      });
      const n = needleAt as Pt | null;
      style(needle, "opacity", n ? "1" : "0");
      if (n) attr(needle, "transform", `translate(${r3(n.x)} ${r3(n.y)})`);

      // 3. Wash: a wash line sweeps down, the fabric dyes grey and the acid pattern comes through.
      style(sweep, "transform", `translateY(${r3(-160 + 640 * seg(t, 7.3, 8.9))}px)`);
      style(sweep, "opacity", String(r3(Math.min(seg(t, 7.3, 7.6), 1 - seg(t, 8.6, 8.9)))));
      style(dyed, "opacity", String(r3(ease(seg(t, 7.5, 8.9)))));
      style(acid, "opacity", String(r3(0.8 * ease(seg(t, 8.3, 9.7)))));

      // 4. Print & brand: a squeegee pulls the print across, then the woven label comes out of the neck.
      const pull = ease(seg(t, 10.1, 11));
      attr(printClip, "transform", `translate(118 0) scale(${r3(pull)} 1) translate(-118 0)`);
      style(squeegee, "transform", `translateX(${r3(166 * pull)}px)`);
      style(squeegee, "opacity", String(r3(Math.min(seg(t, 10, 10.2), 1 - seg(t, 10.9, 11.2)))));
      style(neckTag, "opacity", String(r3(seg(t, 11, 11.3))));
      const lab = easeOut(seg(t, 11.2, 12.1));
      style(labelRef.current ?? undefined, "opacity", String(r3(Math.min(lab * 1.4, 1 - seg(t, 12.9, 13.3)))));
      style(labelRef.current ?? undefined, "transform", `translate3d(${r3(-30 * (1 - lab))}%, ${r3(16 * (1 - lab))}%, 0) scale(${r3(0.5 + 0.5 * lab)})`);

      // 5. Fold & pack: the sleeves fold in and the body folds in half, copies stack up into a bulk run,
      //    the stack drops into a box, the lid closes, it is taped and stamped with the label.
      // Hand over from the garment to the identical-looking fold rig.
      style(garment, "opacity", String(r3(1 - seg(t, 12.88, 13))));
      // Sleeves flip back around the side seams (x 100 / 300), darkening as they pass edge-on.
      sleeves.forEach((g, i) => {
        const a = 13 + i * 0.12;
        const k = 1 - 2 * ease(seg(t, a, a + 0.5));
        const pivot = i === 0 ? 100 : 300;
        attr(g, "transform", `translate(${pivot} 0) scale(${r3(k)} 1) translate(${-pivot} 0)`);
        style(shades[i], "opacity", String(r3(0.55 * (1 - Math.abs(k)))));
      });
      // The lower half flips up behind the top half.
      const kf = 1 - 2 * ease(seg(t, 13.7, 14.3));
      attr(rigFlap, "transform", `translate(0 ${FOLD_Y}) scale(1 ${r3(kf)}) translate(0 ${-FOLD_Y})`);
      // The folded hoodie shrinks, three copies slide out into a row of four, then they settle into a stack.
      const shrink = ease(seg(t, 14.4, 15));
      const spread = ease(seg(t, 15, 15.7));
      const settle = ease(seg(t, 15.9, 16.5));
      copies.forEach((c, i) => {
        const original = i === copies.length - 1;
        const from = original ? { x: START.x, y: START.y + (MID.y - START.y) * shrink } : MID;
        const s = original ? 1 - (1 - SMALL) * shrink : SMALL;
        const rowX = ROW[i] ?? MID.x;
        const pile = PILE[i] ?? MID;
        const x = from.x + (rowX - from.x) * spread;
        const y = from.y + (MID.y - from.y) * spread;
        style(c, "opacity", String(r3(original ? seg(t, 12.8, 12.9) : seg(t, 15, 15.15))));
        attr(
          c,
          "transform",
          `translate(${r3(x + (pile.x - x) * settle)} ${r3(y + (pile.y - y) * settle)}) scale(${r3(s)}) translate(${-FOLDED.cx} ${-FOLDED.cy})`,
        );
      });
      // Box, drop, lid, tape, label.
      const boxIn = easeOut(seg(t, 16.3, 16.8));
      boxParts.forEach((el) => {
        style(el, "opacity", String(r3(boxIn)));
        attr(el, "transform", `translate(0 ${r3(40 * (1 - boxIn))})`);
      });
      attr(stack, "transform", `translate(0 ${r3(STACK_DROP * ease(seg(t, 16.8, 17.4)))})`);
      attr(flap, "transform", `translate(0 290) scale(1 ${r3(1 - ease(seg(t, 17.5, 18)))}) translate(0 -290)`);
      style(lid, "opacity", String(r3(seg(t, 17.85, 18))));
      attr(tape, "transform", `translate(0 282) scale(1 ${r3(ease(seg(t, 18, 18.3)))}) translate(0 -282)`);
      const stamp = seg(t, 18.4, 18.75);
      style(boxLabel, "opacity", String(r3(stamp)));
      attr(boxLabel, "transform", `translate(240 372) scale(${r3(1.35 - 0.35 * easeOut(stamp))}) translate(-240 -372)`);

      // Meter and phase list.
      style(barRef.current ?? undefined, "transform", `scaleX(${r3(seg(tt, 0, KNIT + DONE))})`);
      const ph = t < 0 ? 0 : 1 + phaseAt(t);
      if (ph !== lastPhase) {
        lastPhase = ph;
        items.forEach((li, k) => {
          li.setAttribute("data-on", String(k <= ph));
          if (k === ph) li.setAttribute("aria-current", "step");
          else li.removeAttribute("aria-current");
        });
        const cur = PHASES[ph];
        if (nowRef.current && cur) nowRef.current.textContent = `${cur.n} ${cur.title}`;
      }
    };

    if (reduce) {
      apply(KNIT + FINAL);
      style(barRef.current ?? undefined, "transform", "scaleX(1)");
      items.forEach((li) => li.setAttribute("data-on", "true"));
      return;
    }

    let t = KNIT + FINAL;
    let raf = 0;
    let last = 0;
    let running = false;
    let inView = false;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      t = (t + dt) % (KNIT + D);
      apply(t);
      raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      const should = inView && !document.hidden && !pausedRef.current;
      if (should && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    syncRef.current = sync;
    apply(t);

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting);
        sync();
      },
      { threshold: 0.2 },
    );
    io.observe(fig);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      cancelAnimationFrame(raf);
      syncRef.current = () => {};
    };
  }, [reduce]);

  const toggle = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    syncRef.current();
  };

  return (
    <>
      <figure className="pr-fig" ref={figRef}>
        <div className="pr-stage">
          <svg
            ref={svgRef}
            viewBox="0 0 480 460"
            role="img"
            aria-label="Animation: yarn is knitted into fabric, a hoodie's pattern pieces are cut from it and come together, the seams are stitched, the garment is washed and printed, a woven brand label is sewn in, then it is folded, stacked into a bulk run and boxed under the Antlertee label."
          >
            <defs>
              <clipPath id="pr-clip">
                {PIECES.map((p) => (
                  <PieceShape key={p.id} piece={p} />
                ))}
              </clipPath>
              <clipPath id="pr-print">
                <rect className="pr-print-clip" x="118" y="170" width="166" height="100" />
              </clipPath>
              <radialGradient id="pr-blot">
                <stop offset="0" stopColor="#e9e2d4" stopOpacity="0.95" />
                <stop offset="0.55" stopColor="#cfc6b5" stopOpacity="0.45" />
                <stop offset="1" stopColor="#cfc6b5" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="pr-sweep-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#9fd3ff" stopOpacity="0" />
                <stop offset="0.5" stopColor="#d9efff" stopOpacity="0.55" />
                <stop offset="1" stopColor="#9fd3ff" stopOpacity="0" />
              </linearGradient>
              <mask id="pr-seams" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="440">
                {SEAMS.map((d) => (
                  <path key={d} className="pr-seam-mask" d={d} stroke="#fff" strokeWidth={6} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={0} />
                ))}
              </mask>
              <pattern id="pr-knit" width="12" height="10" patternUnits="userSpaceOnUse">
                <path d="M0 0 L6 8 L12 0" fill="none" stroke="#c9bfad" strokeWidth="1.6" strokeLinecap="round" />
              </pattern>
              <clipPath id="pr-fabric-clip">
                <rect className="pr-fabric-clip" x="30" y="110" width="420" height="0" />
              </clipPath>
              <FoldRig />
            </defs>

            <g className="pr-all">
              {/* Cutting table grid */}
              <g className="pr-mat" opacity="0">
                <path
                  d={Array.from({ length: 13 }, (_, i) => `M${i * 40} 0V460`).join("") + Array.from({ length: 12 }, (_, i) => `M0 ${i * 40}H480`).join("")}
                />
              </g>

              {/* Knit: yarn feeds a knitting bed and the fabric grows row by row, then it is laid out for cutting */}
              <g className="pr-fabric" opacity="0">
                <g clipPath="url(#pr-fabric-clip)">
                  <rect x="30" y="10" width="420" height="445" fill="#e6e0d3" />
                  <rect x="30" y="10" width="420" height="445" fill="url(#pr-knit)" />
                </g>
              </g>
              <g className="pr-knitter" opacity="0">
                {CONES.map((c) => (
                  <g key={c.x}>
                    <path className="pr-yarn" d={`M${c.x} 66 Q${(c.x + c.to) / 2} 92 ${c.to} 101`} />
                    <g transform={`translate(${c.x} 12)`}>
                      <path d="M-6 0 H6 L20 54 H-20 Z" className="pr-cone" />
                      <path d="M-9 14 H9 M-12 26 H12 M-15 38 H15" className="pr-cone-lines" />
                      <rect x="-4" y="-6" width="8" height="8" rx="1" className="pr-cone-core" />
                    </g>
                  </g>
                ))}
                <rect x="30" y="100" width="420" height="10" rx="2" className="pr-bed" />
                <path d={Array.from({ length: 35 }, (_, i) => `M${36 + i * 12} 104V112`).join("")} className="pr-needles" />
                <rect className="pr-carriage" x="30" y="94" width="34" height="20" rx="3" />
              </g>

              <g transform="translate(40 12)">
                <g className="pr-garment">
                  {/* Pattern pieces: greige fill + yellow cutting line */}
                  {PIECES.map((p) => (
                    <g key={p.id} data-piece={p.id}>
                      <PieceShape piece={p} className="pr-fill" />
                      <PieceShape piece={p} className="pr-cut" />
                    </g>
                  ))}

                  {/* Wash: dye, acid pattern and the wash line, all clipped to the garment */}
                  <g clipPath="url(#pr-clip)">
                    <g className="pr-dyed">
                      {/* Grey acid wash: black would vanish into the ink background */}
                      <rect x="0" y="0" width="400" height="440" fill="#6f6d69" />
                      <path className="pr-panel-lines" d="M140 120 Q140 40 200 36 Q260 40 260 120 M120 120 L280 120 L300 150 L300 380 L100 380 L100 150 Z M142 292 L258 292 L274 350 L126 350 Z M104 376 L296 376" />
                    </g>
                    <g className="pr-acid" opacity="0.55">
                      <ellipse cx="150" cy="170" rx="70" ry="38" fill="url(#pr-blot)" />
                      <ellipse cx="250" cy="250" rx="80" ry="34" fill="url(#pr-blot)" />
                      <ellipse cx="170" cy="330" rx="60" ry="30" fill="url(#pr-blot)" />
                      <ellipse cx="200" cy="80" rx="46" ry="30" fill="url(#pr-blot)" />
                      <ellipse cx="80" cy="260" rx="26" ry="60" fill="url(#pr-blot)" />
                      <ellipse cx="324" cy="230" rx="24" ry="56" fill="url(#pr-blot)" />
                      <ellipse cx="270" cy="150" rx="34" ry="18" fill="url(#pr-blot)" />
                      <ellipse cx="120" cy="390" rx="40" ry="10" fill="url(#pr-blot)" />
                    </g>
                    <rect className="pr-sweep" x="0" y="0" width="400" height="140" fill="url(#pr-sweep-g)" opacity="0" />
                  </g>

                  {/* Seams: dashed thread revealed by the mask */}
                  <g mask="url(#pr-seams)">
                    {SEAMS.map((d) => (
                      <path key={d} className="pr-seam" d={d} />
                    ))}
                  </g>
                  <g className="pr-needle" opacity="0">
                    <circle r="9" className="pr-needle-glow" />
                    <circle r="3" className="pr-needle-dot" />
                  </g>

                  {/* Print */}
                  <g clipPath="url(#pr-print)">
                    <text x="200" y="214" textAnchor="middle" className="pr-print-t">
                      YOUR
                    </text>
                    <text x="200" y="250" textAnchor="middle" className="pr-print-t">
                      BRAND
                    </text>
                  </g>
                  <rect className="pr-squeegee" x="114" y="166" width="5" height="108" rx="2" opacity="0" />
                  {/* The woven label sewn in at the neck */}
                  <rect className="pr-necktag" x="190" y="124" width="20" height="9" rx="1" />
                </g>
              </g>

              {/* Pack: open lid behind, the bulk stack, then the box front with tape and our label */}
              <g transform={`translate(0 ${-PACK_LIFT})`}>
                <g className="pr-box-back" opacity="0">
                  <rect className="pr-flap" x="132" y="234" width="216" height="56" rx="2" />
                </g>
                <g className="pr-stack">
                  {/* Three clones behind, the folded original on top: all the same folded hoodie */}
                  {PILE.map((p) => (
                    <use key={p.y} className="pr-copy" href="#pr-rig-folded" opacity="0" />
                  ))}
                </g>
                <g className="pr-box-front" opacity="0">
                  <rect className="pr-box-body" x="130" y="290" width="220" height="140" rx="3" />
                  <path className="pr-box-crease" d="M130 302 H350" />
                  <rect className="pr-box-lid" x="128" y="284" width="224" height="10" rx="2" opacity="0" />
                  <rect className="pr-tape" x="228" y="282" width="24" height="34" />
                  <g className="pr-box-label" opacity="0">
                    <rect className="pr-box-label-card" x="198" y="330" width="84" height="84" rx="3" />
                    <image href="/brand/logo-full-white.png" x="221" y="336" width="38" height="72" preserveAspectRatio="xMidYMid meet" />
                  </g>
                </g>
              </g>
            </g>
          </svg>

          <div className="pr-label" ref={labelRef} aria-hidden="true">
            <i className="pr-label-line" />
            <div className="pr-label-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, decorative */}
              <img src="/brand/logo-full-white.png" alt="" width={520} height={1012} />
              <small>( Your label )</small>
            </div>
          </div>
        </div>

        <figcaption className="pr-meter">
          <span className="pr-now br" ref={nowRef} aria-hidden="true">
            {reduce ? "Finished" : `${PHASES[4]?.n} ${PHASES[4]?.title}`}
          </span>
          <span className="pr-line" aria-hidden="true">
            <i ref={barRef} />
          </span>
          {!reduce && (
            <button type="button" className="pr-toggle" onClick={toggle} aria-label={paused ? "Play the yarn to pack animation" : "Pause the yarn to pack animation"}>
              <span className={paused ? "pr-ico-play" : "pr-ico-pause"} aria-hidden="true" />
              <span>{paused ? "Play" : "Pause"}</span>
            </button>
          )}
        </figcaption>
      </figure>

      <ol className="pr-phases" ref={phasesRef} aria-label="From yarn to pack">
        {PHASES.map((ph) => (
          <li key={ph.n} data-on="true">
            <b>{ph.n}</b>
            <span>
              <strong>{ph.title}</strong>
              {ph.detail}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
