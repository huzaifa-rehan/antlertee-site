/**
 * Timing of the home hero's 3D path, on YarnToPack's garment clock (seconds after the knitting intro). The 2D
 * knit, cut and stitch scenes play first; at HANDOVER the stitched drawing hands over to the 3D hoodie, which is
 * washed, printed, folded, multiplied and boxed. Kept apart from the 3D chunk so YarnToPack can read it cheaply.
 */
export const PACK3D = {
  /** Whether this loop uses the 3D path is decided before this time (the 3D scene must be ready by then). */
  decide: 6.9,
  /** 2D garment fades out while the 3D ghost fades in over the same place. */
  handover: [7.3, 7.9] as const,
  /** Phase start times: knit is t < 0, then pattern & cut, stitch (incl. the handover), wash, print & brand, fold & pack. */
  phases: [0, 4.2, 8.6, 10.3, 12.2] as const,
  /** Woven label card: flies out, then tucks away before folding. */
  label: { inAt: 11.1, inEnd: 11.9, outAt: 12.1, outEnd: 12.4 },
} as const;

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Maps t from [a, b] to [0, 1], clamped. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;

/** What YarnToPack can drive once the 3D scene is ready. */
export interface Pack3DApi {
  /** Draws one frame of the 3D path at garment time `t` (seconds). */
  render: (t: number) => void;
}
