"use client";

/**
 * The home hero's 3D path ("Yarn to pack."): the stitched 2D drawing hands over to the 3D hoodie, which then
 *
 *    7.30  appears as a transparent ghost over the drawing, front on, while a yellow thread front re-sews it
 *    8.60  wash: the fabric materialises from the hem with a yellow scan edge, the grey acid wash rising behind it
 *   10.30  print & brand: a yellow YOUR BRAND print wipes across the chest (the woven label card is YarnToPack's)
 *   12.20  fold & pack: laid flat, the sleeves fold behind the body, the body folds in half (print stays on the
 *          front), it lies down, three copies slide out into a row of four, they settle into a stack, a kraft box
 *          rises in, the stack drops in, the flaps close, tape, and the Antlertee label is stamped on
 *
 * Folding is real geometry: a vertex-shader patch rotates the sleeves about the side seams and the lower body about
 * the fold line (with a rounded crease), rotating normals with them so pieces darken as they pass edge-on.
 *
 * The clock is YarnToPack's: the canvas uses frameloop "never" and renders only when `api.render(t)` is called, so
 * it costs nothing while paused, offscreen, in a hidden tab, or during the 2D scenes. Loaded with next/dynamic (no
 * SSR) only for the home hero's 3D variant.
 */
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { buildParts, MODEL_URL, type Parts } from "@/components/hero/hoodie";
import { ease, easeOut, seg, type Pack3DApi } from "./HeroPackTimes";

useGLTF.preload(MODEL_URL, false, true);

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
      camera={{ fov: 28, position: [0, 0, 4], near: 0.1, far: 30 }}
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
/* Stage mapping: the canvas covers YarnToPack's 480 x 460 SVG viewBox exactly. */

const SVG_W = 480;
const SVG_H = 460;
/** Model units -> SVG units, so hood top (y 48) to hem (y 408) matches the stitched drawing. */
const SVG_PER_MODEL = 404;
/** Where the model's centre sits on the stage when it takes over from the drawing. */
const HOODIE_AT = { x: 240, y: 251 };
/** The angle the garment folds at: enough turn to see the sleeves swing back. */
const FOLD_ANGLE = -0.38;
const HERO_ANGLE = -0.62;

/* Packing table (SVG units, y up along the table normal), tilted so the box top shows. */
const TILT = 0.75;
const TABLE_AT = { x: 240, y: 366 };
const SMALL = 0.4; // folded hoodie scale in the row, stack and box
const SPACING = 97; // row of four
const ROW_Y = 250;
const THICK = 22; // stack spacing
const STACK_Y = 140; // stack bottom before it drops
const BOX = { w: 168, d: 136, h: 110, wall: 3 };
/** Model-space centre of the folded garment (hood top to fold line), used to keep it centred as it folds. */
const FOLDED_CY = 0.225;

/* ------------------------------------------------------------------------------------------------ */
/* Fold + print shader patches, chained onto the shared hoodie materials. */

function createFoldUniforms() {
  return { uFlat: { value: 0 }, uSleeveL: { value: 0 }, uSleeveR: { value: 0 }, uHalf: { value: 0 } };
}
type FoldUniforms = ReturnType<typeof createFoldUniforms>;

