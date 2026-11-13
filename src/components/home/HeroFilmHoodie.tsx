"use client";

/**
 * The hoodie in the home hero's 3D film: the transparent ghost sewn by a glowing thread, the rainbow reflective finish
 * (after the Spotify bomber) swept on behind a scan line, the black chest print, the clean retail fold, and the four
 * folded copies that settle into a pile and drop into the box. Built on the shared hoodie materials (hero/hoodie.ts)
 * with fold / finish / print shader patches; everything per frame is written to uniforms and transforms.
 */
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { buildParts, garmentMaterial, MODEL_URL, type Parts } from "@/components/hero/hoodie";
import { Sparks } from "./HeroFilmMaking";
import { ease, HOODIE, K, lerp, revealAt, seg, sx, sy, type FilmClock } from "./HeroPackTimes";

useGLTF.preload(MODEL_URL, false, true);

/*
 * The fold, in garment-local units, done like cloth rather than card: the garment is laid flat but keeps some puff,
 * the sleeves roll in behind the body about the side lines with a soft, wide crease, the hood lies back over the
 * shoulders (still visible as a rounded shape above the folded body), and the bottom rolls up behind the waist line.
 * Nothing is clipped, so the edges stay a little uneven and rounded.
 */
const FOLD_XS = 0.45;
const FOLD_YF = -0.12;
const FOLD_YH = 0.58;
/** Model-space centre of the folded hoodie (waist fold up to the laid-back hood), to keep it centred as it folds. */
const FOLDED_CY = 0.18;
/** Folded hoodie scale in the row, the pile and the box (about 95 x 95 SVG units with the hood). */
const SMALL = 0.46;

/* ------------------------------------------------------------------------------------------------ */
/* Fold, finish and print shader patches, chained onto the shared hoodie materials. */

function createFoldUniforms() {
  return {
    uFlat: { value: 0 },
    uSleeveL: { value: 0 },
    uSleeveR: { value: 0 },
    uHood: { value: 0 },
    uHalf: { value: 0 },
  };
}
type FoldUniforms = ReturnType<typeof createFoldUniforms>;

