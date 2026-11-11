"use client";

import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Picture } from "@/components/Picture";
import type { ImageId } from "@/content/images";
import { usePrefersReducedMotion } from "@/lib/use-media";
import { HANGER_SIZES } from "./Wardrobe";

/** Comfortable turn range; past it the garment resists (rubber band). */
const MAX = 35;
const RAD = Math.PI / 180;
/** Critically damped return: damping = 2·√(stiffness·mass), so it settles without wobbling. */
const STIFFNESS = 170;
const SETTLE = { type: "spring", stiffness: STIFFNESS, damping: 2 * Math.sqrt(STIFFNESS), mass: 1, restDelta: 0.01 } as const;

function rubberBand(deg: number): number {
  const a = Math.abs(deg);
  return a <= MAX ? deg : Math.sign(deg) * (MAX + (a - MAX) * 0.1);
}

interface Drag {
  id: number;
  x0: number;
  r0: number;
  half: number;
  samples: { t: number; r: number }[];
}

interface TurnStageProps {
  image: ImageId;
  /** Accessible description of the photo. */
  alt: string;
  priority?: boolean;
}

/**
 * Drag-to-turn product photo. We only have front shots, so the turn is a 3D tilt (rotateY with perspective):
 * the grabbed edge follows the pointer 1:1, the release carries the pointer's velocity, and a critically damped
 * spring settles it facing front. Light and shadow shift with the angle so it reads as a physical piece.
 * Under reduced motion it is a still photo.
 */
export function TurnStage({ image, alt, priority }: TurnStageProps) {
  const reduce = usePrefersReducedMotion();
  const rot = useMotionValue(0);
  const drag = useRef<Drag | null>(null);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const [used, setUsed] = useState(false);

  // The side turning away darkens, the side coming forward catches the light.
  const shade = useTransform(rot, (v) => {
    const t = Math.min(Math.abs(v) / MAX, 1.25);
    const dark = (0.55 * t).toFixed(3);
    const lit = (0.2 * t).toFixed(3);
    const dir = v >= 0 ? "90deg" : "270deg";
    return `linear-gradient(${dir}, rgba(255,247,232,${lit}) 0%, rgba(255,247,232,0) 40%, rgba(0,0,0,0) 52%, rgba(0,0,0,${dark}) 100%)`;
  });
  const sheenOpacity = useTransform(rot, (v) => Math.min(Math.abs(v) / MAX, 1) * 0.5);
  const sheenX = useTransform(rot, (v) => `${-v * 2.4}%`);
  const floorScale = useTransform(rot, (v) => 0.55 + 0.45 * Math.cos(v * RAD));
  const floorX = useTransform(rot, (v) => -Math.sin(v * RAD) * 22);

  useEffect(() => () => anim.current?.stop(), []);

  const settle = (velocity: number) => {
    anim.current?.stop();
    anim.current = animate(rot, 0, { ...SETTLE, velocity });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    anim.current?.stop();
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      r0: rot.get(),
      half: Math.max(rect.width / 2, 1),
      samples: [{ t: e.timeStamp, r: rot.get() }],
    };
    setUsed(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    // Angle at which the card's edge sits under the pointer: x = half · sin(θ).
    const s = Math.max(-1, Math.min(1, (e.clientX - d.x0) / d.half));
    const next = rubberBand(d.r0 + Math.asin(s) / RAD);
    rot.set(next);
    d.samples.push({ t: e.timeStamp, r: next });
    while (d.samples.length > 2 && e.timeStamp - (d.samples[0]?.t ?? 0) > 100) d.samples.shift();
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    const first = d.samples[0];
    const last = d.samples.at(-1);
    let velocity = 0;
    if (first && last && last.t - first.t > 8) velocity = ((last.r - first.r) / (last.t - first.t)) * 1000;
    settle(Math.max(-720, Math.min(720, velocity)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (reduce || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    setUsed(true);
    anim.current?.stop();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const controls = animate(rot, dir * 24, { type: "spring", stiffness: 380, damping: 34 });
    anim.current = controls;
    controls.then(() => {
      if (anim.current === controls) settle(0);
    });
  };

  return (
    <div
      className="turn"
      role="img"
      aria-label={reduce ? alt : `${alt}. Drag sideways, or use the arrow keys, to turn it.`}
      tabIndex={reduce ? undefined : 0}
      data-turnable={reduce ? undefined : "true"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <motion.span className="turn-floor" style={{ scaleX: floorScale, x: floorX }} aria-hidden="true" />
      <motion.span className="turn-card" style={{ rotateY: rot }}>
        {/* The hanger-sized photo is already cached, so the card is never blank mid-flight. */}
        <Picture id={image} sizes={HANGER_SIZES} alt="" draggable={false} priority />
        <Picture id={image} sizes="(max-width: 859.98px) 80vw, 560px" alt="" draggable={false} priority={priority} />
        <motion.span className="turn-shade" style={{ background: shade }} aria-hidden="true" />
        <motion.span className="turn-sheen" style={{ opacity: sheenOpacity, x: sheenX }} aria-hidden="true" />
      </motion.span>
      {!reduce && (
        <span className="turn-hint" data-used={used || undefined} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 12a8 8 0 0 1 14.5-4.6M20 12a8 8 0 0 1-14.5 4.6" strokeLinecap="round" />
            <path d="M18.5 3.5v4h-4M5.5 20.5v-4h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Drag to turn
        </span>
      )}
    </div>
  );
}
