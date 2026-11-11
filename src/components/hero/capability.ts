"use client";

export type HeroMode = "pending" | "3d" | "svg" | "static";

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

let cached: HeroMode | null = null;

function hasCapableWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    // Software rasterisers can't hold 60fps with this scene.
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

/**
 * Picks the hero variant once per page load:
 *  - "static": prefers-reduced-motion (finished 2D garment, no pin, no scrub)
 *  - "svg":    no WebGL2, software renderer, Save-Data, or a low-end device (≤ 2 GB RAM or < 4 cores)
 *  - "3d":     everything else
 * `?hero=3d|svg|static` forces a variant (for QA).
 */
export function detectHeroMode(): HeroMode {
  if (cached) return cached;
  const forced = new URLSearchParams(window.location.search).get("hero");
  if (forced === "3d" || forced === "svg" || forced === "static") return (cached = forced);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return (cached = "static");
  const nav = navigator as NavigatorHints;
  const lowEnd =
    nav.connection?.saveData === true ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency < 4);
  cached = !lowEnd && hasCapableWebGL() ? "3d" : "svg";
  return cached;
}