// Fold maths in the garment mesh's local space (x +-0.94, y +-1, z -0.48..0.48, front +z). Each fold turns the part
// past a fold line about a line just behind the garment, over a wide crease ramp so the turn rolls rather than
// creases; depth squashes only partly, so the folded layers keep their thickness.
const FOLD_GLSL = /* glsl */ `
uniform float uFlat; uniform float uSleeveL; uniform float uSleeveR; uniform float uHood; uniform float uHalf;
uniform float uFoldK; uniform vec3 uFoldB;
varying float vAcsShade;
varying vec3 vAcsNrm;
varying float vAcsY; // garment-local height before folding
mat3 acsRotY(float a) { float c = cos(a); float s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 acsRotX(float a) { float c = cos(a); float s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
const float ACS_PI = 3.14159265;
const float ACS_ZC = 0.07;  // laid flat about this plane
const float ACS_XS = ${FOLD_XS.toFixed(3)};
const float ACS_YF = ${FOLD_YF.toFixed(3)};
const float ACS_YH = ${FOLD_YH.toFixed(3)};
// Turns the part of p past a fold line about that line (pivot piv, rotation r, squash c on the pivot-local z).
void acsTurn(inout vec3 p, inout vec3 n, inout vec3 t, vec3 piv, mat3 r, float c) {
  vec3 d = p - piv; d.z *= c;
  p = piv + r * d; n.z /= c; n = r * n; t.z *= c; t = r * t;
}
// Bends cloth round a fold axis like a page curl, without stretching: a point d past the fold line, r in front of the
// axis, wraps round a half-cylinder of radius r (so each layer rolls on its own radius and they stay stacked) and
// beyond the arc carries straight on at the fold angle big. Returns (distance past the line, offset from the axis,
// local angle).
vec3 acsBend(float d, float r, float big) {
  r = max(r, 0.002);
  float th = min(d / r, big);
  if (d <= r * big) return vec3(r * sin(th), r * cos(th), th);
  float e = d - r * big;
  return vec3(r * sin(big) + cos(big) * e, r * cos(big) - sin(big) * e, big);
}
void acsSquash(inout vec3 p, inout vec3 n, inout vec3 t, float zc, float c) {
  p.z = zc + (p.z - zc) * c; n.z /= c; t.z *= c;
}
void acsFold(inout vec3 p, inout vec3 n, inout vec3 t, out float shade) {
  // Lay flat, keeping some puff.
  acsSquash(p, n, t, ACS_ZC, mix(1.0, 0.42, uFlat));
  float sz = mix(1.0, 0.42, uFlat);
  // 1. Sleeves roll in behind the body round the side lines (layers squash a little as they fold).
  float zc1 = ACS_ZC - 0.42 * sz;
  float cs = mix(1.0, 0.5, max(uSleeveL, uSleeveR));
  acsSquash(p, n, t, zc1, cs);
  float side = p.x < 0.0 ? -1.0 : 1.0;
  float ua = side > 0.0 ? uSleeveR : uSleeveL;
  float da = abs(p.x) - ACS_XS;
  float fa = 0.0;
  if (da > 0.0 && ua > 0.0) {
    vec3 b = acsBend(da, p.z - zc1, ua * ACS_PI);
    p.x = side * (ACS_XS + b.x);
    p.z = zc1 + b.y;
    mat3 ry = acsRotY(b.z * side);
    n = ry * n; t = ry * t;
    fa = b.z / ACS_PI;
  }
  // 2. The hood lies back over the shoulders, staying in view above the folded body.
  float wh = smoothstep(ACS_YH - 0.06, ACS_YH + 0.06, p.y);
  float fh = uHood * wh;
  acsTurn(p, n, t, vec3(0.0, ACS_YH, zc1), acsRotX(-fh * ACS_PI * 0.24), mix(1.0, 0.8, fh));
  // 3. The bottom rolls up behind the waist line, behind the folded sleeves, into a soft rounded edge.
  float zc2 = zc1 - 0.42 * sz * cs;
  acsSquash(p, n, t, zc2, mix(1.0, 0.36, uHalf));
  float db = ACS_YF - p.y;
  float fb = 0.0;
  if (db > 0.0 && uHalf > 0.0) {
    vec3 b = acsBend(db, p.z - zc2, uHalf * ACS_PI);
    p.y = ACS_YF - b.x;
    p.z = zc2 + b.y;
    mat3 rx = acsRotX(b.z);
    n = rx * n; t = rx * t;
    fb = b.z / ACS_PI;
  }
  shade = max(max(sin(fa * ACS_PI), sin(fh * ACS_PI * 0.24) * 0.5), sin(fb * ACS_PI) * 0.8);
}
`;

/** Print area on the chest, garment-local x0, x1, y0, y1 (planar projection from the front). */
const PRINT_BOX = [-0.34, 0.34, 0.0, 0.34] as const;

/*
 * Rainbow reflective finish (after the Spotify bomber): pastel pink, lilac, cyan and mint bands that sweep across the
 * garment and shift with the view angle, a glossy sheen, black rib trims (hem band and cuffs) and a black print.
 * acsDyed (from the shared wash shader) is where the finish has arrived behind the sweep.
 */