// Fold maths in the garment mesh's local space (x +-0.94, y +-1, z -0.48..0.48, front +z).
const FOLD_GLSL = /* glsl */ `
uniform float uFlat; uniform float uSleeveL; uniform float uSleeveR; uniform float uHalf;
uniform float uFoldK; uniform vec3 uFoldB;
varying float vAcsShade;
varying vec3 vAcsNrm;
mat3 acsRotY(float a) { float c = cos(a); float s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 acsRotX(float a) { float c = cos(a); float s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
const float ACS_PI = 3.14159265;
const float ACS_ZC = 0.07;  // laid flat about this plane
const float ACS_XS = 0.5;   // sleeve fold lines (the side seams)
const float ACS_YF = -0.1;  // body fold line, just under the chest print
void acsFold(inout vec3 p, inout vec3 n, inout vec3 t, out float shade) {
  // Lay flat: squash depth (normals take the inverse scale).
  float sz = mix(1.0, 0.2, uFlat);
  p.z = ACS_ZC + (p.z - ACS_ZC) * sz; n.z /= sz; t.z *= sz;
  float zBack = ACS_ZC - 0.4 * sz;
  // Sleeves swing back about the side seam and lie across the back, flattening as they go.
  float side = p.x < 0.0 ? -1.0 : 1.0;
  float ua = side > 0.0 ? uSleeveR : uSleeveL;
  float wa = smoothstep(ACS_XS - 0.05, ACS_XS + 0.05, abs(p.x));
  float fa = ua * wa;
  float ca = mix(1.0, 0.5, ua * sqrt(wa));
  mat3 ry = acsRotY(fa * ACS_PI * side);
  vec3 piv = vec3(side * ACS_XS, 0.0, zBack);
  vec3 d = p - piv; d.z *= ca;
  p = piv + ry * d; n.z /= ca; n = ry * n; t.z *= ca; t = ry * t;
  // The lower body (and the sleeves on it) folds up behind about the fold line, with a rounded crease.
  // Depth squashes ahead of the angle across the crease, so the roll stays tight instead of bulging down.
  float wb = 1.0 - smoothstep(ACS_YF - 0.045, ACS_YF + 0.045, p.y);
  float fb = uHalf * wb;
  float cb = mix(1.0, 0.3, uHalf * sqrt(wb));
  mat3 rx = acsRotX(fb * ACS_PI);
  vec3 piv2 = vec3(0.0, ACS_YF, zBack - 0.42 * sz);
  vec3 e = p - piv2; e.z *= cb;
  p = piv2 + rx * e; n.z /= cb; n = rx * n; t.z *= cb; t = rx * t;
  shade = max(sin(fa * ACS_PI), sin(fb * ACS_PI));
}
`;

/** Print area on the chest, garment-local x0, x1, y0, y1 (planar projection from the front). */
const PRINT_BOX = [-0.34, 0.34, 0.06, 0.4] as const;

/**
 * Adds folding to a shared hoodie material. `k`/`b` map the mesh's local space into the garment's
 * (the stitches mesh has its own quantised space). With `print`, the chest print is added (garment only).
 */
function addFold(
  mat: THREE.MeshStandardMaterial,
  fold: FoldUniforms,
  k: number,
  b: THREE.Vector3,
  cacheKey: string,
  print?: { map: { value: THREE.Texture }; amount: { value: number } },
): void {
  const base = mat.onBeforeCompile.bind(mat);
  mat.onBeforeCompile = (shader, renderer) => {
    base(shader, renderer);
    Object.assign(shader.uniforms, fold, { uFoldK: { value: k }, uFoldB: { value: b } });
    if (print) Object.assign(shader.uniforms, { uPrintMap: print.map, uPrint: print.amount });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${FOLD_GLSL}`)
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        vec3 acsP = position * uFoldK + uFoldB;
        vec3 acsT = vec3(1.0, 0.0, 0.0);
        #ifdef USE_TANGENT
          acsT = objectTangent;
        #endif
        vAcsNrm = objectNormal;
        acsFold(acsP, objectNormal, acsT, vAcsShade);
        #ifdef USE_TANGENT
          objectTangent = acsT;
        #endif`,
      )
      .replace("vAcsPos = position;", "vAcsPos = position;\ntransformed = (acsP - uFoldB) / uFoldK;");
    const [x0, x1, y0, y1] = PRINT_BOX.map((v) => v.toFixed(3));
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vAcsShade; varying vec3 vAcsNrm;
        ${print ? "uniform sampler2D uPrintMap; uniform float uPrint;" : ""}`,
      )
      .replace(
        "#include <normal_fragment_begin>",
        `${
          print
            ? `vec2 acsPuv = vec2((vAcsPos.x - ${x0}) / (${x1} - ${x0}), (vAcsPos.y - ${y0}) / (${y1} - ${y0}));
        float acsIn = step(0.0, acsPuv.x) * step(acsPuv.x, 1.0) * step(0.0, acsPuv.y) * step(acsPuv.y, 1.0)
          * step(0.1, vAcsPos.z) * smoothstep(0.15, 0.45, vAcsNrm.z) * (gl_FrontFacing ? 1.0 : 0.0);
        float acsWipe = uPrint * 1.12 - 0.06;
        float acsInk = texture2D(uPrintMap, clamp(acsPuv, 0.0, 1.0)).a * acsIn * step(acsPuv.x, acsWipe);
        float acsBlade = acsIn * (1.0 - smoothstep(0.0, 0.025, abs(acsPuv.x - acsWipe))) * step(0.001, uPrint) * step(uPrint, 0.999);
        diffuseColor.rgb = mix(diffuseColor.rgb, uYellow * 0.92, acsInk);`
            : ""
        }
        diffuseColor.rgb *= 1.0 - 0.65 * vAcsShade;
        #include <normal_fragment_begin>`,
      );
    if (print) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uYellow * (acsInk * 0.3 + acsBlade * 2.2);",
      );
    }
  };
  mat.customProgramCacheKey = () => cacheKey;
}

