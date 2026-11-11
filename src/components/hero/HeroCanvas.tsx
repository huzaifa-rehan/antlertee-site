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
import { heroLayout, heroProgress, range, smooth } from "./store";

const MODEL_URL = "/models/hoodie.glb";
const YELLOW = new THREE.Color("#ffe500");
const GREIGE = new THREE.Color("#d4ccbb");
const PAPER = new THREE.Color("#f4f2ee");
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

const NOISE_GLSL = /* glsl */ `
float acsHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float acsNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(acsHash(i), acsHash(i + vec2(1.0, 0.0)), f.x), mix(acsHash(i + vec2(0.0, 1.0)), acsHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float acsFbm(vec2 p) { return 0.6 * acsNoise(p) + 0.3 * acsNoise(p * 2.1) + 0.1 * acsNoise(p * 4.3); }
`;

/** Shared uniforms, mutated every frame. Positions are the model's quantised local space (-1..1). */
function createUniforms() {
  return {
    uCut: { value: -1.2 },
    uCutGlow: { value: 1 },
    uDye: { value: -1.5 },
    uSew: { value: -0.1 },
    uGreige: { value: GREIGE.clone() },
    uYellow: { value: YELLOW.clone() },
    uGhost: { value: 1 },
    uEdges: { value: 0.5 },
    uPaper: { value: PAPER.clone() },
  };
}
type Uniforms = ReturnType<typeof createUniforms>;

const withLocalPosition = (vertexShader: string) =>
  vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vAcsPos;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvAcsPos = position;");

function garmentMaterial(source: THREE.MeshStandardMaterial, u: Uniforms): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    map: source.map,
    normalMap: source.normalMap,
    roughnessMap: source.roughnessMap,
    metalnessMap: source.metalnessMap,
    roughness: source.roughness,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = withLocalPosition(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vAcsPos;
        uniform float uCut; uniform float uCutGlow; uniform float uDye; uniform vec3 uGreige; uniform vec3 uYellow;
        ${NOISE_GLSL}`,
      )
      // Pattern & cut: fabric exists only below the cut line.
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vAcsPos.y > uCut) discard;")
      // Wash: greige knit below, real texture rising from the hem with a ragged, darker wet edge.
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          vec4 acsTex = texture2D(map, vMapUv);
        #else
          vec4 acsTex = vec4(1.0);
        #endif
        float acsN = acsFbm(vAcsPos.xz * 2.4 + vec2(vAcsPos.y * 1.3));
        float acsFront = uDye + (acsN - 0.5) * 0.45;
        float acsDyed = 1.0 - smoothstep(acsFront - 0.05, acsFront + 0.05, vAcsPos.y);
        vec3 acsGreige = uGreige * (0.88 + 0.22 * acsFbm(vAcsPos.xy * 16.0));
        // Grey acid wash (the model's own black reads as nothing on the ink background): marbled
        // light/dark blotches, with the flame print kept as lighter lines from the texture's luminance.
        float acsMarble = acsFbm(vAcsPos.xy * 4.5 + 1.6 * acsFbm(vAcsPos.zy * 3.0 + 7.0));
        vec3 acsAcid = mix(vec3(0.075, 0.075, 0.072), vec3(0.36, 0.355, 0.345), smoothstep(0.4, 0.7, acsMarble));
        acsAcid = min(acsAcid + vec3(dot(acsTex.rgb, vec3(0.299, 0.587, 0.114))) * 0.5, vec3(0.7));
        diffuseColor.rgb *= mix(acsGreige, acsAcid, acsDyed);
        float acsWet = (1.0 - smoothstep(0.0, 0.14, abs(vAcsPos.y - acsFront))) * step(-1.3, uDye) * step(uDye, 1.3);
        diffuseColor.rgb *= 1.0 - 0.5 * acsWet;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float acsEdge = 1.0 - smoothstep(0.0, 0.035, uCut - vAcsPos.y);
        totalEmissiveRadiance += uYellow * acsEdge * uCutGlow * 2.6;`,
      );
  };
  mat.customProgramCacheKey = () => "acs-garment";
  return mat;
}