const FINISH_GLSL = /* glsl */ `
  vec3 acsV = normalize(vViewPosition);
  float acsNV = abs(dot(normalize(normal), acsV));
  float acsBand = acsFbm(vAcsPos.xy * 1.7 + vec2(vAcsPos.z * 2.0, 0.0)) * 1.3 + vAcsPos.x * 0.3 - vAcsPos.y * 0.45;
  float acsHue = fract(acsBand + acsNV * 0.85 + uIri);
  vec3 acsRain = 0.6 + 0.4 * cos(6.28318 * (acsHue + vec3(0.0, 0.33, 0.67)));
  // A see-through iridescent film: faint face-on, brighter and more opaque towards the rim (fresnel), so the back
  // panel, inner hood and sleeves show through. Rib trims and the print stay nearly solid black.
  float acsFres = pow(1.0 - acsNV, 2.0);
  vec3 acsFinish = mix(acsRain, vec3(0.035), acsRib);
  diffuseColor.rgb = mix(diffuseColor.rgb, acsFinish, acsDyed);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03), acsInk);
  diffuseColor.rgb *= 1.0 - 0.6 * vAcsShade;
  float acsSolid = max(acsRib, acsInk);
  diffuseColor.a = mix(1.0, mix(0.3 + 0.62 * acsFres, 0.93, acsSolid), acsDyed);
  totalEmissiveRadiance += acsRain * acsDyed * (1.0 - acsSolid) * (1.0 - 0.6 * vAcsShade) * (0.07 + 0.6 * acsFres);
  totalEmissiveRadiance += uYellow * acsBlade * 2.2;
`;

/**
 * Adds folding (and clipping to the folded rectangle) to a shared hoodie material. `k`/`b` map the mesh's local space
 * into the garment's (the stitches mesh has its own quantised space). With `finish`, the garment also gets the rainbow
 * reflective finish in place of the grey acid wash, and the black chest print.
 */
function addFold(
  mat: THREE.MeshStandardMaterial,
  fold: FoldUniforms,
  k: number,
  b: THREE.Vector3,
  cacheKey: string,
  finish?: { map: { value: THREE.Texture }; amount: { value: number }; iri: { value: number } },
): void {
  const base = mat.onBeforeCompile.bind(mat);
  mat.onBeforeCompile = (shader, renderer) => {
    base(shader, renderer);
    Object.assign(shader.uniforms, fold, { uFoldK: { value: k }, uFoldB: { value: b } });
    if (finish) Object.assign(shader.uniforms, { uPrintMap: finish.map, uPrint: finish.amount, uIri: finish.iri });
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
        vAcsY = acsP.y;
        acsFold(acsP, objectNormal, acsT, vAcsShade);
        #ifdef USE_TANGENT
          objectTangent = acsT;
        #endif`,
      )
      .replace("vAcsPos = position;", "vAcsPos = position;\ntransformed = (acsP - uFoldB) / uFoldK;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vAcsShade; varying vec3 vAcsNrm; varying float vAcsY; uniform float uHalf;
        ${finish ? "uniform sampler2D uPrintMap; uniform float uPrint; uniform float uIri;" : ""}`,
      );
    if (!finish) {
      shader.fragmentShader = shader.fragmentShader
        // Stitching on the part that rolls up behind would smear across the crease: it goes as the bottom folds.
        .replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>\nif (uHalf > 0.02 && vAcsY < ${(FOLD_YF + 0.1).toFixed(3)}) discard;`,
        )
        .replace("#include <normal_fragment_begin>", "diffuseColor.rgb *= 1.0 - 0.6 * vAcsShade;\n#include <normal_fragment_begin>");
      return;
    }
    const [x0, x1, y0, y1] = PRINT_BOX.map((v) => v.toFixed(3));
    shader.fragmentShader = shader.fragmentShader
      // The shared wash shader dyes towards the grey acid; here it dyes towards white, finished below.
      .replace("diffuseColor.rgb *= mix(acsGreige, acsAcid, acsDyed);", "diffuseColor.rgb *= mix(acsGreige, vec3(1.0), acsDyed);")
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        // Black 2x2 rib at the hem band and the cuffs.
        float acsRib = max(
          (1.0 - smoothstep(-0.71, -0.69, vAcsPos.y)) * (1.0 - smoothstep(0.6, 0.62, abs(vAcsPos.x))),
          (1.0 - smoothstep(-0.8, -0.78, vAcsPos.y)) * smoothstep(0.6, 0.62, abs(vAcsPos.x)));
        roughnessFactor = mix(roughnessFactor, 0.22, acsDyed * (1.0 - acsRib));
        vec2 acsPuv = vec2((vAcsPos.x - ${x0}) / (${x1} - ${x0}), (vAcsPos.y - ${y0}) / (${y1} - ${y0}));
        float acsIn = step(0.0, acsPuv.x) * step(acsPuv.x, 1.0) * step(0.0, acsPuv.y) * step(acsPuv.y, 1.0)
          * step(0.1, vAcsPos.z) * smoothstep(0.15, 0.45, vAcsNrm.z) * (gl_FrontFacing ? 1.0 : 0.0);
        float acsWipe = uPrint * 1.12 - 0.06;
        float acsInk = texture2D(uPrintMap, clamp(acsPuv, 0.0, 1.0)).a * acsIn * step(acsPuv.x, acsWipe);
        float acsBlade = acsIn * (1.0 - smoothstep(0.0, 0.025, abs(acsPuv.x - acsWipe))) * step(0.001, uPrint) * step(uPrint, 0.999);`,
      )
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${FINISH_GLSL}`);
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

