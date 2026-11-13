"use client";

/**
 * Scenes 1 and 2 of the home hero's 3D film, plus the spark spray used at the cut and the stitch.
 *
 *   Knit (t < 0)      three yarn cones on a shelf feed glowing strands into a knitting bed; the yellow carriage runs
 *                     along it and greige knit fabric grows row by row (a procedural V-stitch shader on one plane).
 *   Pattern & cut     the machine lifts away and the fabric lays out over the table; a laser traces each pattern
 *   (0 - 4.2)         piece (sparks fly off the head), the leftover fabric fades, and the pieces lift with a soft float
 *                     and fly together into the hoodie's flat layout, where the hoodie scene takes over.
 *
 * Layout is in YarnToPack's SVG stage units (same pieces and table positions as the 2D animation), mapped with
 * sx / sy. Everything per frame is uniforms and transforms; the sparks rewrite one preallocated buffer.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { PIECES, SEAMS } from "@/components/process/YarnToPack";
import { bump, ease, K, revealWorldY, seg, sx, sy, type FilmClock } from "./HeroPackTimes";

const KNIT = 3.8; // YarnToPack's knitting intro, seconds (t runs from -KNIT)
const GREIGE = new THREE.Color("#e6e0d3");
const YARNS = ["#efe9dc", "#d8ccb4", "#bdb8af"] as const;
const CONES = [
  { x: 150, to: 196 },
  { x: 240, to: 240 },
  { x: 330, to: 284 },
] as const;
/** The 2D garment group's offset on the stage (pieces are authored in garment units). */
const GX = 40;
const GY = 12;

/* ------------------------------------------------------------------------------------------------ */
/* Knit fabric shader: a V-stitch pattern from the fabric's rest position, so cut pieces keep the sheet's pattern. */

function knitMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: GREIGE.clone() },
      uAlpha: { value: 1 },
      uTop: { value: 9 },
      uBot: { value: -9 },
      uGlow: { value: 0 },
      uLit: { value: 1 },
      uCell: { value: 15 * K },
      uCurve: { value: 0 },
      uFrontY: { value: 9 },
    },
    vertexShader: /* glsl */ `
      attribute vec2 aRest; uniform float uCurve; varying vec2 vRest; varying float vWorldY;
      void main() {
        vRest = aRest;
        // Wrap: the piece curves back at its sides, as if bending round the body.
        vec3 p = position;
        p.z -= uCurve * p.x * p.x * 2.4;
        vec4 w = modelMatrix * vec4(p, 1.0);
        vWorldY = w.y;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uAlpha; uniform float uTop; uniform float uBot; uniform float uGlow;
      uniform float uLit; uniform float uCell; uniform float uFrontY;
      varying vec2 vRest; varying float vWorldY;
      void main() {
        if (vRest.y > uTop || vRest.y < uBot) discard;
        // The ghost hoodie takes over above the reveal front.
        float keep = 1.0 - smoothstep(uFrontY - 0.03, uFrontY + 0.03, vWorldY);
        if (keep <= 0.0) discard;
        // Jersey knit: each cell is a V of two slanted loops, darker in the gaps between them.
        vec2 f = fract(vRest / vec2(uCell, uCell * 0.8));
        vec2 q = vec2(abs(f.x * 2.0 - 1.0) - 0.5, f.y * 2.0 - 1.0);
        q = mat2(0.85, 0.53, -0.53, 0.85) * q;
        float e = length(q / vec2(0.36, 0.98));
        float loop = 1.0 - smoothstep(0.55, 1.0, e);
        float shade = 0.56 + 0.44 * loop * (0.85 + 0.15 * q.y);
        float glow = (1.0 - smoothstep(0.0, uCell * 1.4, vRest.y - uBot)) * uGlow;
        gl_FragColor = vec4(uColor * shade * uLit + vec3(1.0, 0.9, 0.0) * glow * 0.75, uAlpha * keep);
      }`,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

/** Sets an `aRest` attribute from the geometry's own x/y (fabric at rest). */
function withRest(geo: THREE.BufferGeometry, rest?: Float32Array): THREE.BufferGeometry {
  const pos = geo.getAttribute("position");
  const arr = rest ?? new Float32Array(pos.count * 2);
  if (!rest) for (let i = 0; i < pos.count; i++) arr.set([pos.getX(i), pos.getY(i)], i * 2);
  geo.setAttribute("aRest", new THREE.BufferAttribute(arr, 2));
  return geo;
}