/** "YOUR / BRAND" in Gabarito, white on transparent (only alpha is used). */
function createPrintTexture(): { texture: THREE.CanvasTexture; dispose: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-gabarito").trim() || "Arial Black";
  const font = `900 112px ${family}, "Arial Black", sans-serif`;
  let live = true;
  const draw = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx || !live) return;
    ctx.clearRect(0, 0, 512, 256);
    ctx.fillStyle = "#fff";
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.letterSpacing = "-4px";
    ctx.fillText("YOUR", 256, 112);
    ctx.fillText("BRAND", 256, 226);
    texture.needsUpdate = true;
  };
  draw();
  document.fonts.load(font).then(draw, () => {});
  return {
    texture,
    dispose: () => {
      live = false;
      texture.dispose();
    },
  };
}

/** The box label: an ink card with a dashed yellow edge and the white Antlertee logo. */
function createLabelTexture(): { texture: THREE.CanvasTexture; dispose: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const img = new Image();
  let live = true;
  const draw = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx || !live) return;
    ctx.fillStyle = "#0d0c0b";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#ffe500";
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 7]);
    ctx.strokeRect(12, 12, 232, 232);
    if (img.complete && img.naturalWidth > 0) {
      const h = 200;
      const w = (h * img.naturalWidth) / img.naturalHeight;
      ctx.drawImage(img, 128 - w / 2, 28, w, h);
    }
    texture.needsUpdate = true;
  };
  img.onload = draw;
  img.src = "/brand/logo-full-white.png";
  draw();
  return {
    texture,
    dispose: () => {
      live = false;
      img.onload = null;
      texture.dispose();
    },
  };
}

/* ------------------------------------------------------------------------------------------------ */