/* ------------------------------------------------------------------------------------------------ */

interface Assets {
  parts: Parts;
  fold: FoldUniforms;
  printAmount: { value: number };
  /** Slow drift of the rainbow bands. */
  iri: { value: number };
  /** The see-through film is drawn in two passes, inside (back faces) then outside, so layers order correctly. */
  garmentBack: THREE.MeshStandardMaterial;
  /** Soft contact shadow under each folded copy. */
  shadow: THREE.MeshBasicMaterial;
  /** Garment-local height of the ghost's top-down reveal front. */
  reveal: { value: number };
  dispose: () => void;
}

function buildAssets(scene: THREE.Object3D): Assets {
  const parts = buildParts(scene);
  const fold = createFoldUniforms();
  const print = createPrintTexture();
  const printAmount = { value: 0 };
  const iri = { value: 0 };
  const g = parts.garment;
  const s = parts.stitches;
  let source: THREE.MeshStandardMaterial | null = null;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !/stitch/i.test(m.name) && !source) source = m.material as THREE.MeshStandardMaterial;
  });
  const garmentBack = garmentMaterial(source ?? parts.materials.garment, parts.uniforms);
  const finish = { map: { value: print.texture }, amount: printAmount, iri };
  addFold(parts.materials.garment, fold, 1, new THREE.Vector3(), "acs-garment-fold", finish);
  addFold(garmentBack, fold, 1, new THREE.Vector3(), "acs-garment-fold", finish);
  for (const [m, side] of [
    [parts.materials.garment, THREE.FrontSide],
    [garmentBack, THREE.BackSide],
  ] as const) {
    m.side = side;
    m.transparent = true;
  }
  garmentBack.depthWrite = false;
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const sctx = shadowCanvas.getContext("2d");
  if (sctx) {
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(0,0,0,0.6)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  // Seam stitching: pale thread on the ghost, turning dark as the finish arrives (see updateHoodies).
  parts.materials.stitches.color.set(STITCH_PALE);
  // Matte, so the dark seams and the flame lines read as true black on the finish instead of picking up a grey sheen.
  parts.materials.stitches.roughness = 1;
  // The ghost and its pattern lines appear top-down behind a reveal front, wiping the flat pieces away as they go.
  const reveal = { value: 1.2 };
  const ghost = parts.materials.ghost;
  Object.assign(ghost.uniforms, { uReveal: reveal, uYellow: parts.uniforms.uYellow });
  ghost.fragmentShader = ghost.fragmentShader
    .replace("uniform float uCut;", "uniform float uCut; uniform float uReveal; uniform vec3 uYellow;")
    .replace("if (vY < uCut) discard;", "if (vY < uCut || vY < uReveal) discard;\nfloat acsRim = 1.0 - smoothstep(0.0, 0.07, vY - uReveal);")
    .replace(
      "gl_FragColor = vec4(uPaper, (0.035 + f * 0.55) * uGhost);",
      "gl_FragColor = vec4(mix(uPaper, uYellow, acsRim), (0.035 + f * 0.55 + acsRim * 0.5) * uGhost);",
    );
  const edgesMat = parts.materials.edges;
  Object.assign(edgesMat.uniforms, { uReveal: reveal });
  edgesMat.fragmentShader = edgesMat.fragmentShader
    .replace("uniform float uCut;", "uniform float uCut; uniform float uReveal;")
    .replace("if (d < 0.0) discard;", "if (d < 0.0 || vY < uReveal) discard;");
  // Stitch-local -> garment-local (both meshes have uniform node scales).
  addFold(parts.materials.stitches, fold, s.scale.x / g.scale.x, s.position.clone().sub(g.position).divideScalar(g.scale.x), "acs-stitch-fold");
  return {
    parts,
    fold,
    printAmount,
    iri,
    garmentBack,
    shadow,
    reveal,
    dispose: () => {
      parts.dispose();
      print.dispose();
      garmentBack.dispose();
      shadowTex.dispose();
      shadow.dispose();
    },
  };
}


