"use client";

/**
 * The shipping box at the end of the home hero's 3D film, styled after the 2D animation's box (process.css): flat
 * kraft colours with no lighting noise, two flaps that close over the stack, yellow tape along the seam and down the
 * front, the ink label card with a dashed yellow edge and the white Antlertee logo stamped on, then a small pulse.
 *
 *   16.3  box rises in under the pile        17.7  flaps close (left, then right)     18.15  tape
 *   18.55 label stamps on                    19.0  pulse                              21+    fades with the film
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { bump, ease, easeOut, K, seg, sx, sy, type FilmClock } from "./HeroPackTimes";

// Box in SVG stage units (front face x 130..350, y 254..394, as in the 2D pack scene), depth into the screen.
const W = 220;
const H = 140;
const D = 130;
const AT = { x: 240, y: 310 };
const TILT = 0.24;
const FRONT_Z = 0.18;

const KRAFT = {
  front: "#b8895a",
  side: "#a57a4f",
  inside: "#7d5a37",
  flap: "#c99c6c",
  flapIn: "#8f6b46",
  crease: "#9a7148",
};

function basic(color: string, extra: THREE.MeshBasicMaterialParameters = {}) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });
}

/** Ink label card with a dashed yellow edge and the white logo, like the 2D box label. */
function createLabelTexture(): { texture: THREE.CanvasTexture; dispose: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const img = new Image();
  let live = true;
  const draw = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx || !live) return;
    ctx.fillStyle = "#0d0c0b";
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 256, 9);
    ctx.fill();
    ctx.strokeStyle = "#ffe500";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(9, 9, 238, 238);
    if (img.complete && img.naturalWidth > 0) {
      const h = 220;
      const w = (h * img.naturalWidth) / img.naturalHeight;
      ctx.drawImage(img, 128 - w / 2, 18, w, h);
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

function createRadial(inner: string, outer: string, ring = false): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (ring) {
      g.addColorStop(0.62, outer);
      g.addColorStop(0.8, inner);
      g.addColorStop(1, outer);
    } else {
      g.addColorStop(0, inner);
      g.addColorStop(1, outer);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

function buildBox() {
  const label = createLabelTexture();
  const shadowTex = createRadial("rgba(0,0,0,0.55)", "rgba(0,0,0,0)");
  const ringTex = createRadial("rgba(255,229,0,0.9)", "rgba(255,229,0,0)", true);
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const m = {
    front: basic(KRAFT.front),
    side: basic(KRAFT.side),
    inside: basic(KRAFT.inside, { side: THREE.BackSide }),
    flap: basic(KRAFT.flap),
    flapIn: basic(KRAFT.flapIn),
    edge: basic(KRAFT.side),
    crease: basic(KRAFT.crease),
    tape: basic("#ffe500"),
    label: basic("#ffffff", { map: label.texture, transparent: true, opacity: 0 }),
    shadow: new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }),
    ring: new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  };
  // BoxGeometry face order: +x, -x, +y (open top), -y, +z (front), -z.
  const outer = [m.side, m.side, hidden, m.side, m.front, m.side];
  const inner = [m.inside, m.inside, hidden, m.inside, m.inside, m.inside];
  const flap = [m.edge, m.edge, m.flap, m.flapIn, m.edge, m.edge];
  return {
    outer,
    inner,
    flap,
    m,
    dispose: () => {
      label.dispose();
      shadowTex.dispose();
      ringTex.dispose();
      hidden.dispose();
      Object.values(m).forEach((x) => x.dispose());
    },
  };
}

interface BoxRefs {
  root: THREE.Group | null;
  lift: THREE.Group | null;
  flaps: (THREE.Group | null)[];
  tapeTop: THREE.Group | null;
  tapeFront: THREE.Group | null;
  label: THREE.Mesh | null;
  ring: THREE.Mesh | null;
}

const FLAP_OPEN = 2.05;

type BoxAssets = ReturnType<typeof buildBox>;