interface Assets {
  parts: Parts;
  fold: FoldUniforms;
  printAmount: { value: number };
  kraft: THREE.MeshStandardMaterial;
  flapMat: THREE.MeshStandardMaterial;
  tapeMat: THREE.MeshStandardMaterial;
  labelMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

function buildAssets(scene: THREE.Object3D): Assets {
  const parts = buildParts(scene);
  const fold = createFoldUniforms();
  const print = createPrintTexture();
  const label = createLabelTexture();
  const printAmount = { value: 0 };
  const g = parts.garment;
  const s = parts.stitches;
  addFold(parts.materials.garment, fold, 1, new THREE.Vector3(), "acs-garment-fold", { map: { value: print.texture }, amount: printAmount });
  // Stitch-local -> garment-local (both meshes have uniform node scales).
  addFold(parts.materials.stitches, fold, s.scale.x / g.scale.x, s.position.clone().sub(g.position).divideScalar(g.scale.x), "acs-stitch-fold");
  const kraft = new THREE.MeshStandardMaterial({ color: "#b8895a", roughness: 0.88, side: THREE.DoubleSide });
  const flapMat = new THREE.MeshStandardMaterial({ color: "#c99c6c", roughness: 0.85, side: THREE.DoubleSide });
  const tapeMat = new THREE.MeshStandardMaterial({ color: "#ffe500", roughness: 0.45, emissive: "#ffe500", emissiveIntensity: 0.12 });
  const labelMat = new THREE.MeshStandardMaterial({
    map: label.texture,
    emissiveMap: label.texture,
    emissive: "#ffffff",
    emissiveIntensity: 0.45,
    roughness: 0.8,
    transparent: true,
    opacity: 0,
  });
  return {
    parts,
    fold,
    printAmount,
    kraft,
    flapMat,
    tapeMat,
    labelMat,
    dispose: () => {
      parts.dispose();
      print.dispose();
      label.dispose();
      [kraft, flapMat, tapeMat, labelMat].forEach((m) => m.dispose());
    },
  };
}

interface Refs {
  copies: (THREE.Group | null)[];
  centres: (THREE.Group | null)[];
  ghost: THREE.Mesh | null;
  edges: THREE.LineSegments | null;
  stitches: THREE.Mesh | null;
  key: THREE.DirectionalLight | null;
  fill: THREE.DirectionalLight | null;
  rim: THREE.DirectionalLight | null;
  sewLight: THREE.PointLight | null;
  box: THREE.Group | null;
  boxLift: THREE.Group | null;
  flaps: (THREE.Group | null)[];
  tape: THREE.Group | null;
  label: THREE.Mesh | null;
}

type ListKey = "copies" | "centres" | "flaps";
type SingleKey = Exclude<keyof Refs, ListKey>;
/** Ref callbacks for the scene parts (children may not mutate the parent's refs directly). */
interface Register {
  set: <K extends SingleKey>(key: K, value: Refs[K]) => void;
  at: (key: ListKey, index: number, value: THREE.Group | null) => void;
}

const TABLE_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), TILT);
const V = new THREE.Vector3();
const A = new THREE.Vector3();
const B = new THREE.Vector3();

/** SVG point -> world point on the z = 0 plane. */
function svgToWorld(x: number, y: number, vp: { width: number; height: number }, out: THREE.Vector3) {
  return out.set((x / SVG_W - 0.5) * vp.width, (0.5 - y / SVG_H) * vp.height, 0);
}

/** Packing-table point (SVG units, y up the table normal, z towards the camera) -> world. */
function tableToWorld(x: number, y: number, z: number, vp: { width: number; height: number }, out: THREE.Vector3) {
  const k = vp.height / SVG_H;
  V.set(x * k, y * k, z * k).applyQuaternion(TABLE_Q);
  return svgToWorld(TABLE_AT.x, TABLE_AT.y, vp, out).add(V);
}

const lerp = THREE.MathUtils.lerp;
// Row slots: three clones (0..2) and the folded original (3); stack order puts the original on top.
const ROW_SLOT = [-1.5, 0.5, 1.5, -0.5] as const;
const PILE_JITTER = [3, -4, 2, 0] as const;
// Flaps: left and right (inner) close first, then back and front (outer). Open angles splay outwards.
const FLAP_OPEN = [2.05, -2.05, -2.0, 2.0] as const;
const FLAP_TIME = [17.35, 17.45, 17.7, 17.8] as const;