const STITCH_PALE = new THREE.Color("#d8d2c6");
const STITCH_DARK = new THREE.Color("#000000");

/* ------------------------------------------------------------------------------------------------ */
/* Layout (SVG stage units) and the hoodie's part of the film. */

/** Model units -> SVG units, so the hoodie stands where the assembled pattern pieces were (hood top 48, hem 408). */
const SVG_PER_MODEL = HOODIE.svgPerModel;
/** Where the model's centre sits on the stage. */
const HOODIE_AT = { x: HOODIE.x, y: HOODIE.y };
const HERO_ANGLE = -0.62;
/** The angle the garment folds at: enough turn to see the panels swing back. */
const FOLD_ANGLE = -0.3;
/** Row of four (copy order: three clones, then the original), the pile they settle into, and the drop into the box. */
const ROW_Y = 178;
const ROW_X = [66, 298, 414, 182] as const;
const PILE_X = [244, 235, 243, 240] as const;
const PILE_Y = 170;
/** Pack orientation of the folded copies: a 3/4 turn and a tilt that shows their top. */
const PACK_TURN = -0.32;
const PACK_TILT = 0.38;
const PILE_STEP = 8;
export const STACK_DROP = 160;

const A = new THREE.Vector3();
const B = new THREE.Vector3();

interface HoodieRefs {
  copies: (THREE.Group | null)[];
  centres: (THREE.Group | null)[];
  ghost: THREE.Mesh | null;
  edges: THREE.LineSegments | null;
  stitches: THREE.Mesh | null;
  sewLight: THREE.PointLight | null;
  shadows: (THREE.Mesh | null)[];
}

