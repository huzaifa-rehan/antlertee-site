/**
 * The hoodie model's parts and shader materials, shared by the hero scenes (HeroCanvas on /process/, and the home
 * hero's pack scene). Positions in the shaders are the model's quantised local space (-1..1). Only imported by the
 * dynamically loaded 3D chunks.
 */
import * as THREE from "three";

export const MODEL_URL = "/models/hoodie.glb";
export const YELLOW = new THREE.Color("#ffe500");
const GREIGE = new THREE.Color("#d4ccbb");
const PAPER = new THREE.Color("#f4f2ee");

export const NOISE_GLSL = /* glsl */ `
float acsHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float acsNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(acsHash(i), acsHash(i + vec2(1.0, 0.0)), f.x), mix(acsHash(i + vec2(0.0, 1.0)), acsHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float acsFbm(vec2 p) { return 0.6 * acsNoise(p) + 0.3 * acsNoise(p * 2.1) + 0.1 * acsNoise(p * 4.3); }
`;

/** Shared uniforms, mutated every frame. Positions are the model's quantised local space (-1..1). */
export function createUniforms() {
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
export type Uniforms = ReturnType<typeof createUniforms>;

export const withLocalPosition = (vertexShader: string) =>
  vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vAcsPos;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvAcsPos = position;");

export function garmentMaterial(source: THREE.MeshStandardMaterial, u: Uniforms): THREE.MeshStandardMaterial {
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

export function stitchMaterial(source: THREE.MeshStandardMaterial, u: Uniforms): THREE.MeshStandardMaterial {
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
export function ghostMaterial(u: Uniforms): THREE.ShaderMaterial {
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
export function edgeMaterial(u: Uniforms): THREE.ShaderMaterial {
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

export interface Parts {
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

export function buildParts(scene: THREE.Object3D): Parts {
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