/** Which piece each of the 2D animation's SEAMS is sewn on (hood, armholes on the body, sleeves, pocket, band, cuffs). */
const SEAM_OWNER = ["hood", "body", "body", "slL", "slR", "pocket", "band", "cufL", "cufR"] as const;
/** Sewing: one seam after another on the assembled pieces, a needle glow leading the thread. */
const SEW_START = 4.15;
const SEW_EACH = 0.11;
const SEW_DUR = 0.36;

/*
 * Wrap: as the pieces come together they bend towards where that part sits on the 3D hoodie (whose sleeves hang wider
 * and longer than the flat pattern), so the ghost appears over them without a jump. Offsets in SVG units.
 */
const WRAP: Record<string, { dx: number; dy: number; sx: number; sy: number; rz: number }> = {
  slL: { dx: -27, dy: 27, sx: 1.2, sy: 1.5, rz: -0.06 },
  slR: { dx: 27, dy: 27, sx: 1.2, sy: 1.5, rz: 0.06 },
  cufL: { dx: -31, dy: 78, sx: 1.15, sy: 1, rz: -0.06 },
  cufR: { dx: 31, dy: 78, sx: 1.15, sy: 1, rz: 0.06 },
  pocket: { dx: 0, dy: -8, sx: 1, sy: 1, rz: 0 },
};
const NO_WRAP = { dx: 0, dy: 0, sx: 1, sy: 1, rz: 0 };
const wrapK = (t: number) => ease(seg(t, 3.9, 4.9));

/* ------------------------------------------------------------------------------------------------ */
/* Pattern pieces: the 2D animation's piece paths (M / L / Q / Z only) turned into outlines and shapes. */

type Pt = [number, number];

function pathPoints(d: string): Pt[] {
  const tok = d.match(/[MLQZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const pts: Pt[] = [];
  let i = 0;
  let cur: Pt = [0, 0];
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++];
    if (c === "M" || c === "L") {
      cur = [num(), num()];
      pts.push(cur);
    } else if (c === "Q") {
      const ctrl: Pt = [num(), num()];
      const end: Pt = [num(), num()];
      for (let s = 1; s <= 10; s++) {
        const k = s / 10;
        const a = (1 - k) * (1 - k);
        const b = 2 * (1 - k) * k;
        const e = k * k;
        pts.push([a * cur[0] + b * ctrl[0] + e * end[0], a * cur[1] + b * ctrl[1] + e * end[1]]);
      }
      cur = end;
    }
  }
  return pts;
}

function rectPoints([x, y, w, h, rot]: [number, number, number, number, number?]): Pt[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = ((rot ?? 0) * Math.PI) / 180;
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ].map(([px, py]) => {
    const dx = (px ?? 0) - cx;
    const dy = (py ?? 0) - cy;
    return [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)] as Pt;
  });
}

interface Piece {
  /** Assembled centre (world) and outline points relative to it (world units). */
  cx: number;
  cy: number;
  outline: THREE.Vector2[];
  fill: THREE.BufferGeometry;
  line: THREE.BufferGeometry;
  /** Table placement (SVG units / degrees / scale), from the 2D animation. */
  x: number;
  y: number;
  r: number;
  s: number;
  id: string;
  /** Seam ribbons sewn on this piece once assembled (index into SEAMS), relative to the piece centre. */
  seams: { index: number; geo: THREE.BufferGeometry; pts: THREE.Vector2[] }[];
}