/** Per-frame update at garment time `t`. Mutates objects and uniforms only. */
function updateHoodies(t: number, a: Assets, r: HoodieRefs): void {
  const u = a.parts.uniforms;
  const f = a.fold;

  // ----- stitch: the ghost appears over the assembled pieces and a yellow thread front sews it -----
  // The reveal front runs down the garment (5.0 - 6.5) as the pieces it passes are wiped away; the thread front
  // follows a little behind it, sewing the ghost's seams.
  a.reveal.value = revealAt(t);
  u.uGhost.value = 1 - seg(t, 9.2, 9.75);
  u.uEdges.value = 0.5 * (1 - seg(t, 9.0, 9.5));
  u.uSew.value = lerp(-0.05, 1.28, seg(t, 5.2, 7.0));
  // Pale thread on the ghost, darkening smoothly to black as the finish sweeps up.
  a.parts.materials.stitches.color.copy(STITCH_PALE).lerp(STITCH_DARK, seg(t, 8.6, 9.8));
  // ----- wash & finish: a yellow scan line sweeps up from the hem, the rainbow reflective finish right behind it -----
  u.uCut.value = lerp(-1.08, 1.08, ease(seg(t, 8.6, 9.65)));
  u.uCutGlow.value = 1 - seg(t, 9.55, 9.85);
  u.uDye.value = lerp(-1.2, 1.4, ease(seg(t, 8.6, 9.7)));
  a.iri.value = t * 0.05;
  // ----- print & brand -----
  a.printAmount.value = ease(seg(t, 10.45, 11.15));

  // ----- fold like cloth: lay flat, sleeves roll in (right then left), hood lies back, bottom rolls up -----
  f.uFlat.value = ease(seg(t, 12.25, 12.6));
  f.uSleeveR.value = ease(seg(t, 12.55, 13.05));
  f.uSleeveL.value = ease(seg(t, 12.75, 13.25));
  f.uHood.value = ease(seg(t, 13.3, 13.75));
  f.uHalf.value = ease(seg(t, 13.7, 14.2));

  if (r.sewLight) {
    r.sewLight.intensity = 0.7 * seg(t, 5.2, 5.4) * (1 - seg(t, 6.8, 7.1));
    r.sewLight.position.y = 1 - 2 * Math.max(0, u.uSew.value);
  }

  // ----- copies: the original folds, shrinks into its row slot and the clones slide out of it; they settle into a
  //       pile and drop into the box -----
  const shrink = ease(seg(t, 14.3, 14.9));
  const spread = ease(seg(t, 14.9, 15.6));
  const settle = ease(seg(t, 15.8, 16.4));
  const drop = ease(seg(t, 16.9, 17.4));
  const sWorld = K * SVG_PER_MODEL;
  // A slow turn while the ghost is sewn and the colours sweep, settling into the 3/4 hero angle for the print.
  // Front on (matching the pieces) until the reveal is done, then the ghost settles and turns.
  let spin = 0.35 * Math.sin((t - 6.5) * 0.6) * seg(t, 6.5, 7.6) * (1 - seg(t, 9.6, 10.6));
  spin += HERO_ANGLE * ease(seg(t, 9.2, 11.0));
  spin = lerp(spin, FOLD_ANGLE, ease(seg(t, 12.1, 12.5)));
  r.copies.forEach((g, i) => {
    const centre = r.centres[i];
    if (!g || !centre) return;
    const original = i === 3;
    // Once the flaps are shut the pile is out of sight (and its hoods would otherwise brush the closed flaps).
    const visible = (original ? t >= 4.85 : t >= 14.9) && t < 18.3;
    g.visible = visible;
    if (!visible) return;
    centre.position.y = -FOLDED_CY * f.uHalf.value;
    const order = original ? 3 : i;
    const x = lerp(lerp(ROW_X[3], ROW_X[i] ?? 240, spread), PILE_X[i] ?? 240, settle);
    const y = lerp(ROW_Y, PILE_Y - order * PILE_STEP, settle) + STACK_DROP * drop;
    A.set(sx(x), sy(y), (original ? 0 : -0.05 * (1 - spread)) + order * 0.03 * settle);
    if (original && shrink < 1) {
      B.set(sx(HOODIE_AT.x), sy(HOODIE_AT.y) + Math.sin(t * 0.8) * 0.006 * (1 - f.uHalf.value) + FOLDED_CY * sWorld * f.uHalf.value, 0);
      A.lerpVectors(B, A, shrink);
    }
    g.position.copy(A);
    g.scale.setScalar(original ? lerp(sWorld, sWorld * SMALL, shrink) : sWorld * SMALL);
    // Folded copies are seen from a slightly high 3/4 angle, so their thickness and the laid-back hood read.
    g.rotation.y = original ? lerp(spin, PACK_TURN, shrink) : PACK_TURN;
    g.rotation.x = original ? lerp(0.04 * seg(t, 6.5, 7.5) * (1 - seg(t, 12.1, 12.5)), PACK_TILT, shrink) : PACK_TILT;
    // Contact shadow just under the folded copy, until it drops into the box.
    const sh = r.shadows[i];
    if (sh) {
      sh.visible = shrink > 0 && drop < 1;
      sh.position.set(A.x, A.y - 0.27 * sWorld * SMALL, A.z - 0.08);
      sh.scale.set(sWorld * SMALL * 0.62, sWorld * SMALL * 0.12, 1);
    }
  });
  a.shadow.opacity = 0.85 * shrink * (1 - settle * 0.5) * (1 - drop);
  // Dark seam stitching stays on the garment through the fold.
  if (r.stitches) r.stitches.visible = t < 22.6;
  if (r.ghost) r.ghost.visible = u.uGhost.value > 0.001 && u.uCut.value < 1.07 && a.reveal.value < 1.1;
  if (r.edges) r.edges.visible = u.uEdges.value > 0.001 && a.reveal.value < 1.1;
}

