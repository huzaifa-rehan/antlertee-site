"use client";

/**
 * The Process page hoodie: the transparent ghost hoodie (the home film's look before its finish), floating gently,
 * that the visitor turns by dragging (mouse or touch) or with the arrow keys. It turns mainly about the vertical axis
 * with a little tilt, keeps spinning with inertia on release and drifts back to a 3/4 pose when left alone. The
 * sleeves swing: they lag and flare as it is turned or flicked, and a drag on either side of the garment grabs that
 * sleeve, which springs back on release.
 *
 * Input lives in a mutable `GhostInput` (ghostInput.ts) written by ProcessHoodie's pointer handlers and read here
 * each frame, so nothing re-renders React. Loaded with next/dynamic (no SSR) only where it is used.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { REST_YAW, type GhostInput } from "./ghostInput";
import { buildParts, MODEL_URL } from "./hoodie";

useGLTF.preload(MODEL_URL, false, true);

interface GhostHoodieProps {
  input: RefObject<GhostInput>;
  /** False when offscreen or the tab is hidden: rendering stops. */
  active: boolean;
  reduced: boolean;
  onReady: () => void;
}

export default function GhostHoodie({ input, active, reduced, onReady }: GhostHoodieProps) {
  const [maxDpr] = useState(() => (window.innerWidth < 860 ? 1.5 : 1.75));
  return (
    <Canvas
      dpr={[1, maxDpr]}
      frameloop={!active ? "never" : reduced ? "demand" : "always"}
      camera={{ fov: 28, position: [0, 0, 4], near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Suspense fallback={null}>
        <Ghost input={input} reduced={reduced} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

/* ------------------------------------------------------------------------------------------------ */

// Sleeve swing in garment-local space (x +-0.94, y +-1): sleeves rotate about the shoulder, outward (about z) and
// forward / back (about x), weighted so the body and hood stay put.
const SWING_GLSL = /* glsl */ `
uniform vec2 uSwingL; uniform vec2 uSwingR;
uniform float uSwK; uniform vec3 uSwB;
vec3 acsSwing(vec3 local, inout vec3 n) {
  vec3 p = local * uSwK + uSwB;
  float side = p.x < 0.0 ? -1.0 : 1.0;
  float w = smoothstep(0.4, 0.62, abs(p.x)) * (1.0 - smoothstep(0.5, 0.72, p.y));
  vec2 sw = side > 0.0 ? uSwingR : uSwingL;
  float a = side * sw.x * w;
  float b = sw.y * w;
  mat3 rz = mat3(cos(a), sin(a), 0.0, -sin(a), cos(a), 0.0, 0.0, 0.0, 1.0);
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(b), sin(b), 0.0, -sin(b), cos(b));
  mat3 r = rx * rz;
  vec3 piv = vec3(side * 0.5, 0.6, 0.0);
  n = r * n;
  return ((piv + r * (p - piv)) - uSwB) / uSwK;
}
`;

function createSwing() {
  return { uSwingL: { value: new THREE.Vector2() }, uSwingR: { value: new THREE.Vector2() } };
}

function buildGhost(scene: THREE.Object3D) {
  const parts = buildParts(scene);
  const swing = createSwing();
  const g = parts.garment;
  const s = parts.stitches;
  const u = parts.uniforms;
  // The finished ghost: shell and pattern lines everywhere, seams fully sewn in pale thread.
  u.uCut.value = -1.2;
  u.uGhost.value = 1;
  u.uEdges.value = 0.42;
  u.uSew.value = 2;
  const local = { uSwK: { value: 1 }, uSwB: { value: new THREE.Vector3() } };

  const ghost = parts.materials.ghost;
  Object.assign(ghost.uniforms, swing, local);
  ghost.vertexShader = ghost.vertexShader
    .replace("void main() {", `${SWING_GLSL}\nvoid main() {`)
    .replace(
      "vec4 mv = modelViewMatrix * vec4(position, 1.0);\n        vN = normalize(normalMatrix * normal);",
      "vec3 acsN = normal; vec3 acsP = acsSwing(position, acsN);\n        vec4 mv = modelViewMatrix * vec4(acsP, 1.0);\n        vN = normalize(normalMatrix * acsN);",
    );
  const edges = parts.materials.edges;
  Object.assign(edges.uniforms, swing, local);
  edges.vertexShader = edges.vertexShader
    .replace("void main() {", `${SWING_GLSL}\nvoid main() {`)
    .replace(
      "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      "vec3 acsN = vec3(0.0, 0.0, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(acsSwing(position, acsN), 1.0);",
    );
  const stitches = parts.materials.stitches;
  stitches.color.set("#d8d2c6");
  const base = stitches.onBeforeCompile.bind(stitches);
  stitches.onBeforeCompile = (shader, renderer) => {
    base(shader, renderer);
    Object.assign(shader.uniforms, swing, {
      uSwK: { value: s.scale.x / g.scale.x },
      uSwB: { value: s.position.clone().sub(g.position).divideScalar(g.scale.x) },
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${SWING_GLSL}`)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed = acsSwing(transformed, objectNormal);");
  };
  stitches.customProgramCacheKey = () => "acs-stitch-swing";
  return { parts, swing };
}

const damp = THREE.MathUtils.damp;
/** Sleeve spring: stiffness and damping. */
const K_SPRING = 55;
const C_SPRING = 7;

interface SleeveState {
  out: number;
  fwd: number;
  vOut: number;
  vFwd: number;
}

function Ghost({ input, reduced, onReady }: { input: RefObject<GhostInput>; reduced: boolean; onReady: () => void }) {
  const gltf = useGLTF(MODEL_URL, false, true);
  const built = useMemo(() => buildGhost(gltf.scene), [gltf.scene]);
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const sleeves = useRef<{ l: SleeveState; r: SleeveState; time: number }>({
    l: { out: 0, fwd: 0, vOut: 0, vFwd: 0 },
    r: { out: 0, fwd: 0, vOut: 0, vFwd: 0 },
    time: 0,
  });
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => () => built.parts.dispose(), [built]);
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => onReady());
    });
    return () => cancelAnimationFrame(id);
  }, [onReady]);

  useFrame((state, delta) => stepGhost(state, Math.min(delta, 1 / 20), input.current, reduced, built, root.current, spin.current, sleeves.current, invalidate));

  const { garment, stitches, materials, offset, unit, edges } = built.parts;
  return (
    <group ref={root}>
      <group ref={spin}>
        <group scale={unit}>
          <group position={offset}>
            <group position={garment.position} scale={garment.scale}>
              <mesh geometry={garment.geometry} material={materials.ghost} renderOrder={2} />
              <lineSegments geometry={edges} material={materials.edges} renderOrder={3} />
            </group>
            <group position={stitches.position} scale={stitches.scale}>
              <mesh geometry={stitches.geometry} material={materials.stitches} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Per-frame physics and layout. Mutates the input object, transforms and uniforms only. */
function stepGhost(
  state: { viewport: { width: number; height: number }; clock: THREE.Clock },
  dt: number,
  input: GhostInput,
  reduced: boolean,
  built: ReturnType<typeof buildGhost>,
  root: THREE.Group | null,
  spin: THREE.Group | null,
  sl: { l: SleeveState; r: SleeveState; time: number },
  invalidate: () => void,
): void {
  sl.time += dt;
  const idle = performance.now() - input.lastInput > 1800 && input.grab === 0;
  // Inertia, then a soft drift back to the nearest 3/4 resting pose when left alone.
  input.yaw += input.yawVel * dt;
  input.yawVel = damp(input.yawVel, 0, 2.6, dt);
  if (idle && !reduced) {
    const turns = Math.round((input.yaw - REST_YAW) / (Math.PI * 2));
    input.yaw = damp(input.yaw, REST_YAW + turns * Math.PI * 2 + Math.sin(sl.time * 0.35) * 0.12, 0.9, dt);
    input.pitch = damp(input.pitch, 0.05, 1.2, dt);
  }

  // Sleeves: spring towards the grab offset plus a lag / flare from the turn speed.
  const v = THREE.MathUtils.clamp(input.yawVel, -6, 6);
  const flare = Math.min(Math.abs(v) * 0.045, 0.3);
  const stepSleeve = (s: SleeveState, side: -1 | 1) => {
    const grabbed = input.grab === side;
    const tOut = flare + (grabbed ? input.grabOut : 0);
    const tFwd = side * v * 0.04 + (grabbed ? input.grabFwd : 0);
    s.vOut += (-K_SPRING * (s.out - tOut) - C_SPRING * s.vOut) * dt;
    s.vFwd += (-K_SPRING * (s.fwd - tFwd) - C_SPRING * s.vFwd) * dt;
    s.out = THREE.MathUtils.clamp(s.out + s.vOut * dt, -0.35, 1.1);
    s.fwd = THREE.MathUtils.clamp(s.fwd + s.vFwd * dt, -0.9, 0.9);
  };
  stepSleeve(sl.l, -1);
  stepSleeve(sl.r, 1);
  built.swing.uSwingL.value.set(sl.l.out, sl.l.fwd);
  built.swing.uSwingR.value.set(sl.r.out, sl.r.fwd);

  if (spin) {
    spin.rotation.y = input.yaw;
    spin.rotation.x = input.pitch;
  }
  if (root) {
    const { width: vw, height: vh } = state.viewport;
    const s = Math.min(vh * 0.86, (vw * 0.92) / 0.95);
    root.scale.setScalar(s);
    root.position.y = reduced ? 0 : Math.sin(sl.time * 0.8) * 0.025 * s;
  }

  // Under reduced motion the canvas renders on demand: keep drawing only while something still moves.
  const moving =
    Math.abs(input.yawVel) > 0.01 ||
    input.grab !== 0 ||
    [sl.l.vOut, sl.l.vFwd, sl.r.vOut, sl.r.vFwd, sl.l.out, sl.r.out].some((x) => Math.abs(x) > 0.002);
  if (reduced && moving) invalidate();
}