function stitchMaterial(source: THREE.MeshStandardMaterial, u: Uniforms): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: source.color.clone(),
    roughness: 0.55,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = withLocalPosition(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vAcsPos;
        uniform float uSew; uniform vec3 uYellow;`,
      )
      // Sew from the top of the hood down and outwards; nothing exists ahead of the needle.
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        float acsC = (1.0 - vAcsPos.y) * 0.5 + abs(vAcsPos.x) * 0.12;
        float acsBehind = uSew - acsC;
        if (acsBehind < 0.0) discard;
        float acsHeat = exp(-acsBehind * 13.0);`,
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uYellow, acsHeat);",
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uYellow * acsHeat * 3.2;",
      );
  };
  mat.customProgramCacheKey = () => "acs-stitch";
  return mat;
}

/** Fresnel "x-ray" shell shown above the cut line in the first phase. */
function ghostMaterial(u: Uniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uCut: u.uCut, uGhost: u.uGhost, uPaper: u.uPaper },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = position.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uCut; uniform float uGhost; uniform vec3 uPaper;
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        if (vY < uCut) discard;
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        gl_FragColor = vec4(uPaper, (0.035 + f * 0.55) * uGhost);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/** Crease lines ("pattern") that vanish as the fabric is cut below them. */
function edgeMaterial(u: Uniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uCut: u.uCut, uEdges: u.uEdges, uYellow: u.uYellow, uPaper: u.uPaper },
    vertexShader: /* glsl */ `
      varying float vY;
      void main() { vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uCut; uniform float uEdges; uniform vec3 uYellow; uniform vec3 uPaper;
      varying float vY;
      void main() {
        float d = vY - uCut;
        if (d < 0.0) discard;
        float near = 1.0 - smoothstep(0.0, 0.08, d);
        gl_FragColor = vec4(mix(uPaper, uYellow, near), uEdges * (0.55 + near));
      }`,
    transparent: true,
    depthWrite: false,
  });
}

interface Parts {
  garment: { geometry: THREE.BufferGeometry; position: THREE.Vector3; scale: THREE.Vector3 };
  stitches: { geometry: THREE.BufferGeometry; position: THREE.Vector3; scale: THREE.Vector3 };
  edges: THREE.EdgesGeometry;
  /** Moves the model so its bounding box is centred on the origin. */
  offset: THREE.Vector3;
  /** Scales the model to 1 unit tall. */
  unit: number;
  /** Width / height of the garment. */
  aspect: number;
  materials: { garment: THREE.MeshStandardMaterial; stitches: THREE.MeshStandardMaterial; ghost: THREE.ShaderMaterial; edges: THREE.ShaderMaterial };
  uniforms: Uniforms;
  dispose: () => void;
}

function buildParts(scene: THREE.Object3D): Parts {
  scene.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  const stitchMesh = meshes.find((m) => /stitch/i.test(m.name));
  const garmentMesh = meshes.find((m) => m !== stitchMesh);
  if (!stitchMesh || !garmentMesh) throw new Error("hoodie.glb: expected a garment mesh and a stitches mesh");

  const describe = (m: THREE.Mesh) => {
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    m.matrixWorld.decompose(position, new THREE.Quaternion(), scale);
    return { geometry: m.geometry, position, scale };
  };
  const garment = describe(garmentMesh);
  const stitches = describe(stitchMesh);

  garmentMesh.geometry.computeBoundingBox();
  const box = garmentMesh.geometry.boundingBox!.clone().applyMatrix4(garmentMesh.matrixWorld);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const uniforms = createUniforms();
  const materials = {
    garment: garmentMaterial(garmentMesh.material as THREE.MeshStandardMaterial, uniforms),
    stitches: stitchMaterial(stitchMesh.material as THREE.MeshStandardMaterial, uniforms),
    ghost: ghostMaterial(uniforms),
    edges: edgeMaterial(uniforms),
  };
  const edges = new THREE.EdgesGeometry(garmentMesh.geometry, 32);

  return {
    garment,
    stitches,
    edges,
    offset: center.negate(),
    unit: 1 / size.y,
    aspect: size.x / size.y,
    materials,
    uniforms,
    dispose: () => {
      edges.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    },
  };
}

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
