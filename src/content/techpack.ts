/**
 * Tech pack builder: options, types and the defaults for a new draft.
 * Garment options follow what the FAQs say we make (copy.ts); techniques follow the capabilities list.
 * The MOQ note reads its figure from `facts` in site.ts, so it changes when the client confirms the MOQ.
 */
import { facts } from "./site";

export const garmentTypes = [
  { id: "tee", label: "T-shirt", hint: "Oversized, boxy or regular" },
  { id: "hoodie", label: "Hoodie", hint: "Pullover or zip" },
  { id: "sweatshirt", label: "Sweatshirt", hint: "Crewneck" },
  { id: "jacket", label: "Jacket / outerwear", hint: "Bomber, puffer, canvas" },
  { id: "trousers", label: "Trousers / joggers", hint: "Cargo, straight, track" },
  { id: "shorts", label: "Shorts", hint: "Fleece, mesh, denim" },
  { id: "jersey", label: "Jersey", hint: "Basketball, football" },
  { id: "other", label: "Something else", hint: "Tell us below" },
] as const;
export type GarmentId = (typeof garmentTypes)[number]["id"];

export const fits = [
  { id: "regular", label: "Regular" },
  { id: "oversized", label: "Oversized" },
  { id: "boxy", label: "Boxy" },
  { id: "cropped", label: "Cropped" },
] as const;
export type FitId = (typeof fits)[number]["id"];

export const gsmPresets = ["180", "220", "240", "280", "300", "350", "400", "450"] as const;

export const fabricTypes = [
  { id: "jersey", label: "Jersey", hint: "Tees, light tops" },
  { id: "french-terry", label: "French terry", hint: "Loopback sweats" },
  { id: "fleece", label: "Fleece", hint: "Brushed, warm" },
  { id: "denim", label: "Denim", hint: "Jackets, jeans" },
  { id: "canvas", label: "Canvas", hint: "Duck canvas, workwear" },
  { id: "technical", label: "Technical", hint: "Nylon, mesh, shells" },
] as const;
export type FabricTypeId = (typeof fabricTypes)[number]["id"];

export const washes = [
  { id: "none", label: "No wash" },
  { id: "acid", label: "Acid" },
  { id: "mineral", label: "Mineral" },
  { id: "enzyme", label: "Enzyme" },
  { id: "distressed", label: "Distressed" },
] as const;
export type WashId = (typeof washes)[number]["id"];

export const compositionSuggestions = [
  "100% cotton",
  "100% combed cotton",
  "80% cotton / 20% polyester",
  "95% cotton / 5% elastane",
  "100% polyester",
  "100% nylon",
] as const;

export const techniques = [
  { id: "screen", label: "Screen print", short: "Screen" },
  { id: "puff", label: "Puff print", short: "Puff" },
  { id: "dtf", label: "DTF", short: "DTF" },
  { id: "embroidery", label: "Embroidery", short: "Emb." },
  { id: "puff-embroidery", label: "3D puff embroidery", short: "3D emb." },
  { id: "applique", label: "Appliqué", short: "Appl." },
  { id: "reflective", label: "Reflective", short: "Refl." },
] as const;
export type TechniqueId = (typeof techniques)[number]["id"];

/** Placement zones on the flat sketch. `view` is the side it is drawn on; sleeves show on both. */
export type View = "front" | "back";
export interface Zone {
  id: string;
  label: string;
  views: View[];
  /** Typical artwork size, shown as a placeholder. */
  size: string;
}

const TOP_ZONES: Zone[] = [
  { id: "left-chest", label: "Left chest", views: ["front"], size: "approx. 3.5 × 3.5 in" },
  { id: "centre-chest", label: "Centre chest", views: ["front"], size: "approx. 9 × 4 in" },
  { id: "full-front", label: "Full front", views: ["front"], size: "approx. 11 × 14 in" },
  { id: "hood", label: "Hood", views: ["back"], size: "approx. 4 × 4 in" },
  { id: "left-sleeve", label: "Left sleeve", views: ["front", "back"], size: "approx. 3 × 12 in" },
  { id: "right-sleeve", label: "Right sleeve", views: ["front", "back"], size: "approx. 3 × 12 in" },
  { id: "back-yoke", label: "Back yoke", views: ["back"], size: "approx. 10 × 3 in" },
  { id: "full-back", label: "Full back", views: ["back"], size: "approx. 12 × 15 in" },
];

const BOTTOM_ZONES: Zone[] = [
  { id: "waistband", label: "Waistband", views: ["front", "back"], size: "approx. 6 × 1.5 in" },
  { id: "left-thigh", label: "Left thigh", views: ["front"], size: "approx. 4 × 4 in" },
  { id: "right-thigh", label: "Right thigh", views: ["front"], size: "approx. 4 × 4 in" },
  { id: "left-leg", label: "Left leg (side)", views: ["front"], size: "approx. 2 × 20 in" },
  { id: "back-pocket", label: "Back pocket", views: ["back"], size: "approx. 3 × 3 in" },
  { id: "back-leg", label: "Back of leg", views: ["back"], size: "approx. 4 × 10 in" },
];

