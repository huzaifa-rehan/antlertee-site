"use client";

import { useEffect, useRef, useState } from "react";
import { hero } from "@/content/copy";
import { usePrefersReducedMotion } from "@/lib/use-media";
import "./process.css";

/*
 * "Yarn to pack." on the Process page: a time-based (not scroll-driven) loop of a hoodie going through the
 * four phases. One requestAnimationFrame loop writes only transforms, opacity and stroke-dashoffset, and skips
 * writes whose value has not changed. It plays when the stage is on screen and the tab is visible, has a
 * pause/play button (WCAG 2.2.2), and renders the finished garment under reduced motion.
 *
 * The SVG is authored in its finished state, so the server render, no-JS and reduced motion all show the
 * finished garment; the loop starts from the end hold, then fades out and begins at "Pattern & cut".
 */

const D = 15; // loop length, seconds
const PHASE_AT = [0, 4.2, 7.2, 10] as const; // phase start times
const DONE = 14.2; // progress line reaches 100%
const FINAL = 13; // the finished state (also the static frame)

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
const phaseAt = (t: number) => (t >= PHASE_AT[3] ? 3 : t >= PHASE_AT[2] ? 2 : t >= PHASE_AT[1] ? 1 : 0);

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

    const apply = (t: number) => {
      // Fade the whole scene out at the end of the loop and back in at the start.
      style(stage, "opacity", String(r3(Math.min(seg(t, 0, 0.5), 1 - seg(t, DONE, D)))));

      // 1. Pattern & cut: lines are cut on the table, pieces fill in, then fly together.
      style(mat, "opacity", String(r3(0.9 * (1 - seg(t, 3.2, 4.2)))));
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
      style(labelRef.current ?? undefined, "opacity", String(r3(Math.min(lab * 1.4, 1 - seg(t, DONE, DONE + 0.5)))));
      style(labelRef.current ?? undefined, "transform", `translate3d(${r3(-30 * (1 - lab))}%, ${r3(16 * (1 - lab))}%, 0) scale(${r3(0.5 + 0.5 * lab)})`);

      // Meter and phase list.
      style(barRef.current ?? undefined, "transform", `scaleX(${r3(seg(t, 0, DONE))})`);
      const ph = phaseAt(t);
      if (ph !== lastPhase) {
        lastPhase = ph;
        items.forEach((li, k) => {
          li.setAttribute("data-on", String(k <= ph));
          if (k === ph) li.setAttribute("aria-current", "step");
          else li.removeAttribute("aria-current");
        });
        const cur = hero.phases[ph];
        if (nowRef.current && cur) nowRef.current.textContent = `${cur.n} ${cur.title}`;
      }
    };

    if (reduce) {
      apply(FINAL);
      style(barRef.current ?? undefined, "transform", "scaleX(1)");
      items.forEach((li) => li.setAttribute("data-on", "true"));
      return;
    }

    let t = FINAL;
    let raf = 0;
    let last = 0;
    let running = false;
    let inView = false;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      t = (t + dt) % D;
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
            aria-label="Animation: a hoodie's pattern pieces are cut and come together, the seams are stitched, the garment is washed and printed, and a woven brand label is sewn in."
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
            </defs>

            <g className="pr-all">
              {/* Cutting table grid */}
              <g className="pr-mat" opacity="0">
                <path
                  d={Array.from({ length: 13 }, (_, i) => `M${i * 40} 0V460`).join("") + Array.from({ length: 12 }, (_, i) => `M0 ${i * 40}H480`).join("")}
                />
              </g>

              <g transform="translate(40 12)">
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
            {reduce ? "Finished" : `${hero.phases[3]?.n} ${hero.phases[3]?.title}`}
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
        {hero.phases.map((ph) => (
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
