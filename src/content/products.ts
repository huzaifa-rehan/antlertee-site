/**
 * The rack: every product base on the site. Copy is tightened from the brand's own Instagram captions
 * (GSM, fabric, technique). MOQ and delivery figures come from `facts` so they change in one place.
 */
import type { ImageId } from "./images";
import { facts } from "./site";

export const categories = ["Knitwear", "Fleece", "Outerwear", "Denim", "Jerseys", "Embroidery & Print"] as const;
export type Category = (typeof categories)[number];

export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  slug: string;
  name: string;
  category: Category;
  /** Short spec shown under the name on the rack, e.g. "300 GSM". */
  sub: string;
  image: ImageId;
  description: string;
  specs: Spec[];
  finishes: string[];
  moq: string;
  /** Shown on the home page rack. */
  featured?: boolean;
}

const moq = facts.moqLong;

export const products: Product[] = [
  // Knitwear
  {
    slug: "heavyweight-acid-wash-tee",
    name: "Heavyweight acid-wash tee",
    category: "Knitwear",
    sub: "300 GSM",
    image: "tee-acid-300",
    description:
      "300 GSM double-knit cotton jersey with a custom acid-wash finish for a lived-in, vintage feel. Oversized boxy fit, dropped shoulders and a heavyweight rib collar that holds its shape.",
    specs: [
      { label: "Fabric", value: "Double-knit cotton jersey" },
      { label: "Weight", value: "300 GSM" },
      { label: "Fit", value: "Oversized boxy, dropped shoulders" },
    ],
    finishes: ["Acid wash", "Screen print", "Puff print", "Embroidery"],
    moq,
    featured: true,
  },
  {
    slug: "oversized-acid-wash-tee",
    name: "Oversized acid-wash tee",
    category: "Knitwear",
    sub: "220 GSM",
    image: "tee-acid-220",
    description:
      "Oversized acid-washed tee in 100% combed cotton jersey. A clean, ready-for-print base for brands that take their product seriously.",
    specs: [
      { label: "Fabric", value: "100% combed cotton jersey" },
      { label: "Weight", value: "220 GSM" },
      { label: "Fit", value: "Oversized" },
    ],
    finishes: ["Acid wash", "Mineral wash", "Screen print"],
    moq,
    featured: true,
  },
  {
    slug: "oversized-boxy-tee",
    name: "Oversized boxy tee",
    category: "Knitwear",
    sub: "Custom GSM",
    image: "tee-boxy",
    description:
      "Premium oversized boxy-fit tee, made for brands that care about fit and detail. Your fabric weight, your Pantone colour, your label.",
    specs: [
      { label: "Fabric", value: "Premium cotton, custom GSM" },
      { label: "Colour", value: "Pantone matched" },
      { label: "Fit", value: "Oversized boxy" },
    ],
    finishes: ["Screen print", "Pantone matching", "Private label"],
    moq,
  },
  {
    slug: "distressed-tee",
    name: "Distressed heavyweight tee",
    category: "Knitwear",
    sub: "French terry 220–240 GSM",
    image: "tee-distressed",
    description:
      "They called it ruined. We call it luxury. Heavyweight oversized tee in French terry, distressed for a worn-in look.",
    specs: [
      { label: "Fabric", value: "French terry" },
      { label: "Weight", value: "220–240 GSM" },
      { label: "Fit", value: "Heavyweight oversized" },
    ],
    finishes: ["Distressing", "Screen print", "Acid wash"],
    moq,
  },
  {
    slug: "acid-wash-tank",
    name: "Acid-wash printed tank",
    category: "Knitwear",
    sub: "Acid wash + screen",
    image: "tank-acid-print",
    description:
      "Acid washed. Screen printed. Built different. A statement tank top for brands that lead, not follow.",
    specs: [
      { label: "Wash", value: "Acid wash" },
      { label: "Print", value: "Screen print" },
      { label: "Fit", value: "Oversized tank" },
    ],
    finishes: ["Acid wash", "Screen print", "Custom neck tags"],
    moq,
  },

  // Fleece
  {
    slug: "heavyweight-oversized-hoodie",
    name: "Heavyweight oversized hoodie",
    category: "Fleece",
    sub: "450+ GSM",
    image: "hoodie-heavyweight",
    description:
      "450+ GSM oversized hoodie, fully custom from yarn to pack, with embroidery and screen printing. We have shipped this build in bulk to the USA.",
    specs: [
      { label: "Weight", value: "450+ GSM" },
      { label: "Fit", value: "Oversized" },
      { label: "Proof", value: facts.proofHoodieExport },
    ],
    finishes: ["Embroidery", "Screen print", "Appliqué", "Custom labels"],
    moq,
    featured: true,
  },
  {
    slug: "lined-oversized-hoodie",
    name: "Lined oversized hoodie",
    category: "Fleece",
    sub: "350+ GSM fleece",
    image: "hoodie-lined",
    description:
      "350+ GSM cotton fleece for a heavy, luxurious hand, lined with 180 GSM cotton jersey for softness. A high-end oversized fit for premium lines.",
    specs: [
      { label: "Shell", value: "350+ GSM cotton fleece" },
      { label: "Lining", value: "180 GSM cotton jersey" },
      { label: "Fit", value: "Oversized" },
    ],
    finishes: ["Screen print", "Puff print", "Embroidery", "DTF"],
    moq,
  },
  {
    slug: "applique-hoodie",
    name: "Appliqué hoodie",
    category: "Fleece",
    sub: "Precision appliqué",
    image: "hoodie-applique",
    description:
      "Appliqué embroidery hoodie for brands that plan to scale, not gamble. Premium fabrics, precision appliqué, in-house quality control and export standards.",
    specs: [
      { label: "Fabric", value: "Premium fleece" },
      { label: "Decoration", value: "Precision appliqué" },
      { label: "QC", value: "In-house, export standard" },
    ],
    finishes: ["Appliqué", "Embroidery", "3D puff embroidery"],
    moq,
  },
  {
    slug: "acid-wash-sweatshirt",
    name: "Acid-wash sweatshirt",
    category: "Fleece",
    sub: "Heavy GSM",
    image: "sweat-acid",
    description:
      "Oversized acid-washed sweatshirt, done right. Heavy GSM, premium knits, a deep wash and an export finish, with consistent quality from sample to bulk.",
    specs: [
      { label: "Weight", value: "Heavy GSM, premium knit" },
      { label: "Wash", value: "Custom acid process" },
      { label: "Fit", value: "Oversized" },
    ],
    finishes: ["Acid wash", "Mineral wash", "Private label"],
    moq,
    featured: true,
  },
  {
    slug: "mineral-wash-crew",
    name: "Mineral-wash crew",
    category: "Fleece",
    sub: "Acid / mineral",
    image: "sweat-mineral",
    description:
      "Acid and mineral washed crew sweatshirt with a raw, retro texture. Each piece is uniquely washed for a raw, retro look.",
    specs: [
      { label: "Wash", value: "Acid or mineral" },
      { label: "Weight", value: "Custom GSM" },
      { label: "Fit", value: "Regular or oversized" },
    ],
    finishes: ["Mineral wash", "Acid wash", "Embroidery"],
    moq,
  },
  {
    slug: "camo-print-hoodie",
    name: "Camo print hoodie",
    category: "Fleece",
    sub: "All-over print",
    image: "hoodie-camo-print",
    description:
      "Pullover hoodie with an all-over camo print, cut and sewn to your pattern. Bring your own camo or graphic and we print it edge to edge.",
    specs: [
      { label: "Print", value: "All-over, edge to edge" },
      { label: "Weight", value: "Custom GSM fleece" },
      { label: "Fit", value: "Regular or oversized" },
    ],
    finishes: ["All-over print", "Embroidery", "Custom labels"],
    moq,
  },
  {
    slug: "washed-fleece-joggers",
    name: "Washed fleece joggers",
    category: "Fleece",
    sub: "Garment washed",
    image: "joggers-washed",
    description:
      "Garment-washed fleece joggers with a drawstring waist and cuffed ankles. The bottom half of a matching set.",
    specs: [
      { label: "Fabric", value: "Cotton fleece" },
      { label: "Wash", value: "Garment / mineral wash" },
      { label: "Fit", value: "Relaxed, cuffed" },
    ],
    finishes: ["Mineral wash", "Embroidery", "Screen print"],
    moq,
  },
  {
    slug: "acid-wash-print-hoodie",
    name: "Acid-wash print hoodie",
    category: "Fleece",
    sub: "Wash + screen",
    image: "hoodie-acid-print",
    description:
      "Acid-washed oversized hoodie with a premium screen print. Not just another hoodie: a statement piece, 100% customised.",
    specs: [
      { label: "Wash", value: "Acid wash" },
      { label: "Print", value: "Screen print" },
      { label: "Fit", value: "Oversized" },
    ],
    finishes: ["Acid wash", "Screen print", "Custom labels"],
    moq,
  },
  {
    slug: "split-pocket-hoodie",
    name: "Split-pocket hoodie",
    category: "Fleece",
    sub: "Oversized",
    image: "hoodie-split-pocket",
    description:
      "Oversized split-pocket hoodie that blends street style with function. A different silhouette for brands that want to drop something new.",
    specs: [
      { label: "Construction", value: "Split front pocket" },
      { label: "Fit", value: "Oversized" },
      { label: "Colour", value: "Pantone matched" },
    ],
    finishes: ["Embroidery", "Screen print", "Puff print"],
    moq,
  },
  {
    slug: "colour-block-hoodie",
    name: "Colour-block hoodie",
    category: "Fleece",
    sub: "Embroidered",
    image: "hoodie-colour-block",
    description:
      "Custom colour-block oversized hoodie with premium embroidery. Panels cut and sewn in your colours.",
    specs: [
      { label: "Construction", value: "Cut & sew colour blocking" },
      { label: "Decoration", value: "Embroidery" },
      { label: "Fit", value: "Oversized" },
    ],
    finishes: ["Embroidery", "Colour blocking", "Custom labels"],
    moq,
  },

  // Outerwear
  {
    slug: "heat-reactive-puffer",
    name: "Heat-reactive puffer",
    category: "Outerwear",
    sub: "Changes colour with heat",
    image: "puffer-heat-reactive",
    description:
      "This is not a normal jacket. A puffer whose shell changes colour with temperature. Imported fabrics, complex patterns, handcrafted and finished like a high-end piece.",
    specs: [
      { label: "Shell", value: "Heat-reactive, imported" },
      { label: "Build", value: "Handcrafted, quilted" },
      { label: "Delivery", value: `${facts.turnaroundPuffer} (pre-order)` },
    ],
    finishes: ["Heat-reactive finish", "Custom branding"],
    moq: facts.moqPuffer,
  },
  {
    slug: "hybrid-quilted-jacket",
    name: "Hybrid quilted jacket",
    category: "Outerwear",
    sub: "Quilted + fleece",
    image: "jacket-hybrid-quilted",
    description:
      "A quilted puffer body with fleece sleeves and hood: warmth where it counts, movement where you need it. Built in your colours and trims.",
    specs: [
      { label: "Body", value: "Quilted, padded" },
      { label: "Sleeves & hood", value: "Fleece" },
      { label: "Closure", value: "Full zip" },
    ],
    finishes: ["Custom trims", "Embroidery", "Custom lining"],
    moq,
  },
  {
    slug: "camo-reflective-bomber",
    name: "Camo reflective bomber",
    category: "Outerwear",
    sub: "3M reflective",
    image: "bomber-camo-reflective",
    description:
      "Performance fabrics, clean construction and 3M reflective detailing that glows under camera flash. Custom fabrics, trims and lining, export-grade finishing.",
    specs: [
      { label: "Shell", value: "3M reflective camo" },
      { label: "Lining", value: "Premium, custom" },
      { label: "Delivery", value: facts.turnaroundBomber },
    ],
    finishes: ["3M reflective", "Custom lining", "Custom trims"],
    moq,
    featured: true,
  },
  {
    slug: "rainbow-reflective-bomber",
    name: "Rainbow reflective bomber",
    category: "Outerwear",
    sub: "3M rainbow reflective",
    image: "bomber-rainbow-reflective",
    description:
      "3M rainbow reflective bomber that throws colour under light. High-impact outerwear to anchor a reflective collection.",
    specs: [
      { label: "Shell", value: "3M rainbow reflective" },
      { label: "Sizes", value: "S–XL" },
      { label: "Finish", value: "Export quality" },
    ],
    finishes: ["Rainbow reflective", "Custom branding", "Bulk manufacturing"],
    moq,
  },
  {
    slug: "camo-reflective-coord",
    name: "Camo reflective co-ord",
    category: "Outerwear",
    sub: "Hoodie + cargo set",
    image: "coord-camo-reflective",
    description:
      "Reflective camo hoodie and cargo trouser set. A winter essential, elevated, for brands on the edge of luxury and streetwear.",
    specs: [
      { label: "Set", value: "Hoodie + cargo trousers" },
      { label: "Fabric", value: "Reflective camo" },
      { label: "Branding", value: "Custom" },
    ],
    finishes: ["Reflective", "Custom branding", "Custom trims"],
    moq,
  },

  // Denim
  {
    slug: "custom-denim",
    name: "Custom denim",
    category: "Denim",
    sub: "Your wash, your fit",
    image: "denim-custom",
    description:
      "Fully custom denim manufacturing: custom washes, fits and finishes, built for brands ready to launch and scale.",
    specs: [
      { label: "Build", value: "Fully custom" },
      { label: "Wash", value: "Custom washes" },
      { label: "Fit", value: "Custom fits" },
    ],
    finishes: ["Custom wash", "Custom fit", "Custom finish", "Private label"],
    moq,
  },

  // Jerseys
  {
    slug: "basketball-jersey",
    name: "Oversized basketball jersey",
    category: "Jerseys",
    sub: "Sublimated",
    image: "jersey-basketball",
    description:
      "Sublimated. Street-cut. Oversized basketball jerseys designed for premium resale. You bring the idea, we bring it to life.",
    specs: [
      { label: "Print", value: "Full sublimation" },
      { label: "Cut", value: "Oversized, street-cut" },
      { label: "Finishing", value: "Overlock, export grade" },
    ],
    finishes: ["Sublimation", "Custom neck tags", "Private label"],
    moq,
  },

  // Embroidery & Print
  {
    slug: "canvas-embroidered-jacket",
    name: "Canvas embroidered jacket",
    category: "Embroidery & Print",
    sub: "211,573 stitches",
    image: "jacket-canvas-embroidery",
    description: "Art, turned into thread. High-density embroidery, 211,573 stitches, on heavyweight duck canvas.",
    specs: [
      { label: "Fabric", value: "Heavyweight duck canvas" },
      { label: "Stitches", value: "211,573" },
      { label: "Technique", value: "High-density embroidery" },
    ],
    finishes: ["High-density embroidery", "Duck canvas"],
    moq,
    featured: true,
  },
  {
    slug: "screen-printed-tee",
    name: "Screen-printed tee",
    category: "Embroidery & Print",
    sub: "Export-level print",
    image: "tee-screen-print",
    description:
      "Precision screen printing on an oversized boxy tee. Vibrant, durable, raised where you want it. No peel, no fade.",
    specs: [
      { label: "Print", value: "Screen, oil-based available" },
      { label: "Colour", value: "Pantone matched" },
      { label: "Fit", value: "Oversized boxy" },
    ],
    finishes: ["Screen print", "Puff print", "HD print"],
    moq,
  },
  {
    slug: "puff-embroidery-tee",
    name: "3D puff embroidery tee",
    category: "Embroidery & Print",
    sub: "3D puff + appliqué",
    image: "tee-puff-embroidery",
    description:
      "3D puff foam and appliqué embroidery on oversized cut-and-sew tees. Premium work, made for premium brands.",
    specs: [
      { label: "Technique", value: "3D puff + appliqué embroidery" },
      { label: "Construction", value: "Cut & sew" },
      { label: "Fit", value: "Oversized" },
    ],
    finishes: ["3D puff embroidery", "Appliqué", "Chenille"],
    moq,
  },
  {
    slug: "reflective-dtf-tee",
    name: "Rainbow reflective DTF tee",
    category: "Embroidery & Print",
    sub: "Reflective DTF",
    image: "tee-reflective-dtf",
    description:
      "Rainbow reflective DTF transfers that flip colour under flash. Sharp, vibrant and built to last on any base.",
    specs: [
      { label: "Technique", value: "Rainbow reflective DTF" },
      { label: "Base", value: "Oversized tee or hoodie" },
      { label: "Finish", value: "Heat-pressed transfer" },
    ],
    finishes: ["Reflective DTF", "Rainbow reflective", "Vinyl"],
    moq,
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const featuredProducts = products.filter((p) => p.featured);