/** Per-frame update at garment time `t`. Mutates objects, uniforms and materials only. */
function update(state: RootState, t: number, a: Assets, r: Refs, all = false): void {
  const vp = state.viewport;
  const u = a.parts.uniforms;
  const f = a.fold;
  const kWorld = vp.height / SVG_H;

  // ----- ghost -> stitch sweep -> materialise + acid wash -> print -----
  u.uSew.value = lerp(-0.05, 1.28, seg(t, 7.3, 8.4));
  u.uGhost.value = 1 - seg(t, 9.2, 9.75);
  u.uEdges.value = 0.5 * (1 - seg(t, 9.0, 9.5));
  u.uCut.value = lerp(-1.08, 1.08, ease(seg(t, 8.6, 9.65)));
  u.uCutGlow.value = 1 - seg(t, 9.55, 9.85);
  u.uDye.value = lerp(-1.5, 1.5, ease(seg(t, 8.75, 10.05)));
  a.printAmount.value = ease(seg(t, 10.45, 11.15));

  // ----- fold -----
  f.uFlat.value = ease(seg(t, 12.25, 12.7));
  f.uSleeveR.value = ease(seg(t, 12.6, 13.2));
  f.uSleeveL.value = ease(seg(t, 12.78, 13.38));
  f.uHalf.value = ease(seg(t, 13.45, 14.05));

  // ----- lights -----
  const brand = seg(t, 10.3, 11.3) * (1 - seg(t, 12.2, 12.8));
  // A touch more key light once the folded pieces lie down, so the dark wash reads on the ink background.
  if (r.key) r.key.intensity = 0.35 + 1.45 * ease(seg(t, 8.6, 9.6)) + 1.1 * seg(t, 14.0, 14.6);
  // Low front fill for the box, so its front face and label read.
  if (r.fill) r.fill.intensity = 1.6 * seg(t, 16.1, 16.7);
  if (r.rim) r.rim.intensity = 0.6 + 3.2 * brand;
  if (r.sewLight) {
    r.sewLight.intensity = 0.9 * seg(t, 7.3, 7.45) * (1 - seg(t, 8.2, 8.45));
    r.sewLight.position.y = 1 - 2 * Math.max(0, u.uSew.value);
  }

  // ----- copies: the original takes over from the drawing, folds, lies down; clones slide out; all stack and drop -----
  const lie = ease(seg(t, 14.05, 14.65));
  const spread = ease(seg(t, 14.75, 15.45));
  const settle = ease(seg(t, 15.6, 16.2));
  const drop = ease(seg(t, 16.75, 17.3));
  const sWorld = kWorld * SVG_PER_MODEL;
  let spin = HERO_ANGLE * ease(seg(t, 7.9, 9.7)) + 0.07 * Math.sin((t - 7.9) * 0.9) * seg(t, 7.9, 8.6);
  spin = lerp(spin, FOLD_ANGLE, ease(seg(t, 12.15, 12.6)));
  r.copies.forEach((g, i) => {
    const centre = r.centres[i];
    if (!g || !centre) return;
    const original = i === 3;
    const visible = all || (original ? t >= 7.25 : t >= 14.7);
    g.visible = visible;
    if (!visible) return;
    centre.position.y = -FOLDED_CY * f.uHalf.value;
    // Table position: row slot -> stack -> dropped into the box.
    const slot = ROW_SLOT[i] ?? 0;
    const order = original ? 3 : i;
    const rowX = slot * SPACING;
    const startX = ROW_SLOT[3] * SPACING;
    const x = lerp(lerp(startX, rowX, spread), PILE_JITTER[i] ?? 0, settle);
    const yRow = original ? ROW_Y : ROW_Y - 8;
    const y = lerp(yRow, STACK_Y + order * THICK, settle) - (STACK_Y - BOX.wall - 2) * drop;
    tableToWorld(x, y, original ? 0 : -4 * (1 - spread), vp, A);
    if (original && lie < 1) {
      svgToWorld(HOODIE_AT.x, HOODIE_AT.y, vp, B);
      B.y += Math.sin(t * 0.8) * 0.006 + FOLDED_CY * sWorld * f.uHalf.value;
      A.lerpVectors(B, A, lie);
    }
    g.position.copy(A);
    const sc = original ? lerp(sWorld, sWorld * SMALL, lie) : sWorld * SMALL;
    g.scale.setScalar(sc);
    g.rotation.y = original ? spin * (1 - lie) : 0;
    g.rotation.x = original ? lerp(0.04 * seg(t, 7.9, 8.6) * (1 - seg(t, 12.2, 12.6)), TILT - Math.PI / 2, lie) : TILT - Math.PI / 2;
  });
  if (r.ghost) r.ghost.visible = all || (u.uGhost.value > 0.001 && u.uCut.value < 1.07);
  if (r.edges) r.edges.visible = all || u.uEdges.value > 0.001;

  // ----- box: rises in, flaps close, tape, label stamp -----
  const boxIn = easeOut(seg(t, 16.1, 16.7));
  if (r.box) {
    r.box.visible = all || boxIn > 0;
    tableToWorld(0, 0, 0, vp, A);
    r.box.position.copy(A);
    r.box.scale.setScalar(kWorld);
  }
  if (r.boxLift) r.boxLift.position.y = -330 * (1 - boxIn);
  r.flaps.forEach((fl, i) => {
    if (!fl) return;
    const at = FLAP_TIME[i] ?? 17.5;
    const k = 1 - ease(seg(t, at, at + 0.4));
    const open = (FLAP_OPEN[i] ?? 2) * k;
    if (i < 2) fl.rotation.z = open;
    else fl.rotation.x = open;
  });
  if (r.tape) {
    const k = ease(seg(t, 18.1, 18.45));
    r.tape.visible = all || k > 0;
    r.tape.scale.x = Math.max(k, 0.001);
  }
  if (r.label) {
    const stamp = seg(t, 18.5, 18.85);
    r.label.visible = all || stamp > 0;
    a.labelMat.opacity = stamp;
    r.label.scale.setScalar(1.35 - 0.35 * easeOut(stamp));
  }
}

