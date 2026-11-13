"use client";

/**
 * The 3D hero: a scroll-scrubbed hoodie that goes from ghost to garment.
 *
 *   0.00–0.30  Pattern & cut   ghost shell + crease lines; a yellow "laser" line sweeps up and leaves greige fabric
 *   0.30–0.60  Stitch          the stitch mesh sews itself in: a glowing yellow thread front cools to the stitch colour
 *   0.60–0.80  Wash            dip-dye: a grey acid wash (flame print showing through) rises from the hem with a wet edge
 *   0.80–1.00  Print & brand   the garment settles into a 3/4 hero turn, rim light comes up, "YOUR BRAND" label appears
 *
 * Progress comes from `heroProgress` (GSAP ScrollTrigger scrub in <Hero>). Everything per-frame is written to
 * uniforms/refs, never React state. This file (and three/R3F/drei) is only loaded by the hero via next/dynamic.
 */
import { Canvas, useFrame, type RootState } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { buildParts, MODEL_URL, type Parts } from "./hoodie";
import { heroLayout, heroProgress, range, smooth } from "./store";

/** Final resting angle: a 3/4 view of the front. */
const HERO_ANGLE = -0.62;

// Start fetching the model as soon as this chunk loads (meshopt decoder is bundled with three-stdlib).
useGLTF.preload(MODEL_URL, false, true);

interface HeroCanvasProps {
  /** False when the hero is offscreen: rendering stops completely. */
  active: boolean;
  onReady: () => void;
  /** DOM label positioned next to the garment in the final phase. */
  labelRef: RefObject<HTMLDivElement | null>;
}

export default function HeroCanvas({ active, onReady, labelRef }: HeroCanvasProps) {
  const [maxDpr] = useState(() => (window.innerWidth < 860 ? 1.5 : 1.75));
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, maxDpr));
  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 28, position: [0, 0, 4], near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(Math.min(window.devicePixelRatio || 1, maxDpr))}
      />
      <Suspense fallback={null}>
        <Scene onReady={onReady} labelRef={labelRef} />
      </Suspense>
    </Canvas>
  );
}

/* ------------------------------------------------------------------------------------------------ */

interface SceneRefs {
  root: RefObject<THREE.Group | null>;
  spin: RefObject<THREE.Group | null>;
  key: RefObject<THREE.DirectionalLight | null>;
  rim: RefObject<THREE.DirectionalLight | null>;
  sewLight: RefObject<THREE.PointLight | null>;
  label: RefObject<HTMLDivElement | null>;
  motion: { idle: number; rot: number; time: number };
}

const ANCHOR = new THREE.Vector3();

