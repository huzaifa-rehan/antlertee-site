/**
 * Input state shared by the Process page hoodie's pointer / keyboard handlers (ProcessHoodie) and its 3D scene
 * (GhostHoodie). Kept free of three.js so the page can create it without loading the 3D chunk.
 */
export interface GhostInput {
  /** Turn about the vertical axis and tilt, radians. */
  yaw: number;
  pitch: number;
  /** Turn speed, radians per second (inertia after a flick). */
  yawVel: number;
  /** A sleeve being dragged: -1 left, 1 right, 0 none; and its drag offset (outward, forward), radians. */
  grab: -1 | 0 | 1;
  grabOut: number;
  grabFwd: number;
  /** performance.now() of the last input, for the drift back to the resting pose. */
  lastInput: number;
}

/** The 3/4 resting pose it drifts back to. */
export const REST_YAW = -0.55;

export function createGhostInput(): GhostInput {
  return { yaw: REST_YAW, pitch: 0.05, yawVel: 0, grab: 0, grabOut: 0, grabFwd: 0, lastInput: 0 };
}
