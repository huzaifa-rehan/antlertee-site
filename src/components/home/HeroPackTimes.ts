/**
 * The home hero's 3D film ("Yarn to pack."): its timeline and stage mapping. Times are on YarnToPack's garment clock
 * `t` (seconds; the knitting scene is t < 0, from -KNIT). Kept apart from the 3D chunk (no three.js here) so
 * YarnToPack can read it cheaply.
 */
export const FILM = {
  /** Phase start times: knit is t < 0, then pattern & cut, stitch, wash & finish, print & brand, fold & pack. */
  phases: [0, 4.2, 8.6, 10.3, 12.2] as const,
  /** Woven label card (YarnToPack's DOM card) at the neck during print & brand. */
  label: { inAt: 11.0, inEnd: 11.8, outAt: 12.1, outEnd: 12.4 },
  /** Longest wait (seconds on screen) for the 3D film before the 2D loop starts instead. */
  holdMax: 9,
} as const;

/*
 * Stage mapping. The canvas covers YarnToPack's 480 x 460 SVG viewBox exactly, and the film is laid out in those SVG
 * units (x right, y down) on the z = 0 plane, as seen by the resting camera (fov 28, 4 units away). The camera then
 * moves per scene, so layouts are fixed in world space rather than recomputed from the live viewport.
 */
export const CAMERA_Z = 4;
export const CAMERA_FOV = 28;
const VIEW_H = 2 * CAMERA_Z * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
/** World units per SVG unit. */
export const K = VIEW_H / 460;
/** SVG x / y -> world x / y. */
export const sx = (x: number) => (x - 240) * K;
export const sy = (y: number) => (230 - y) * K;

/** Where the 3D hoodie stands on the stage (its model centre, SVG units) and its scale (SVG units per model unit). */
export const HOODIE = { x: 240, y: 251, svgPerModel: 404 } as const;

/*
 * Pattern pieces -> ghost hoodie. The ghost is revealed top-down by a front in garment-local height (+1 hood top to
 * -1 cuffs) and the flat pieces are wiped away by the same front in world space, so each part of the garment takes
 * over from its piece at the same place and moment.
 */
export const revealAt = (t: number) => 1.15 - 2.35 * smoothRamp(seg(t, 5.0, 6.5));
/** The reveal front as a world-space height on the stage (the hoodie faces the camera until it is fully revealed). */
export const revealWorldY = (t: number) => sy(HOODIE.y) + revealAt(t) * 0.5 * K * HOODIE.svgPerModel;

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Maps t from [a, b] to [0, 1], clamped. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;
/** 0 -> 1 -> 0 over [a, b]. */
export const bump = (t: number, a: number, b: number) => Math.sin(Math.PI * seg(t, a, b));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Gentle in-out ramp (smoothstep). */
function smoothRamp(x: number) {
  return x * x * (3 - 2 * x);
}

/** What YarnToPack can drive once the 3D film is ready. */
export interface Pack3DApi {
  /** Draws one frame of the film at garment time `t` (seconds). */
  render: (t: number) => void;
}

/** The film's shared clock, written by `render(t)` and read by every part of the scene in useFrame. */
export interface FilmClock {
  t: number;
}
