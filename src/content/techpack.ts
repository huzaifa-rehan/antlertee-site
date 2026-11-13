/**
 * Tech pack builder: options, types and the defaults for a new draft.
 * Garment options follow what the FAQs say we make (copy.ts); techniques follow the capabilities list.
 * The MOQ note reads its figure from `facts` in site.ts, so it changes when the client confirms the MOQ.
 */
import { facts } from "./site";

export const garmentTypes = [
  { id: "tee", label: "T-shirt", hint: "Oversized, boxy or regular" },
  { id: "hoodie", label: "Hoodie", hint: "Pullover with a hood" },
  { id: "sweatshirt", label: "Sweatshirt", hint: "Crewneck, no hood" },
  { id: "jacket", label: "Jacket", hint: "Zip jacket, bomber, puffer" },
  { id: "trousers", label: "Trousers or joggers", hint: "Cargo, straight, track" },
  { id: "shorts", label: "Shorts", hint: "Fleece, mesh, denim" },
  { id: "jersey", label: "Jersey", hint: "Sleeveless, basketball style" },
  { id: "other", label: "Something else", hint: "Tell us what it is" },
] as const;
export type GarmentId = (typeof garmentTypes)[number]["id"];

/** Shown as the first choice of a question people may not be able to answer. Not sure is a valid answer. */
export const NOT_SURE = { label: "Not sure, you decide", hint: "We suggest one when we reply." } as const;

export const fits = [
  { id: "regular", label: "Regular", hint: "Straight and true to size", topsOnly: false },
  { id: "oversized", label: "Oversized", hint: "Roomy and relaxed, the streetwear look", topsOnly: false },
  { id: "boxy", label: "Boxy", hint: "Wide and a little shorter, square shape", topsOnly: true },
  { id: "cropped", label: "Cropped", hint: "Ends above the hip", topsOnly: true },
] as const;
export type FitId = (typeof fits)[number]["id"];

/** How heavy the fabric feels. GSM is grams per square metre; the number is what we put on the tech pack. */
export const weights = [
  { id: "light", label: "Light", hint: "Summer tees, airy and soft", gsm: "180" },
  { id: "medium", label: "Medium", hint: "Everyday tees, light sweatshirts", gsm: "240" },
  { id: "heavy", label: "Heavy", hint: "Premium tees, sweatshirts, joggers", gsm: "320" },
  { id: "extra", label: "Extra heavy", hint: "Thick hoodies with real weight", gsm: "450" },
] as const;

export const fabricTypes = [
  { id: "jersey", label: "Jersey", hint: "Smooth stretchy knit, like most T-shirts" },
  { id: "french-terry", label: "French terry", hint: "Soft loops inside, for sweatshirts and joggers" },
  { id: "fleece", label: "Fleece", hint: "Brushed and fluffy inside, warm hoodies" },
  { id: "denim", label: "Denim", hint: "Strong twill, for jeans and jackets" },
  { id: "canvas", label: "Canvas", hint: "Thick woven cotton, workwear feel" },
  { id: "technical", label: "Technical", hint: "Nylon, mesh or shell fabric" },
] as const;
export type FabricTypeId = (typeof fabricTypes)[number]["id"];

