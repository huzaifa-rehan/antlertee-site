import type Lenis from "lenis";
import type { VirtualScrollData } from "lenis";
import Snap from "lenis/snap";

/**
 * Soft stop: a fast mouse-wheel or trackpad flick stops briefly at the start of the next section instead of carrying the
 * visitor past it, and a scroll that ends close to a section start settles onto it. Two parts:
 *
 * 1. Cap (`gate`, plugged into Lenis as its `virtualScroll` option). Only a FAST gesture is capped: when the wheel moves
 *    more than FAST_PX within FAST_WINDOW_MS, the gesture may travel no further than the next section start. It eases
 *    there, the rest of that flick is absorbed for a moment (at most MAX_HOLD_MS), and the next gesture moves on as
 *    normal. Slow, deliberate scrolling is never capped.
 * 2. Settle (`lenis/snap`, proximity): when the wheel goes quiet within SETTLE_THRESHOLD of a section start, ease onto it.
 *
 * Section starts come from `data-snap` attributes: "fit" (settle here and stop here) or "edge" (stop here only; pinned and
 * tall sections, which are never snapped inside). The settle is switched off inside a pinned range, for touch input
 * (touch scrolling stays native) and while a cap animation runs. Keyboard scrolling and anchor links do not go through the
 * wheel path, so they behave exactly as before.
 *
 * Set SOFT_STOP_ENABLED to false to switch the whole feature off.
 */
export const SOFT_STOP_ENABLED = true;

const FAST_WINDOW_MS = 120; // the look-back window used to judge how fast a gesture is
const FAST_PX = 300; // wheel distance inside that window that counts as a fast flick (about three mouse-wheel notches)
const GESTURE_GAP_MS = 160; // quiet time that ends one gesture and starts the next
const QUIET_RELEASE_MS = 100; // after a stop, release as soon as the wheel has been quiet this long
const MAX_HOLD_MS = 700; // ...and never absorb a flick for longer than this (a long trackpad tail must not trap anyone)
const STOP_DURATION_S = 0.7; // length of the eased stop
const SETTLE_THRESHOLD = "22%"; // how close to a section start a quiet scroll must end to be pulled onto it
const SETTLE_DEBOUNCE_MS = 200;
const SETTLE_DURATION_S = 0.6;
const MIN_TRAVEL_PX = 24; // a section start closer than this behind/ahead is "here", the next one is the target

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

interface Point {
  top: number;
  kind: "fit" | "edge";
  /** For a pinned section: the scroll position where its pin ends (settling is off in between). */
  pinEnd?: number;
}

interface Gesture {
  start: number;
  dir: 1 | -1;
  fast: boolean;
  samples: { t: number; d: number }[];
  /** Set once the gesture has been stopped at a section start. */
  stoppedAt: number | null;
  lastEvent: number;
}

export interface SoftStop {
  /** Plug into `new Lenis({ virtualScroll })`. Returns false to swallow an event. */
  gate: (data: VirtualScrollData) => boolean;
  attach: (lenis: Lenis) => void;
  /** Re-measure the section starts (after layout changes). */
  refresh: () => void;
  destroy: () => void;
}

/** Sections inside files that must not be edited (the tech pack hero) are registered here instead of by attribute. */
const EXTRA_POINTS: { selector: string; kind: Point["kind"] }[] = [
  { selector: "#tech-pack", kind: "fit" },
  { selector: "#tph-panels", kind: "edge" },
];

function collectPoints(limit: number): Point[] {
  const found: Point[] = [];
  const marked: { el: HTMLElement; kind: Point["kind"] }[] = [];
  document.querySelectorAll<HTMLElement>("[data-snap]").forEach((el) => {
    marked.push({ el, kind: el.dataset.snap === "fit" ? "fit" : "edge" });
  });
  for (const extra of EXTRA_POINTS) {
    const el = document.querySelector<HTMLElement>(extra.selector);
    if (el && !el.hasAttribute("data-snap")) marked.push({ el, kind: extra.kind });
  }
  marked.forEach(({ el, kind }) => {
    // A pinned section is measured through its pin-spacer, which keeps its place in the page while the section is fixed.
    const host = el.closest<HTMLElement>(".pin-spacer") ?? el;
    const rect = host.getBoundingClientRect();
    if (rect.height === 0) return;
    const top = Math.round(rect.top + window.scrollY);
    if (top > limit + 1) return;
    found.push({
      top: Math.max(0, top),
      kind,
      pinEnd: host !== el ? top + host.offsetHeight - window.innerHeight : undefined,
    });
  });
  found.sort((a, b) => a.top - b.top);
  // Two sections that start at the same place are one point; "fit" wins over "edge".
  const merged: Point[] = [];
  for (const p of found) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.top - p.top) < 4) {
      if (p.kind === "fit") last.kind = "fit";
      last.pinEnd = last.pinEnd ?? p.pinEnd;
    } else merged.push({ ...p });
  }
  return merged;
}

