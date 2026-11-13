"use client";

/**
 * The home hero's 3D film, "Yarn to pack.": one continuous scene on the ink background, about 26 s a loop.
 *
 *   Knit           (t < 0)        yarn cones feed glowing strands into a knitting bed; fabric grows row by row
 *   Pattern & cut  (0 - 4.2)      the fabric lays out, a laser cuts the pattern pieces, they float up and come together
 *   Stitch         (4.2 - 8.6)    the pieces become the transparent ghost hoodie; a glowing yellow thread sews it
 *   Wash & finish  (8.6 - 10.3)   a scan line sweeps up leaving the rainbow reflective finish; a slow turn
 *   Print & brand  (10.3 - 12.2)  the black print wipes on, the woven label card appears, hero turn with a light sweep
 *   Fold & pack    (12.2 - 21)    clean retail fold, a row of four, a pile, into the box, flaps, tape, label, pulse
 *
 * Parts live in HeroFilmMaking (knit, cut, sparks), HeroFilmHoodie (hoodie, fold, copies) and HeroFilmBox (box).
 * The clock is YarnToPack's: the canvas uses frameloop "never" and renders only when `api.render(t)` is called, so
 * it costs nothing while paused, offscreen or in a hidden tab. Loaded with next/dynamic (no SSR) after window load,
 * and it reports ready only once every shader is compiled.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { FilmBox } from "./HeroFilmBox";
import { FilmHoodies } from "./HeroFilmHoodie";
import { FilmMaking } from "./HeroFilmMaking";
import { bump, CAMERA_FOV, CAMERA_Z, ease, lerp, seg, type FilmClock, type Pack3DApi } from "./HeroPackTimes";

interface HeroPack3DProps {
  /** Filled once the scene is loaded and its shaders compiled; YarnToPack calls `render(t)` from its own loop. */
  apiRef: RefObject<Pack3DApi | null>;
  onReady: () => void;
}

export default function HeroPack3D({ apiRef, onReady }: HeroPack3DProps) {
  const [maxDpr] = useState(() => (window.innerWidth < 860 ? 1.5 : 1.75));
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, maxDpr));
  return (
    <Canvas
      dpr={dpr}
      frameloop="never"
      camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_Z], near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(window.devicePixelRatio || 1, maxDpr))} />
      <Suspense fallback={null}>
        <Scene apiRef={apiRef} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

/* ------------------------------------------------------------------------------------------------ */

/** Camera distance keyframes [t, z]: push in on the knitting, ease in for the hero turn, pull back for the box. */
const DOLLY: [number, number][] = [
  [-3.8, 4.75],
  [0, 4.05],
  [4.2, 3.95],
  [8.6, 3.95],
  [10.8, 3.78],
  [12.2, 3.95],
  [15, 4.02],
  [17, 4.12],
  [22.6, 4.12],
];

function dollyAt(t: number): number {
  for (let i = 1; i < DOLLY.length; i++) {
    const [t1, z1] = DOLLY[i] ?? [0, CAMERA_Z];
    const [t0, z0] = DOLLY[i - 1] ?? [0, CAMERA_Z];
    if (t <= t1) return lerp(z0, z1, ease(seg(t, t0, t1)));
  }
  return DOLLY[DOLLY.length - 1]?.[1] ?? CAMERA_Z;
}

interface LightRefs {
  key: THREE.DirectionalLight | null;
  rim: THREE.DirectionalLight | null;
  sweep: THREE.DirectionalLight | null;
}

function Scene({ apiRef, onReady }: HeroPack3DProps) {
  const clock = useRef<FilmClock>({ t: -3.8 });
  const lights = useRef<LightRefs>({ key: null, rim: null, sweep: null });
  const pointer = useRef({ x: 0, y: 0, cx: 0, cy: 0 });
  const get = useThree((s) => s.get);

  // Subtle pointer parallax (desktop pointers only; the 3D film never runs under reduced motion).
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  // Camera and lights. Registered before the parts, so they run first each frame.
  useFrame((state) => {
    const t = clock.current.t;
    const p = pointer.current;
    p.cx += (p.x - p.cx) * 0.06;
    p.cy += (p.y - p.cy) * 0.06;
    const orbit = 0.2 * Math.sin((t - 4.5) * 0.45) * seg(t, 4.5, 6) * (1 - seg(t, 11.5, 12.3));
    const cam = state.camera;
    // A slightly high angle on the knitting machine, levelling out as the fabric lays out.
    const high = 0.32 * (1 - ease(seg(t, -0.8, 0.6)));
    cam.position.set(orbit + p.cx * 0.12, high - p.cy * 0.08, dollyAt(t));
    cam.lookAt(0, 0, 0);

    const l = lights.current;
    const ghost = seg(t, 4.6, 5.2) * (1 - seg(t, 8.6, 9.6));
    if (l.key) l.key.intensity = 1.1 - 0.75 * ghost + 0.3 * seg(t, 9, 10) + 0.3 * seg(t, 14.3, 14.9);
    if (l.rim) l.rim.intensity = 0.6 + 1.8 * seg(t, 10.3, 11.3) * (1 - seg(t, 12.2, 12.8));
    if (l.sweep) {
      // Hero light sweep across the print.
      const k = seg(t, 11.15, 11.95);
      l.sweep.intensity = 2.6 * bump(t, 11.15, 11.95);
      l.sweep.position.set(lerp(-3, 3, k), 1.2, 2.5);
    }
  });

  // Compile every material up front (all parts visible) without blocking, then hand YarnToPack the render call.
  useEffect(() => {
    let live = true;
    const state = get();
    state.scene.traverse((o) => {
      o.visible = true;
    });
    const done = () => {
      if (!live) return;
      clock.current.t = -3.8;
      state.advance(performance.now());
      apiRef.current = {
        render: (t: number) => {
          clock.current.t = t;
          get().advance(performance.now());
        },
      };
      onReady();
    };
    state.gl.compileAsync(state.scene, state.camera).then(done, (err: unknown) => {
      console.warn("3D film: shader precompile failed; compiling on first frame.", err);
      done();
    });
    return () => {
      live = false;
      apiRef.current = null;
    };
  }, [apiRef, get, onReady]);

  return (
    <>
      <ambientLight intensity={0.18} />
      <directionalLight
        ref={(l) => {
          lights.current.key = l;
        }}
        position={[2.2, 2.4, 3.2]}
        intensity={1.1}
      />
      <directionalLight
        ref={(l) => {
          lights.current.rim = l;
        }}
        position={[-2.6, 1.4, -2.8]}
        intensity={0.6}
        color="#fff1c2"
      />
      <directionalLight position={[2.8, -0.6, -2.4]} intensity={0.5} color="#ffe9a8" />
      <directionalLight
        ref={(l) => {
          lights.current.sweep = l;
        }}
        position={[-3, 1.2, 2.5]}
        intensity={0}
      />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 3, 2]} scale={[6, 2, 1]} rotation-x={Math.PI / 2.4} />
        <Lightformer form="rect" intensity={0.8} position={[-4, 0.5, 1]} scale={[2, 4, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="ring" intensity={1.2} color="#ffe500" position={[3.5, 0.5, -2]} scale={1.6} />
      </Environment>
      <FilmMaking clock={clock} />
      <FilmHoodies clock={clock} />
      <FilmBox clock={clock} />
    </>
  );
}