export const washes = [
  { id: "none", label: "No wash", hint: "Clean, as dyed" },
  { id: "acid", label: "Acid wash", hint: "Marbled and faded, a vintage look" },
  { id: "mineral", label: "Mineral wash", hint: "Soft, dusty, evenly faded" },
  { id: "enzyme", label: "Enzyme wash", hint: "Softer feel, lightly worn in" },
  { id: "distressed", label: "Distressed", hint: "Rough, worn out, aged" },
  { id: "unsure", label: NOT_SURE.label, hint: "We suggest finishes when we reply." },
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
  { id: "screen", label: "Screen print", short: "Screen", hint: "Flat ink pressed through a mesh. Best for bold logos." },
  { id: "puff", label: "Puff print", short: "Puff", hint: "Soft ink that puffs up into a raised 3D print." },
  { id: "dtf", label: "DTF", short: "DTF", hint: "A heat-pressed print that handles photos and many colours." },
  { id: "embroidery", label: "Embroidery", short: "Emb.", hint: "Stitched thread. A premium feel for logos." },
  { id: "puff-embroidery", label: "3D puff embroidery", short: "3D emb.", hint: "Thick raised stitching over foam." },
  { id: "applique", label: "Appliqué", short: "Appl.", hint: "A fabric patch stitched onto the garment." },
  { id: "reflective", label: "Reflective", short: "Refl.", hint: "Lights up under a camera flash or headlights." },
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
  { id: "left-leg", label: "Left leg, side", views: ["front"], size: "approx. 2 × 20 in" },
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

/** Quick size ranges, so nobody has to tick eight boxes. The first is the default. */
export const sizeRanges: { id: string; label: string; hint: string; sizes: SizeId[] }[] = [
  { id: "s-xl", label: "S to XL", hint: "The most common range", sizes: ["S", "M", "L", "XL"] },
  { id: "s-2xl", label: "S to 2XL", hint: "A little wider", sizes: ["S", "M", "L", "XL", "2XL"] },
  { id: "xs-3xl", label: "XS to 3XL", hint: "The full range", sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"] },
];

export const neckLabels = [
  { id: "woven", label: "Woven label", hint: "Your brand name woven into a small fabric tag at the neck" },
  { id: "printed", label: "Printed, no tag", hint: "Printed inside the neck. Nothing itchy." },
  { id: "none", label: "No neck label", hint: "Leave the neck plain" },
] as const;
export type NeckLabelId = (typeof neckLabels)[number]["id"];

export const MAX_COLOURWAYS = 4;

/** One-tap colours for the colour step. Anything else can be picked with the colour picker. */
export const colourPresets = [
  { name: "Black", hex: "#111111" },
  { name: "Washed black", hex: "#2f2f2f" },
  { name: "Charcoal", hex: "#4a4a4a" },
  { name: "Grey", hex: "#9a9a9a" },
  { name: "Off white", hex: "#f1ede4" },
  { name: "Bone", hex: "#d9cfbd" },
  { name: "Sand", hex: "#c8b08c" },
  { name: "Brown", hex: "#5b3d2a" },
  { name: "Olive", hex: "#5d6340" },
  { name: "Forest green", hex: "#1f4a37" },
  { name: "Navy", hex: "#1c2a4a" },
  { name: "Sky blue", hex: "#8fb3c9" },
  { name: "Burgundy", hex: "#6b1f2a" },
  { name: "Red", hex: "#c0272d" },
  { name: "Orange", hex: "#ff5a36" },
  { name: "Yellow", hex: "#ffe500" },
] as const;

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
  /** Id of the starting point the visitor began from, or "" for a start from scratch. */
  preset: string;
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
    preset: "",
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

/**
 * Popular starting points. Choosing one fills in the garment, fit, fabric, weight and wash, which the visitor can
 * change on the next steps. Empty strings mean "not sure, you decide".
 */
export interface StartingPoint {
  id: string;
  label: string;
  hint: string;
  garment: GarmentId;
  fit: FitId | "";
  dropShoulder: "yes" | "no" | "";
  fabricType: FabricTypeId | "";
  gsm: string;
  wash: WashId;
}

export const startingPoints: StartingPoint[] = [
  { id: "heavy-hoodie", label: "Heavyweight hoodie", hint: "Oversized, thick fleece", garment: "hoodie", fit: "oversized", dropShoulder: "yes", fabricType: "fleece", gsm: "450", wash: "none" },
  { id: "acid-tee", label: "Oversized acid-wash tee", hint: "Relaxed fit, faded look", garment: "tee", fit: "oversized", dropShoulder: "yes", fabricType: "jersey", gsm: "240", wash: "acid" },
  { id: "boxy-tee", label: "Boxy tee", hint: "Wide, square and a bit short", garment: "tee", fit: "boxy", dropShoulder: "yes", fabricType: "jersey", gsm: "240", wash: "none" },
  { id: "crew", label: "Mineral-wash sweatshirt", hint: "Soft, dusty, heavy", garment: "sweatshirt", fit: "oversized", dropShoulder: "yes", fabricType: "french-terry", gsm: "320", wash: "mineral" },
  { id: "zip-jacket", label: "Zip jacket", hint: "Canvas, workwear feel", garment: "jacket", fit: "regular", dropShoulder: "", fabricType: "canvas", gsm: "", wash: "none" },
  { id: "joggers", label: "Joggers", hint: "Soft terry, relaxed", garment: "trousers", fit: "regular", dropShoulder: "", fabricType: "french-terry", gsm: "320", wash: "none" },
];

/** Tops have shoulders and sleeves to talk about; trousers and shorts do not. */
export const isBottom = (g: GarmentId | ""): boolean => g === "trousers" || g === "shorts";

/**
 * The eight steps. `nav` is the short name in the progress bar, `title` the question on the page.
 * Optional steps can be skipped: nothing on them is needed to get a price.
 */
export const steps = [
  { id: "garment", nav: "Start", title: "What are we making?", optional: false },
  { id: "fit", nav: "Fit", title: "How should it fit?", optional: true },
  { id: "fabric", nav: "Fabric", title: "Fabric and finish", optional: true },
  { id: "colours", nav: "Colours", title: "Pick your colours", optional: true },
  { id: "artwork", nav: "Logos", title: "Logos and prints", optional: true },
  { id: "sizes", nav: "How many", title: "How many pieces?", optional: false },
  { id: "labels", nav: "Finishing", title: "Finishing touches", optional: true },
  { id: "review", nav: "Send", title: "Check and send", optional: false },
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