function buildPieces(): Piece[] {
  return PIECES.map((p) => {
    const raw = p.d ? pathPoints(p.d) : p.rect ? rectPoints(p.rect) : [];
    const world = raw.map(([x, y]) => new THREE.Vector2(sx(x + GX), sy(y + GY)));
    const box = new THREE.Box2().setFromPoints(world);
    const c = box.getCenter(new THREE.Vector2());
    const outline = world.map((v) => v.clone().sub(c));
    const fill = new THREE.ShapeGeometry(new THREE.Shape(outline));
    // Rest coordinates: where each vertex lies on the cutting table, so the pattern matches the sheet it was cut from.
    const s = p.s ?? 1;
    const r = (p.r * Math.PI) / 180;
    const tx = c.x + p.x * K;
    const ty = c.y - p.y * K;
    const pos = fill.getAttribute("position");
    const rest = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i) * s;
      const ly = pos.getY(i) * s;
      rest.set([tx + lx * Math.cos(-r) - ly * Math.sin(-r), ty + lx * Math.sin(-r) + ly * Math.cos(-r)], i * 2);
    }
    withRest(fill, rest);
    // Outline as a thin ribbon (WebGL lines are 1px), with a 0..1 "drawn" coordinate for the laser.
    const closed = [...outline, outline[0] ?? new THREE.Vector2()];
    const line = ribbon(closed, 1.0 * K);
    const seams = SEAM_OWNER.flatMap((owner, index) => {
      if (owner !== p.id) return [];
      const pts = pathPoints(SEAMS[index] ?? "").map(([x, y]) => new THREE.Vector2(sx(x + GX) - c.x, sy(y + GY) - c.y));
      return pts.length > 1 ? [{ index, geo: ribbon(pts, 1.1 * K), pts }] : [];
    });
    return { cx: c.x, cy: c.y, outline: closed, fill, line, x: p.x, y: p.y, r: p.r, s, id: p.id, seams };
  });
}