const SEW_W = new THREE.Vector3();

/** The hoodie (and three clones for the bulk run), driven by the film clock. */
export function FilmHoodies({ clock }: { clock: RefObject<FilmClock> }) {
  const gltf = useGLTF(MODEL_URL, false, true);
  const assets = useMemo(() => buildAssets(gltf.scene), [gltf.scene]);
  const refs = useRef<HoodieRefs>({ copies: [], centres: [], ghost: null, edges: null, stitches: null, sewLight: null, shadows: [] });

  useEffect(() => () => assets.dispose(), [assets]);
  useFrame(() => updateHoodies(clock.current.t, assets, refs.current));

  // Sparks along the sewing front while the thread runs.
  const sewSparks = useCallback(
    (time: number, seed: number, out: THREE.Vector3) => {
      const light = refs.current.sewLight;
      if (!light || time < 5.25 || time > 6.9) return false;
      light.getWorldPosition(SEW_W);
      out.set(SEW_W.x + (seed - 0.5) * 0.9, SEW_W.y, 0.25);
      return true;
    },
    [],
  );

  const { garment, stitches, materials, offset, unit, edges } = assets.parts;
  return (
    <>
      {[0, 1, 2, 3].map((index) => {
        const original = index === 3;
        return (
          <group
            key={index}
            ref={(g) => {
              refs.current.copies[index] = g;
            }}
            visible={false}
          >
            <group
              ref={(g) => {
                refs.current.centres[index] = g;
              }}
            >
              <group scale={unit}>
                <group position={offset}>
                  <group position={garment.position} scale={garment.scale}>
                    <mesh geometry={garment.geometry} material={assets.garmentBack} renderOrder={1} />
                    <mesh geometry={garment.geometry} material={materials.garment} renderOrder={2} />
                    {original && (
                      <>
                        <mesh
                          ref={(m) => {
                            refs.current.ghost = m;
                          }}
                          geometry={garment.geometry}
                          material={materials.ghost}
                          renderOrder={3}
                        />
                        <lineSegments
                          ref={(l) => {
                            refs.current.edges = l;
                          }}
                          geometry={edges}
                          material={materials.edges}
                          renderOrder={4}
                        />
                      </>
                    )}
                  </group>
                  {original && (
                    <group position={stitches.position} scale={stitches.scale}>
                      <mesh
                        ref={(m) => {
                          refs.current.stitches = m;
                        }}
                        geometry={stitches.geometry}
                        material={materials.stitches}
                      />
                      <pointLight
                        ref={(l) => {
                          refs.current.sewLight = l;
                        }}
                        position={[0, 1, 1.6]}
                        color="#ffe500"
                        intensity={0}
                        distance={0}
                        decay={2}
                      />
                    </group>
                  )}
                </group>
              </group>
            </group>
          </group>
        );
      })}
      {[0, 1, 2, 3].map((index) => (
        <mesh
          key={`shadow-${index}`}
          ref={(m) => {
            refs.current.shadows[index] = m;
          }}
          material={assets.shadow}
          visible={false}
          renderOrder={0}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
      <Sparks clock={clock} emit={sewSparks} />
    </>
  );
}