/** Per-frame update at garment time `t`. */
function updateBox(t: number, b: BoxAssets, r: BoxRefs): void {
  const boxIn = easeOut(seg(t, 16.3, 16.8));
  const on = boxIn > 0 && t < 22.6;
  if (r.root) {
    r.root.visible = on;
    // End beat: a small bounce as the label lands.
    r.root.scale.setScalar(1 + 0.035 * bump(t, 18.85, 19.35));
  }
  if (r.lift) r.lift.position.y = -220 * K * (1 - boxIn);
  r.flaps.forEach((f, i) => {
    if (!f) return;
    const k = 1 - ease(seg(t, 17.6 + i * 0.22, 18.0 + i * 0.22));
    f.rotation.z = (i === 0 ? 1 : -1) * FLAP_OPEN * k;
  });
  const top = ease(seg(t, 18.15, 18.35));
  const front = ease(seg(t, 18.3, 18.5));
  if (r.tapeTop) {
    r.tapeTop.visible = top > 0;
    r.tapeTop.scale.z = Math.max(top, 0.001);
  }
  if (r.tapeFront) {
    r.tapeFront.visible = front > 0;
    r.tapeFront.scale.y = Math.max(front, 0.001);
  }
  const stamp = seg(t, 18.55, 18.9);
  if (r.label) {
    r.label.visible = stamp > 0;
    b.m.label.opacity = stamp;
    r.label.scale.setScalar(1.35 - 0.35 * easeOut(stamp));
  }
  b.m.shadow.opacity = boxIn;
  if (r.ring) {
    const k = seg(t, 18.85, 19.6);
    r.ring.visible = k > 0 && k < 1;
    r.ring.scale.setScalar(0.5 + 1.1 * easeOut(k));
    b.m.ring.opacity = (1 - k) * 0.45;
  }
}

export function FilmBox({ clock }: { clock: RefObject<FilmClock> }) {
  const b = useMemo(() => buildBox(), []);
  const refs = useRef<BoxRefs>({ root: null, lift: null, flaps: [], tapeTop: null, tapeFront: null, label: null, ring: null });
  useEffect(() => () => b.dispose(), [b]);

  useFrame(() => updateBox(clock.current.t, b, refs.current));

  return (
    <group ref={(o) => {
        refs.current.root = o;
      }} position={[sx(AT.x), sy(AT.y), FRONT_Z - (D * K) / 2]} rotation-x={TILT} visible={false}>
      <group ref={(o) => {
        refs.current.lift = o;
      }}>
        <mesh material={b.m.shadow} position={[0, (-H / 2 - 2) * K, 0]} rotation-x={-Math.PI / 2} renderOrder={-1}>
          <planeGeometry args={[W * 1.5 * K, D * 1.3 * K]} />
        </mesh>
        <mesh material={b.outer}>
          <boxGeometry args={[W * K, H * K, D * K]} />
        </mesh>
        <mesh material={b.inner}>
          <boxGeometry args={[(W - 3) * K, (H - 1) * K, (D - 3) * K]} />
        </mesh>
        {/* Crease line under the rim, as on the 2D box */}
        <mesh material={b.m.crease} position={[0, (H / 2 - 12) * K, (D / 2 + 0.3) * K]}>
          <planeGeometry args={[W * K, 1.2 * K]} />
        </mesh>
        {/* Flaps hinge on the left and right top edges and meet along the middle, front to back */}
        {[-1, 1].map((side, i) => (
          <group
            key={side}
            ref={(g) => {
              refs.current.flaps[i] = g;
            }}
            position={[(side * W * K) / 2, (H / 2) * K, 0]}
          >
            <mesh material={b.flap} position={[(-side * (W / 4 - 0.5) * K), 0.8 * K, 0]}>
              <boxGeometry args={[(W / 2 - 1) * K, 1.6 * K, D * K]} />
            </mesh>
          </group>
        ))}
        {/* Tape: pulled over the top from the back, then down the front */}
        <group ref={(o) => {
        refs.current.tapeTop = o;
      }} position={[0, (H / 2 + 1.9) * K, (-D / 2) * K]} visible={false}>
          <mesh material={b.m.tape} position={[0, 0, ((D + 1) / 2) * K]}>
            <boxGeometry args={[24 * K, 0.6 * K, (D + 1) * K]} />
          </mesh>
        </group>
        <group ref={(o) => {
        refs.current.tapeFront = o;
      }} position={[0, (H / 2 + 2) * K, (D / 2 + 0.6) * K]} visible={false}>
          <mesh material={b.m.tape} position={[0, -17 * K, 0]}>
            <boxGeometry args={[24 * K, 34 * K, 0.6 * K]} />
          </mesh>
        </group>
        <mesh ref={(o) => {
        refs.current.label = o;
      }} material={b.m.label} position={[0, (H / 2 - 82) * K, (D / 2 + 1) * K]} visible={false}>
          <planeGeometry args={[84 * K, 84 * K]} />
        </mesh>
        <mesh ref={(o) => {
        refs.current.ring = o;
      }} material={b.m.ring} position={[0, (H / 2 - 82) * K, (D / 2 + 2) * K]} visible={false}>
          <planeGeometry args={[150 * K, 150 * K]} />
        </mesh>
      </group>
    </group>
  );
}