/* ------------------------------------------------------------------------------------------------ */

function Hoodie({ a, index, r }: { a: Assets; index: number; r: Register }) {
  const { garment, stitches, materials, offset, unit, edges } = a.parts;
  const original = index === 3;
  return (
    <group ref={(g) => r.at("copies", index, g)} visible={false}>
      <group ref={(g) => r.at("centres", index, g)}>
        <group scale={unit}>
          <group position={offset}>
            <group position={garment.position} scale={garment.scale}>
              <mesh geometry={garment.geometry} material={materials.garment} />
              {original && (
                <>
                  <mesh ref={(m) => r.set("ghost", m)} geometry={garment.geometry} material={materials.ghost} renderOrder={2} />
                  <lineSegments ref={(l) => r.set("edges", l)} geometry={edges} material={materials.edges} renderOrder={3} />
                </>
              )}
            </group>
            {original && (
              <group position={stitches.position} scale={stitches.scale}>
                <mesh ref={(m) => r.set("stitches", m)} geometry={stitches.geometry} material={materials.stitches} />
                <pointLight ref={(l) => r.set("sewLight", l)} position={[0, 1, 1.6]} color="#ffe500" intensity={0} distance={0} decay={2} />
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

/** Open-top kraft box in table units (SVG units, y up), its bottom centred on the origin. */
function Box({ a, r }: { a: Assets; r: Register }) {
  const { w, d, h, wall } = BOX;
  const flapH = 1.6;
  return (
    <group ref={(g) => r.set("box", g)} quaternion={TABLE_Q} visible={false}>
      <group ref={(g) => r.set("boxLift", g)}>
        <mesh material={a.kraft} position={[0, wall / 2, 0]}>
          <boxGeometry args={[w, wall, d]} />
        </mesh>
        <mesh material={a.kraft} position={[0, h / 2, d / 2 - wall / 2]}>
          <boxGeometry args={[w, h, wall]} />
        </mesh>
        <mesh material={a.kraft} position={[0, h / 2, -d / 2 + wall / 2]}>
          <boxGeometry args={[w, h, wall]} />
        </mesh>
        <mesh material={a.kraft} position={[-w / 2 + wall / 2, h / 2, 0]}>
          <boxGeometry args={[wall, h, d - 2 * wall]} />
        </mesh>
        <mesh material={a.kraft} position={[w / 2 - wall / 2, h / 2, 0]}>
          <boxGeometry args={[wall, h, d - 2 * wall]} />
        </mesh>
        {/* Inner flaps hinge on the side walls, outer flaps on the front and back walls (a touch higher). */}
        <group ref={(g) => r.at("flaps", 0, g)} position={[-w / 2, h, 0]}>
          <mesh material={a.flapMat} position={[w / 4, 0, 0]}>
            <boxGeometry args={[w / 2 - 2, flapH, d - 8]} />
          </mesh>
        </group>
        <group ref={(g) => r.at("flaps", 1, g)} position={[w / 2, h, 0]}>
          <mesh material={a.flapMat} position={[-w / 4, 0, 0]}>
            <boxGeometry args={[w / 2 - 2, flapH, d - 8]} />
          </mesh>
        </group>
        <group ref={(g) => r.at("flaps", 2, g)} position={[0, h + flapH + 0.4, -d / 2]}>
          <mesh material={a.flapMat} position={[0, 0, d / 4]}>
            <boxGeometry args={[w, flapH, d / 2 - 0.5]} />
          </mesh>
        </group>
        <group ref={(g) => r.at("flaps", 3, g)} position={[0, h + flapH + 0.4, d / 2]}>
          <mesh material={a.flapMat} position={[0, 0, -d / 4]}>
            <boxGeometry args={[w, flapH, d / 2 - 0.5]} />
          </mesh>
        </group>
        {/* Tape pulled across the seam of the outer flaps and down both sides. */}
        <group ref={(g) => r.set("tape", g)} position={[-w / 2 - 1, 0, 0]} visible={false}>
          <mesh material={a.tapeMat} position={[w / 2 + 1, h + 2 * flapH + 1, 0]}>
            <boxGeometry args={[w + 2, 0.8, 18]} />
          </mesh>
          <mesh material={a.tapeMat} position={[0, h - 14 + 2 * flapH, 0]}>
            <boxGeometry args={[0.8, 32, 18]} />
          </mesh>
          <mesh material={a.tapeMat} position={[w + 2, h - 14 + 2 * flapH, 0]}>
            <boxGeometry args={[0.8, 32, 18]} />
          </mesh>
        </group>
        <mesh ref={(m) => r.set("label", m)} material={a.labelMat} position={[0, h * 0.46, d / 2 + 0.6]} visible={false}>
          <planeGeometry args={[74, 74]} />
        </mesh>
      </group>
    </group>
  );
}

function Scene({ apiRef, onReady }: HeroPack3DProps) {
  const gltf = useGLTF(MODEL_URL, false, true);
  const assets = useMemo(() => buildAssets(gltf.scene), [gltf.scene]);
  const refs = useRef<Refs>({
    copies: [],
    centres: [],
    ghost: null,
    edges: null,
    stitches: null,
    key: null,
    fill: null,
    rim: null,
    sewLight: null,
    box: null,
    boxLift: null,
    flaps: [],
    tape: null,
    label: null,
  });
  const register = useMemo<Register>(
    () => ({
      set: (key, value) => {
        refs.current[key] = value;
      },
      at: (key, index, value) => {
        refs.current[key][index] = value;
      },
    }),
    [],
  );
  const clock = useRef(7.3);
  const get = useThree((s) => s.get);

  useEffect(() => () => assets.dispose(), [assets]);

  useFrame((state) => update(state, clock.current, assets, refs.current));

  // Compile every material up front (all parts visible) without blocking, then hand YarnToPack the render call.
  useEffect(() => {
    let live = true;
    const state = get();
    update(state, 8.6, assets, refs.current, true);
    const done = () => {
      if (!live) return;
      clock.current = 7.3;
      state.advance(performance.now());
      apiRef.current = {
        render: (t: number) => {
          clock.current = t;
          get().advance(performance.now());
        },
      };
      onReady();
    };
    state.gl.compileAsync(state.scene, state.camera).then(done, (err: unknown) => {
      console.warn("3D hoodie: shader precompile failed; compiling on first frame.", err);
      done();
    });
    return () => {
      live = false;
      apiRef.current = null;
    };
  }, [apiRef, assets, get, onReady]);

  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight ref={(l) => register.set("key", l)} position={[2.2, 2.4, 3.2]} intensity={0.35} />
      <directionalLight ref={(l) => register.set("fill", l)} position={[0.6, -1.2, 4]} intensity={0} />
      <directionalLight ref={(l) => register.set("rim", l)} position={[-2.6, 1.4, -2.8]} intensity={0.6} color="#fff1c2" />
      <directionalLight position={[2.8, -0.6, -2.4]} intensity={0.5} color="#ffe9a8" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 3, 2]} scale={[6, 2, 1]} rotation-x={Math.PI / 2.4} />
        <Lightformer form="rect" intensity={0.8} position={[-4, 0.5, 1]} scale={[2, 4, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="ring" intensity={1.2} color="#ffe500" position={[3.5, 0.5, -2]} scale={1.6} />
      </Environment>
      {[0, 1, 2, 3].map((i) => (
        <Hoodie key={i} a={assets} index={i} r={register} />
      ))}
      <Box a={assets} r={register} />
    </>
  );
}