export type Silhouette = "tee" | "hoodie" | "sweatshirt" | "jacket" | "jersey" | "trousers" | "shorts";

export function silhouetteFor(garment: GarmentId | ""): Silhouette {
  if (garment === "hoodie" || garment === "sweatshirt" || garment === "jacket" || garment === "jersey") return garment;
  if (garment === "trousers" || garment === "shorts") return garment;
  return "tee";
}

export function zonesFor(garment: GarmentId | ""): Zone[] {
  const s = silhouetteFor(garment);
  if (s === "trousers" || s === "shorts") return BOTTOM_ZONES;
  const zones = s === "hoodie" ? TOP_ZONES : TOP_ZONES.filter((z) => z.id !== "hood");
  // A basketball jersey has no sleeves.
  return s === "jersey" ? zones.filter((z) => !z.id.endsWith("sleeve")) : zones;
}

export const sizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;
export type SizeId = (typeof sizes)[number];

export const neckLabels = [
  { id: "woven", label: "Woven label" },
  { id: "printed", label: "Printed (tagless)" },
  { id: "none", label: "No neck label" },
] as const;
export type NeckLabelId = (typeof neckLabels)[number]["id"];

export const MAX_COLOURWAYS = 4;

/** Lowest number in the MOQ range (e.g. "50–100" → 50); the builder notes colourways below it. */
export const moqMin: number = Number.parseInt(facts.moq, 10) || 0;

export interface Colourway {
  id: string;
  name: string;
  hex: string;
  pantone: string;
}

export interface Placement {
  technique: TechniqueId | "";
  size: string;
}

export interface TechPack {
  garment: GarmentId | "";
  garmentOther: string;
  styleName: string;
  fit: FitId | "";
  dropShoulder: "yes" | "no" | "";
  lengthNotes: string;
  composition: string;
  gsm: string;
  fabricType: FabricTypeId | "";
  wash: WashId;
  colourways: Colourway[];
  placements: Record<string, Placement>;
  artworkNotes: string;
  sizes: SizeId[];
  /** quantities[colourwayId][size] = pieces, as typed. */
  quantities: Record<string, Partial<Record<SizeId, string>>>;
  neckLabel: NeckLabelId | "";
  careLabel: boolean;
  hangTag: boolean;
  polybag: boolean;
  customPackaging: boolean;
  packagingNotes: string;
  deadline: string;
  market: string;
  name: string;
  brand: string;
  email: string;
  whatsapp: string;
  notes: string;
}

export function newColourwayId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyTechPack(): TechPack {
  return {
    garment: "",
    garmentOther: "",
    styleName: "",
    fit: "",
    dropShoulder: "",
    lengthNotes: "",
    composition: "",
    gsm: "",
    fabricType: "",
    wash: "none",
    colourways: [{ id: "c1", name: "", hex: "#111111", pantone: "" }],
    placements: {},
    artworkNotes: "",
    sizes: ["S", "M", "L", "XL"],
    quantities: {},
    neckLabel: "",
    careLabel: true,
    hangTag: false,
    polybag: true,
    customPackaging: false,
    packagingNotes: "",
    deadline: "",
    market: "",
    name: "",
    brand: "",
    email: "",
    whatsapp: "",
    notes: "",
  };
}

export const steps = [
  { id: "garment", title: "Garment" },
  { id: "fit", title: "Fit" },
  { id: "fabric", title: "Fabric & wash" },
  { id: "colours", title: "Colours" },
  { id: "artwork", title: "Artwork" },
  { id: "sizes", title: "Sizes & qty" },
  { id: "labels", title: "Labels & packing" },
  { id: "review", title: "Review & send" },
] as const;
export type StepId = (typeof steps)[number]["id"];

/** What a good tech pack includes (the "send your own" checklist). */
export const techPackChecklist: { title: string; text: string }[] = [
  { title: "Flats, front and back", text: "Flat sketches of the garment from both sides." },
  { title: "Measurements", text: "A size spec with measurements for every size." },
  { title: "Fabric and GSM", text: "Composition, weight and fabric type, plus any wash." },
  { title: "Colours", text: "Pantone codes for the body, trims and artwork." },
  { title: "Artwork and placements", text: "Print-ready files (AI, PDF or high-res PNG) and where each one goes." },
  { title: "Labels and trims", text: "Neck label, care label, hang tags, zips, drawcords." },
  { title: "Quantities", text: "Pieces per colour and per size." },
  { title: "Deadline", text: "When you need the goods, and where they ship." },
];