export function createSoftStop(): SoftStop {
  let lenis: Lenis | null = null;
  let snap: Snap | null = null;
  let points: Point[] = [];
  let removers: (() => void)[] = [];
  let lastInput: "wheel" | "touch" = "wheel";
  let animatingUntil = 0;
  let gesture: Gesture = { start: 0, dir: 1, fast: false, samples: [], stoppedAt: null, lastEvent: 0 };
  let observer: ResizeObserver | null = null;
  let refreshTimer = 0;
  let unsubscribeScroll: (() => void) | null = null;

  const inPin = (y: number): boolean => points.some((p) => p.pinEnd !== undefined && y > p.top + 8 && y < p.pinEnd - 8);

  /** Settling is on only for wheel input, outside pinned ranges, and not while a stop animation runs. */
  const syncSettle = () => {
    if (!snap || !lenis) return;
    const allowed = lastInput === "wheel" && !inPin(lenis.scroll) && performance.now() > animatingUntil;
    if (allowed) snap.start();
    else snap.stop();
  };

  const nextPoint = (from: number, dir: 1 | -1): number | null => {
    if (dir > 0) {
      const p = points.find((q) => q.top > from + MIN_TRAVEL_PX);
      return p ? p.top : null;
    }
    for (let i = points.length - 1; i >= 0; i--) {
      const q = points[i];
      if (q && q.top < from - MIN_TRAVEL_PX) return q.top;
    }
    return null;
  };

  const gate = (data: VirtualScrollData): boolean => {
    if (!lenis) return true;
    const ev = data.event;
    if (ev.type !== "wheel") {
      // Touch (and anything else) keeps native scrolling: no settling.
      lastInput = "touch";
      syncSettle();
      return true;
    }
    lastInput = "wheel";
    const dy = data.deltaY;
    if (dy === 0 || Math.abs(data.deltaX) > Math.abs(dy) || ev.ctrlKey || lenis.isStopped || lenis.isLocked) return true;

    const now = performance.now();
    const dir: 1 | -1 = dy > 0 ? 1 : -1;
    const gap = now - gesture.lastEvent;
    if (gap > GESTURE_GAP_MS || dir !== gesture.dir) {
      gesture = { start: lenis.targetScroll, dir, fast: false, samples: [], stoppedAt: null, lastEvent: now };
    }
    gesture.lastEvent = now;

    // A flick that already stopped at a section start: absorb the rest of it, briefly.
    if (gesture.stoppedAt !== null) {
      if (gap < QUIET_RELEASE_MS && now - gesture.stoppedAt < MAX_HOLD_MS) {
        if (ev.cancelable) ev.preventDefault();
        return false;
      }
      gesture = { start: lenis.targetScroll, dir, fast: false, samples: [], stoppedAt: null, lastEvent: now };
    }

    gesture.samples.push({ t: now, d: Math.abs(dy) });
    while (gesture.samples.length > 0 && now - (gesture.samples[0]?.t ?? now) > FAST_WINDOW_MS) gesture.samples.shift();
    if (!gesture.fast && gesture.samples.reduce((n, s) => n + s.d, 0) >= FAST_PX) gesture.fast = true;

    if (gesture.fast) {
      const cap = nextPoint(gesture.start, dir);
      if (cap !== null) {
        const target = lenis.targetScroll + dy;
        if ((dir > 0 && target >= cap - 2) || (dir < 0 && target <= cap + 2)) {
          if (ev.cancelable) ev.preventDefault();
          gesture.stoppedAt = now;
          animatingUntil = now + STOP_DURATION_S * 1000 + 150;
          syncSettle();
          lenis.scrollTo(cap, { duration: STOP_DURATION_S, easing: easeOutCubic, userData: { initiator: "soft-stop" } });
          return false;
        }
      }
    }
    return true;
  };

  const refresh = () => {
    if (!lenis) return;
    removers.forEach((fn) => fn());
    removers = [];
    points = collectPoints(lenis.limit);
    if (snap) for (const p of points) if (p.kind === "fit") removers.push(snap.add(p.top));
    syncSettle();
  };

  const scheduleRefresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refresh, 150);
  };

  return {
    gate,
    attach(instance) {
      lenis = instance;
      snap = new Snap(instance, {
        type: "proximity",
        distanceThreshold: SETTLE_THRESHOLD,
        debounce: SETTLE_DEBOUNCE_MS,
        duration: SETTLE_DURATION_S,
        easing: easeOutCubic,
      });
      unsubscribeScroll = instance.on("scroll", syncSettle);
      observer = new ResizeObserver(scheduleRefresh);
      observer.observe(document.body);
      window.addEventListener("resize", scheduleRefresh);
      window.addEventListener("load", scheduleRefresh);
      refresh();
    },
    refresh: scheduleRefresh,
    destroy() {
      window.clearTimeout(refreshTimer);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleRefresh);
      window.removeEventListener("load", scheduleRefresh);
      unsubscribeScroll?.();
      removers.forEach((fn) => fn());
      removers = [];
      snap?.destroy();
      snap = null;
      lenis = null;
      points = [];
    },
  };
}