/** A flat ribbon along a polyline (half-width w), with an `aDist` attribute running 0..1 along it. */
function ribbon(pts: THREE.Vector2[], w: number): THREE.BufferGeometry {
  const n = pts.length;
  const first = pts[0] ?? new THREE.Vector2();
  const pos = new Float32Array(n * 6);
  const dist = new Float32Array(n * 2);
  const index: number[] = [];
  let total = 0;
  const lens = [0];
  for (let i = 1; i < n; i++) {
    total += (pts[i] ?? first).distanceTo(pts[i - 1] ?? first);
    lens.push(total);
  }
  const dir = new THREE.Vector2();
  const nrm = new THREE.Vector2();
  for (let i = 0; i < n; i++) {
    const prev = pts[Math.max(0, i - 1)] ?? first;
    const next = pts[Math.min(n - 1, i + 1)] ?? first;
    dir.subVectors(next, prev).normalize();
    nrm.set(-dir.y, dir.x).multiplyScalar(w);
    const p = pts[i] ?? first;
    pos.set([p.x - nrm.x, p.y - nrm.y, 0.003, p.x + nrm.x, p.y + nrm.y, 0.003], i * 6);
    const d = (lens[i] ?? 0) / (total || 1);
    dist.set([d, d], i * 2);
    if (i < n - 1) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aDist", new THREE.BufferAttribute(dist, 1));
  geo.setIndex(index);
  return geo;
}

/** Cut line: dark ink so it reads on the light knit; only the laser head glows. */
function laserLineMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uDraw: { value: 0 }, uAlpha: { value: 1 }, uFrontY: { value: 9 } },
    vertexShader: /* glsl */ `
      attribute float aDist; varying float vDist; varying float vWorldY;
      void main() {
        vDist = aDist;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorldY = w.y;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uDraw; uniform float uAlpha; uniform float uFrontY; varying float vDist; varying float vWorldY;
      void main() {
        if (vDist > uDraw || vWorldY > uFrontY) discard;
        float hot = 1.0 - smoothstep(0.0, 0.03, uDraw - vDist);
        gl_FragColor = vec4(mix(vec3(0.06, 0.055, 0.05), vec3(0.55, 0.32, 0.05), hot), 0.92 * uAlpha);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Laser timing: one piece after another. */
const CUT_START = 0.35;
const CUT_EACH = 0.24;
const CUT_DUR = 0.42;
/** Pieces lift off the table and fly together (as in the 2D animation), then hand over to the ghost hoodie. */
const flyK = (t: number, i: number) => 1 - ease(seg(t, 2.6 + i * 0.08, 4.0 + i * 0.08));

/** Places a piece group: table placement scaled by k (1 on the table, 0 assembled), with a lift as it flies. */
function placePiece(g: THREE.Group, p: Piece, k: number, lift: number, i: number, wrap: number) {
  const w = WRAP[p.id] ?? NO_WRAP;
  const s = 1 - (1 - p.s) * k;
  g.position.set(p.cx + p.x * K * k + w.dx * K * wrap, p.cy - p.y * K * k - w.dy * K * wrap, 0.004 + lift * 0.16);
  g.rotation.set(lift * 0.35, lift * (i % 2 ? 0.3 : -0.3), (-p.r * Math.PI * k) / 180 + w.rz * wrap);
  g.scale.set(s * (1 + (w.sx - 1) * wrap), s * (1 + (w.sy - 1) * wrap), 1);
}

/** Needle position (world) at time `s` while a seam is being sewn, from the piece groups as they stand now. */
function needleAt(pieces: Piece[], groups: (THREE.Group | null)[], s: number, out: THREE.Vector3): boolean {
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const g = groups[i];
    if (!p || !g) continue;
    for (const seam of p.seams) {
      const k = (s - SEW_START - seam.index * SEW_EACH) / SEW_DUR;
      if (k < 0 || k > 1) continue;
      const n = seam.pts.length - 1;
      const f = k * n;
      const a = seam.pts[Math.floor(f)];
      const b = seam.pts[Math.min(n, Math.floor(f) + 1)] ?? a;
      if (!a || !b) return false;
      out.set(a.x + (b.x - a.x) * (f % 1), a.y + (b.y - a.y) * (f % 1), 0.01);
      g.localToWorld(out);
      return true;
    }
  }
  return false;
}

/** Laser head position (world) at time `s`, or false when it is not cutting. */
function laserAt(pieces: Piece[], s: number, out: THREE.Vector3): boolean {
  const i = Math.floor((s - CUT_START) / CUT_EACH);
  const p = pieces[i];
  if (!p) return false;
  const k = (s - CUT_START - i * CUT_EACH) / CUT_DUR;
  if (k < 0 || k > 1) return false;
  const n = p.outline.length - 1;
  const f = k * n;
  const a = p.outline[Math.floor(f)] ?? p.outline[0];
  const b = p.outline[Math.min(n, Math.floor(f) + 1)] ?? a;
  if (!a || !b) return false;
  const lx = a.x + (b.x - a.x) * (f % 1);
  const ly = a.y + (b.y - a.y) * (f % 1);
  // Pieces sit at their table placement while they are cut.
  const r = (-p.r * Math.PI) / 180;
  out.set(p.cx + p.x * K + p.s * (lx * Math.cos(r) - ly * Math.sin(r)), p.cy - p.y * K + p.s * (lx * Math.sin(r) + ly * Math.cos(r)), 0.01);
  return true;
}

/* ------------------------------------------------------------------------------------------------ */
/* Sparks: one preallocated Points buffer, each particle reborn on a fixed cycle from wherever the emitter was. */

const SPARKS = 56;
const SPARK_LIFE = 0.5;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
const EMIT = new THREE.Vector3();

export type SparkEmitter = (time: number, seed: number, out: THREE.Vector3) => boolean;

function createSparkTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,235,1)");
    g.addColorStop(0.25, "rgba(255,229,0,0.85)");
    g.addColorStop(1, "rgba(255,229,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}

type SparkParts = { geo: THREE.BufferGeometry; mat: THREE.ShaderMaterial };

/** Rewrites the spark buffer for time `t`; returns whether any spark is alive. */
function updateSparks(t: number, parts: SparkParts, emit: SparkEmitter, px: number): boolean {
  const pos = parts.geo.getAttribute("position") as THREE.BufferAttribute;
  const alpha = parts.geo.getAttribute("aAlpha") as THREE.BufferAttribute;
  parts.mat.uniforms.uSize!.value = px;
  let any = false;
  for (let i = 0; i < SPARKS; i++) {
    const phase = (i / SPARKS) * SPARK_LIFE;
    const since = t - phase;
    const cycle = Math.floor(since / SPARK_LIFE);
    const age = since - cycle * SPARK_LIFE;
    const seed = i * 13.7 + cycle * 7.3;
    if (!emit(t - age, hash(seed), EMIT)) {
      alpha.setX(i, 0);
      continue;
    }
    any = true;
    const vx = (hash(seed + 1) - 0.5) * 0.9;
    const vy = hash(seed + 2) * 0.6 + 0.15;
    const vz = (hash(seed + 3) - 0.2) * 0.4;
    pos.setXYZ(i, EMIT.x + vx * age, EMIT.y + vy * age - 1.6 * age * age, EMIT.z + vz * age);
    alpha.setX(i, (1 - age / SPARK_LIFE) ** 1.5);
  }
  pos.needsUpdate = true;
  alpha.needsUpdate = true;
  return any;
}

export function Sparks({ clock, emit, size = 0.035 }: { clock: RefObject<FilmClock>; emit: SparkEmitter; size?: number }) {
  const parts = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(SPARKS), 1));
    const map = createSparkTexture();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uSize: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aAlpha; varying float vAlpha; uniform float uSize;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (0.4 + 0.6 * aAlpha) / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; varying float vAlpha;
        void main() { gl_FragColor = texture2D(uMap, gl_PointCoord) * vAlpha; }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo, mat, map };
  }, []);
  useEffect(
    () => () => {
      parts.geo.dispose();
      parts.mat.dispose();
      parts.map.dispose();
    },
    [parts],
  );

  const points = useRef<THREE.Points>(null);
  useFrame((state) => {
    const any = updateSparks(clock.current.t, parts, emit, size * state.size.height * state.gl.getPixelRatio());
    if (points.current) points.current.visible = any;
  });
  return <points ref={points} geometry={parts.geo} material={parts.mat} frustumCulled={false} renderOrder={5} />;
}

/* ------------------------------------------------------------------------------------------------ */

function createYarnTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 64;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 8, 64);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < 64; y += 4) ctx.fillRect(0, y, 8, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function strandMaterial(color: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uAlpha: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv;
      void main() {
        float dash = step(0.45, fract(vUv.x * 16.0 - uTime * 2.4));
        vec3 col = mix(uColor, vec3(1.0, 0.92, 0.25), 0.35 + 0.4 * dash);
        gl_FragColor = vec4(col, (0.55 + 0.45 * dash) * uAlpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function needleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha; varying vec2 vUv;
      void main() {
        float tick = 1.0 - smoothstep(0.08, 0.16, abs(fract(vUv.x * 35.0) - 0.5));
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.0), tick * 0.85 * uAlpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

interface MakingAssets {
  sheet: THREE.BufferGeometry;
  sheetMat: THREE.ShaderMaterial;
  pieces: Piece[];
  pieceMats: THREE.ShaderMaterial[];
  lineMats: THREE.ShaderMaterial[];
  lines: THREE.Mesh[];
  /** Seam ribbons per piece, and their materials. */
  seamMeshes: THREE.Mesh[][];
  seamMats: THREE.ShaderMaterial[];
  strands: THREE.TubeGeometry[];
  strandMats: THREE.ShaderMaterial[];
  coneMats: THREE.MeshStandardMaterial[];
  yarnTex: THREE.CanvasTexture;
  needleMat: THREE.ShaderMaterial;
  dark: THREE.MeshStandardMaterial;
  carriageMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

function buildMaking(): MakingAssets {
  // Sheet: the whole cutting table (x 30..450, y 10..455); the shader reveals it row by row.
  const sheet = withRest(new THREE.PlaneGeometry(420 * K, 445 * K, 1, 1).translate(sx(240), sy(232.5), 0));
  const sheetMat = knitMaterial();
  const pieces = buildPieces();
  const pieceMats = pieces.map(() => knitMaterial());
  const lineMats = pieces.map(() => laserLineMaterial());
  const seamMats: THREE.ShaderMaterial[] = [];
  const seamMeshes = pieces.map((p) =>
    p.seams.map((seam) => {
      const mat = laserLineMaterial();
      seamMats[seam.index] = mat;
      const m = new THREE.Mesh(seam.geo, mat);
      m.position.z = 0.004;
      m.renderOrder = 3;
      return m;
    }),
  );
  const lines = pieces.map((p, i) => {
    const m = new THREE.Mesh(p.line, lineMats[i]);
    m.renderOrder = 2;
    return m;
  });
  const strands = CONES.map(
    (c) =>
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(sx(c.x), sy(14), 0.03),
          new THREE.Vector3(sx((c.x + c.to) / 2), sy(-6), 0.05),
          new THREE.Vector3(sx(c.to), sy(100), 0.03),
        ),
        40,
        1.1 * K,
        5,
        false,
      ),
  );
  const strandMats = YARNS.map((c) => strandMaterial(c));
  const yarnTex = createYarnTexture();
  const coneMats = YARNS.map((c) => new THREE.MeshStandardMaterial({ color: c, map: yarnTex, roughness: 0.85 }));
  const needleMat = needleMaterial();
  const dark = new THREE.MeshStandardMaterial({ color: "#1c1b19", roughness: 0.6, metalness: 0.2, transparent: true });
  const carriageMat = new THREE.MeshStandardMaterial({ color: "#ffe500", emissive: "#ffe500", emissiveIntensity: 0.5, roughness: 0.4, transparent: true });
  return {
    sheet,
    sheetMat,
    pieces,
    pieceMats,
    lineMats,
    lines,
    seamMeshes,
    seamMats,
    strands,
    strandMats,
    coneMats,
    yarnTex,
    needleMat,
    dark,
    carriageMat,
    dispose: () => {
      sheet.dispose();
      pieces.forEach((p) => {
        p.fill.dispose();
        p.line.dispose();
        p.seams.forEach((seam) => seam.geo.dispose());
      });
      strands.forEach((g) => g.dispose());
      yarnTex.dispose();
      [sheetMat, needleMat, dark, carriageMat, ...pieceMats, ...lineMats, ...seamMats, ...strandMats, ...coneMats].forEach((m) => m.dispose());
    },
  };
}

interface MakingRefs {
  machine: THREE.Group | null;
  carriage: THREE.Mesh | null;
  sheet: THREE.Mesh | null;
  pieces: (THREE.Group | null)[];
  head: THREE.Sprite | null;
  needle: THREE.Sprite | null;
}

/** Per-frame update of the knit and cut scenes at garment time `t`. */
function updateMaking(t: number, a: MakingAssets, r: MakingRefs): void {
  const tt = t + KNIT;
  // ----- knit: rows grow under the bed, then the machine lifts away and the fabric lays out over the table -----
  const laid = ease(seg(tt, 3, 3.6));
  const machineOn = t < 0.2;
  if (r.machine) {
    r.machine.visible = machineOn;
    r.machine.position.y = 140 * K * laid;
  }
  const machineAlpha = Math.min(seg(tt, 0, 0.5), 1 - seg(tt, 3, 3.5));
  a.dark.opacity = machineAlpha;
  a.carriageMat.opacity = machineAlpha;
  a.needleMat.uniforms.uAlpha!.value = machineAlpha;
  a.coneMats.forEach((m) => {
    m.opacity = machineAlpha;
    m.transparent = machineAlpha < 1;
  });
  a.strandMats.forEach((m) => {
    m.uniforms.uTime!.value = tt;
    m.uniforms.uAlpha!.value = machineAlpha * (1 - laid);
  });
  if (r.carriage && tt < 3.6) {
    const pass = (tt * 1.8) % 2;
    r.carriage.position.x = sx(47 + (pass < 1 ? pass : 2 - pass) * 386);
  }
  const bottom = 110 + Math.floor(seg(tt, 0.5, 3) * 34.5) * 10;
  const top = 110 - 100 * laid;
  const sm = a.sheetMat.uniforms;
  sm.uTop!.value = sy(top);
  sm.uBot!.value = sy(bottom);
  sm.uGlow!.value = tt < 3.05 ? 1 : 0;
  sm.uAlpha!.value = Math.min(seg(tt, 0.1, 0.4), 1 - seg(t, 2.4, 3));
  if (r.sheet) r.sheet.visible = t < 3.1;

  // ----- cut: the laser traces each piece, then the pieces lift and fly together -----
  const cutting = t > 0 && t < 6.6;
  const wrap = wrapK(t);
  const front = revealWorldY(t);
  a.pieces.forEach((p, i) => {
    const g = r.pieces[i];
    if (!g) return;
    g.visible = cutting && t > CUT_START + i * CUT_EACH;
    if (!g.visible) return;
    const k = flyK(t, i);
    placePiece(g, p, k, bump(t, 2.6 + i * 0.08, 4.0 + i * 0.08), i, wrap);
    p.seams.forEach((seam) => {
      const sm = a.seamMats[seam.index]?.uniforms;
      if (!sm) return;
      sm.uDraw!.value = ease(seg(t, SEW_START + seam.index * SEW_EACH, SEW_START + seam.index * SEW_EACH + SEW_DUR));
      sm.uFrontY!.value = front;
    });
    const lm = a.lineMats[i]?.uniforms;
    if (lm) {
      lm.uDraw!.value = ease(seg(t, CUT_START + i * CUT_EACH, CUT_START + i * CUT_EACH + CUT_DUR));
      lm.uAlpha!.value = 1 - seg(t, 2.5, 3.0);
      lm.uFrontY!.value = 9;
    }
    const pm = a.pieceMats[i]?.uniforms;
    if (pm) {
      // The piece is fabric from the sheet (invisible against it) until it lifts; it fades as the ghost takes over.
        // The piece is fabric from the sheet (invisible against it) until it lifts; the ghost's reveal front then wipes
      // it away from the top down as the matching part of the hoodie appears in its place.
      pm.uAlpha!.value = seg(t, CUT_START + i * CUT_EACH + CUT_DUR, CUT_START + i * CUT_EACH + CUT_DUR + 0.1);
      pm.uLit!.value = 1 + 0.06 * (1 - k);
      pm.uCurve!.value = 0.5 * wrap;
      pm.uFrontY!.value = front;
    }
  });
  if (r.needle) {
    const on = needleAt(a.pieces, r.pieces, t, r.needle.position);
    r.needle.visible = on;
    r.needle.scale.setScalar(on ? 0.035 + 0.008 * Math.sin(t * 50) : 0.001);
  }
  if (r.head) {
    const on = laserAt(a.pieces, t, r.head.position);
    r.head.visible = on;
    r.head.scale.setScalar(on ? 0.07 + 0.015 * Math.sin(t * 60) : 0.001);
  }
}

/** Knit and cut, driven by the film clock. */
export function FilmMaking({ clock }: { clock: RefObject<FilmClock> }) {
  const a = useMemo(() => buildMaking(), []);
  const headMat = useMemo(() => new THREE.SpriteMaterial({ map: createSparkTexture(), blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const refs = useRef<MakingRefs>({ machine: null, carriage: null, sheet: null, pieces: [], head: null, needle: null });
  useEffect(
    () => () => {
      a.dispose();
      headMat.map?.dispose();
      headMat.dispose();
    },
    [a, headMat],
  );

  // Sparks at the laser head while cutting, then (smaller, at the needle) while the seams are sewn.
  const laser = useMemo<SparkEmitter>(
    () => (time, _seed, out) => laserAt(a.pieces, time, out) || needleAt(a.pieces, refs.current.pieces, time, out),
    [a],
  );

  useFrame(() => updateMaking(clock.current.t, a, refs.current));

  return (
    <>
      <group
        ref={(g) => {
          refs.current.machine = g;
        }}
      >
        {/* Yarn shelf and cones */}
        <mesh material={a.dark} position={[sx(240), sy(69), -0.02]}>
          <boxGeometry args={[260 * K, 6 * K, 40 * K]} />
        </mesh>
        {CONES.map((c, i) => (
          <group key={c.x} position={[sx(c.x), sy(39), 0]}>
            <mesh material={a.coneMats[i]}>
              <cylinderGeometry args={[7 * K, 21 * K, 54 * K, 28, 1, true]} />
            </mesh>
            <mesh material={a.carriageMat} position={[0, 30 * K, 0]}>
              <cylinderGeometry args={[4 * K, 4 * K, 8 * K, 12]} />
            </mesh>
          </group>
        ))}
        {a.strands.map((g, i) => (
          <mesh key={i} geometry={g} material={a.strandMats[i]} />
        ))}
        {/* Knitting bed, needles and the carriage */}
        <mesh material={a.dark} position={[sx(240), sy(105), -0.01]}>
          <boxGeometry args={[420 * K, 10 * K, 22 * K]} />
        </mesh>
        <mesh material={a.needleMat} position={[sx(240), sy(108), 0.04]}>
          <planeGeometry args={[420 * K, 8 * K]} />
        </mesh>
        <mesh
          ref={(m) => {
            refs.current.carriage = m;
          }}
          material={a.carriageMat}
          position={[sx(47), sy(104), 0.03]}
        >
          <boxGeometry args={[34 * K, 20 * K, 26 * K]} />
        </mesh>
      </group>
      <mesh
        ref={(m) => {
          refs.current.sheet = m;
        }}
        geometry={a.sheet}
        material={a.sheetMat}
      />
      {a.pieces.map((p, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current.pieces[i] = g;
          }}
          visible={false}
        >
          <mesh geometry={p.fill} material={a.pieceMats[i]} />
          {a.lines[i] && <primitive object={a.lines[i]} />}
          {a.seamMeshes[i]?.map((m, k) => <primitive key={k} object={m} />)}
        </group>
      ))}
      <sprite
        ref={(s) => {
          refs.current.head = s;
        }}
        material={headMat}
        visible={false}
        renderOrder={6}
      />
      <sprite
        ref={(sp) => {
          refs.current.needle = sp;
        }}
        material={headMat}
        visible={false}
        renderOrder={6}
      />
      <Sparks clock={clock} emit={laser} size={0.028} />
    </>
  );
}