/** Per-frame update. Kept outside the component: it mutates three.js objects, uniforms and the DOM label. */
function tick(state: RootState, delta: number, parts: Parts, r: SceneRefs): void {
  const dt = Math.min(delta, 1 / 20);
  const p = heroProgress.get();
  const u = parts.uniforms;
  const m = r.motion;
  const { root, spin, key, rim, sewLight } = r;
  m.time += dt;

  // ----- material timeline -----
  u.uCut.value = THREE.MathUtils.lerp(-1.08, 1.08, smooth(range(p, 0.03, 0.28)));
  u.uCutGlow.value = 1 - range(p, 0.27, 0.33);
  u.uGhost.value = 1 - range(p, 0.2, 0.32);
  u.uEdges.value = 0.5 * (1 - range(p, 0.24, 0.31));
  u.uSew.value = THREE.MathUtils.lerp(-0.05, 1.28, range(p, 0.3, 0.58));
  u.uDye.value = THREE.MathUtils.lerp(-1.5, 1.5, smooth(range(p, 0.6, 0.8)));

  // ----- lights -----
  const brand = smooth(range(p, 0.8, 0.95));
  if (key.current) key.current.intensity = 0.35 + 1.45 * smooth(range(p, 0.02, 0.26));
  if (rim.current) rim.current.intensity = 0.6 + 4.2 * brand;
  if (sewLight.current) {
    const sewing = range(p, 0.3, 0.34) * (1 - range(p, 0.55, 0.6));
    sewLight.current.intensity = 0.9 * sewing;
    sewLight.current.position.y = 1 - 2 * Math.max(0, u.uSew.value);
  }

  // ----- rotation: idle drift + scroll spin, settling into the 3/4 hero angle -----
  if (p < 0.75) m.idle = THREE.MathUtils.euclideanModulo(m.idle + dt * 0.22 + Math.PI, Math.PI * 2) - Math.PI;
  const target = HERO_ANGLE + (m.idle - p * Math.PI * 1.5) * (1 - brand);
  m.rot = THREE.MathUtils.damp(m.rot, target, 3.5, dt);
  if (spin.current) {
    spin.current.rotation.y = m.rot;
    spin.current.rotation.x = Math.sin(m.time * 0.6) * 0.035 * (1 - brand) + 0.04;
  }

  // ----- layout: sit in the hero's empty grid slot -----
  const { width: vw, height: vh } = state.viewport;
  if (root.current) {
    const fitH = heroLayout.h * vh * 0.9;
    const fitW = (heroLayout.w * vw * 0.95) / parts.aspect;
    const push = 0.94 + 0.06 * smooth(range(p, 0.0, 0.3)) + 0.04 * Math.sin(Math.PI * range(p, 0.3, 0.8));
    const s = Math.min(fitH, fitW) * push;
    root.current.scale.setScalar(s);
    root.current.position.set(
      (heroLayout.cx - 0.5) * vw,
      (0.5 - heroLayout.cy) * vh + Math.sin(m.time * 0.8) * 0.012 * s,
      0,
    );

    // ----- "YOUR BRAND" label anchored off the garment's right shoulder -----
    const label = r.label.current;
    if (label) {
      const show = range(p, 0.86, 0.94);
      ANCHOR.set(parts.aspect * 0.42, 0.22, 0).applyMatrix4(root.current.matrixWorld).project(state.camera);
      // Keep the whole label on screen (narrow phones): it may overlap the shoulder rather than be cut off.
      const maxX = state.size.width - (show > 0 ? label.offsetWidth : 0) - 26;
      const x = Math.min((ANCHOR.x * 0.5 + 0.5) * state.size.width, maxX);
      const y = (-ANCHOR.y * 0.5 + 0.5) * state.size.height;
      label.style.opacity = String(show);
      label.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + (1 - show) * 14).toFixed(1)}px, 0)`;
    }
  }
}

/* ------------------------------------------------------------------------------------------------ */

function Scene({ onReady, labelRef }: { onReady: () => void; labelRef: RefObject<HTMLDivElement | null> }) {
  const gltf = useGLTF(MODEL_URL, false, true);
  const parts = useMemo(() => buildParts(gltf.scene), [gltf.scene]);
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const sewLight = useRef<THREE.PointLight>(null);
  const [motionState] = useState(() => ({ idle: 0, rot: HERO_ANGLE - 1.2, time: 0 }));
  const refs: SceneRefs = { root, spin, key, rim, sewLight, label: labelRef, motion: motionState };

  useEffect(() => () => parts.dispose(), [parts]);

  // Two frames after mount the shaders are compiled and the first frame is on screen.
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => onReady());
    });
    return () => cancelAnimationFrame(id);
  }, [onReady]);

  useFrame((state, delta) => tick(state, delta, parts, refs));


  const { garment, stitches, materials, offset, unit } = parts;
  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight ref={key} position={[2.2, 2.4, 3.2]} intensity={0.35} />
      <directionalLight ref={rim} position={[-2.6, 1.4, -2.8]} intensity={0.6} color="#fff1c2" />
      <directionalLight position={[2.8, -0.6, -2.4]} intensity={0.5} color="#ffe9a8" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 3, 2]} scale={[6, 2, 1]} rotation-x={Math.PI / 2.4} />
        <Lightformer form="rect" intensity={0.8} position={[-4, 0.5, 1]} scale={[2, 4, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="ring" intensity={1.2} color="#ffe500" position={[3.5, 0.5, -2]} scale={1.6} />
      </Environment>
      <group ref={root}>
        <group ref={spin}>
          <group scale={unit}>
            <group position={offset}>
              <group position={garment.position} scale={garment.scale}>
                <mesh geometry={garment.geometry} material={materials.garment} />
                <mesh geometry={garment.geometry} material={materials.ghost} renderOrder={2} />
                <lineSegments geometry={parts.edges} material={materials.edges} renderOrder={3} />
              </group>
              <group position={stitches.position} scale={stitches.scale}>
                <mesh geometry={stitches.geometry} material={materials.stitches} />
                <pointLight ref={sewLight} position={[0, 1, 1.6]} color="#ffe500" intensity={0} distance={0} decay={2} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}
