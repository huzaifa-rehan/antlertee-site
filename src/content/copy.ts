/**
 * Page copy for home, about and process. Facts come from the baseline study and Instagram captions;
 * figures come from `facts` (see site.ts for which ones still need the client's confirmation).
 */
import type { ImageId } from "./images";
import { contact, facts } from "./site";

export const hero = {
  label: ["( Custom garment manufacturing )", "[ Karachi, PK ]"],
  lede: "Premium knitwear, outerwear and denim for clothing brands. Tech pack in, finished garments out, under your label.",
  tags: [`[ MOQ ${facts.moq} / colour ]`, "[ Worldwide shipping ]"],
  phases: [
    { n: "01", title: "Pattern & cut", detail: "Custom GSM, fits, Pantone" },
    { n: "02", title: "Stitch", detail: "Cut & sew, export finishing" },
    { n: "03", title: "Wash", detail: "Acid, mineral, distressed" },
    { n: "04", title: "Print & brand", detail: "Screen, puff, embroidery" },
  ],
} as const;

export const statement = {
  text: "We build garments for brands that refuse average. Heavyweight knits, specialised washes, print and embroidery, from your tech pack to bulk, under one roof in Karachi.",
  meta: ["( Karachi, PK )", `[ ${facts.brandsServed} brands ]`, "[ Exported worldwide ]"],
};

export const marquee = [
  "[ Yarn to pack ]",
  `[ MOQ ${facts.moq} per colour ]`,
  "[ Tech pack → bulk ]",
  "[ Heavyweight knits ]",
  "[ Acid & mineral washes ]",
  "[ Screen, puff & embroidery ]",
  "[ Worldwide shipping ]",
];

export const gallery: { slug: string; image: ImageId; tag: string; title: string; text: string }[] = [
  { slug: "heat-reactive-puffer", image: "puffer-heat-reactive", tag: "Outerwear", title: "Heat-reactive puffer", text: "Changes colour with heat. Imported fabrics, handcrafted." },
  { slug: "camo-reflective-bomber", image: "bomber-camo-reflective", tag: "Outerwear", title: "Camo reflective bomber", text: "3M reflective fabric, premium lining, detailed stitchwork." },
  { slug: "heavyweight-acid-wash-tee", image: "tee-acid-300", tag: "Knitwear", title: "300 GSM acid-wash tee", text: "Double-knit cotton jersey, oversized boxy fit." },
  { slug: "canvas-embroidered-jacket", image: "jacket-canvas-embroidery", tag: "Embroidery", title: "Canvas embroidered jacket", text: "211,573 stitches on heavyweight duck canvas." },
  { slug: "screen-printed-tee", image: "tee-screen-print", tag: "Print", title: "Screen-printed tee", text: "Oversized boxy fit, precision screen printing." },
  { slug: "applique-hoodie", image: "hoodie-applique", tag: "Embroidery", title: "Appliqué hoodie", text: "Premium fleece, precision appliqué." },
  { slug: "acid-wash-sweatshirt", image: "sweat-acid", tag: "Washes", title: "Acid-wash sweatshirt", text: "Heavy GSM, deep wash, export finish." },
];

export const collections: {
  slug: string;
  image: ImageId;
  t1: string;
  t2: string;
  accent: string;
  spec: [string, string][];
}[] = [
  {
    slug: "heat-reactive-puffer",
    image: "puffer-heat-reactive",
    t1: "Heat-reactive",
    t2: "Puffer",
    accent: "#ff5a36",
    spec: [["Shell", "Heat-reactive, imported"], ["Build", "Handcrafted, quilted"], ["Season", "Winter 26–27"], ["MOQ", facts.moqPuffer]],
  },
  {
    slug: "oversized-acid-wash-tee",
    image: "tee-acid-220",
    t1: "Acid-wash",
    t2: "Tee",
    accent: "#8fb3c9",
    spec: [["Fabric", "100% combed cotton"], ["Weight", "220 GSM jersey"], ["Fit", "Oversized"], ["MOQ", `${facts.moq} / colour`]],
  },
  {
    slug: "heavyweight-oversized-hoodie",
    image: "hoodie-acid-print",
    t1: "Heavyweight",
    t2: "Hoodie",
    accent: "#ffe500",
    spec: [["Weight", "450+ GSM"], ["Finish", "Embroidery + screen"], ["Fit", "Oversized"], ["Proof", facts.proofHoodieExport]],
  },
  {
    slug: "mineral-wash-crew",
    image: "sweat-mineral",
    t1: "Mineral-wash",
    t2: "Crew",
    accent: "#b9a58c",
    spec: [["Wash", "Acid / mineral"], ["Weight", "Heavy GSM"], ["Fit", "Oversized"], ["MOQ", `${facts.moq} / colour`]],
  },
];

export const steps: { n: string; title: string; text: string; detail: string; image: ImageId }[] = [
  {
    n: "01",
    title: "Send your tech pack",
    text: "Or just a mockup and PNG design files. We spec fabric, GSM, fit and print.",
    detail:
      "Choose your base and fit (oversized or regular), send your designs and the PNG files for each placement, and pick your techniques. No tech pack yet? A mockup is enough to start; we build the spec with you: fabric, GSM, Pantone colours, fit and trims.",
    image: "tee-monster-print",
  },
  {
    n: "02",
    title: "Sample",
    text: "Fabric development and a sample to approve before anything goes to bulk.",
    detail:
      "We develop the fabric, cut the pattern and make a sample so you can check weight, fit, print and finish in hand. Nothing goes to bulk until you approve it.",
    image: "jersey-basketball",
  },
  {
    n: "03",
    title: "Bulk production",
    text: "Cut, sew, print, embroider and wash on our own floor.",
    detail:
      "Knitting, cut and sew, screen printing on manual and automatic presses, embroidery, specialised washes and garment finishing, all handled in-house in Karachi. No juggling multiple suppliers.",
    image: "factory-screen-line",
  },
  {
    n: "04",
    title: "QC & ship",
    text: "Final quality check, packing and worldwide shipping.",
    detail:
      "Every bulk order goes through a final quality check before dispatch, then it is packed with your labels and shipped worldwide.",
    image: "factory-bulk-boxes",
  },
];

export const proof = [
  { value: facts.brandsServed, label: "clothing brands served" },
  { value: facts.moq, label: "pieces MOQ per colour / design" },
  { value: String(facts.exportMarkets.length), label: `export markets: ${facts.exportMarkets.join(", ")}` },
  { value: facts.turnaround.replace(" weeks", " wk"), label: "typical turnaround" },
];

export const capabilities: { title: string; text: string }[] = [
  { title: "Fabric development & knitting", text: "Custom GSM and fabric compositions, knitted for your line." },
  { title: "Pantone colour matching", text: "Your exact colours, matched for dye and print." },
  { title: "Patterns, fits & construction", text: "Custom patterns and fits, cut and sewn to your spec." },
  { title: "Printing", text: "Screen and oil-based screen, puff, HD, DTF, reflective and rainbow reflective DTF, vinyl, sublimation." },
  { title: "Embroidery", text: "3D puff, appliqué, chenille and high-density embroidery." },
  { title: "Specialised washes", text: "Acid, mineral and distressed washes, plus garment finishing." },
  { title: "Labels & trims", text: "Custom neck tags, labels and finishing under your brand." },
  { title: "QC, packing & shipping", text: "Final quality control, packing and worldwide shipping." },
];

export const about = {
  intro:
    "Antlertee Creative Studios started with a college dropout and a clothing brand. It grew from humble beginnings to our own manufacturing unit in Karachi.",
  story: [
    "We also own Antlertee, our own clothing brand. Running it is how we know what founders need from a manufacturer: fabric that feels premium, fits that sell and consistent quality from sample to bulk.",
    "Our pieces start as our own R&D: testing fabrics, refining fits, experimenting with washes, prints and construction.",
    `Over the last ${facts.yearsInBusiness} years it has gone into manufacturing for ${facts.brandsServed} clothing brands, with export orders to the ${facts.exportMarkets.slice(0, -1).join(", ")} and ${facts.exportMarkets.at(-1)}.`,
  ],
  quote: [
    "I didn’t become a garment manufacturer.",
    "I became obsessed with building products people actually want to wear.",
  ],
  quoteAfter: "Let’s build something worth putting your name on.",
  factory: {
    title: "The floor.",
    text: "Knitting, cutting, sewing, printing, embroidery and washing under one roof. Automatic and manual screen printing, multi-head embroidery, overlock and finishing, then QC and packing before every shipment.",
    images: [
      { image: "factory-knitting", caption: "Knitting" },
      { image: "factory-embroidery", caption: "Multi-head embroidery" },
      { image: "factory-auto-press", caption: "Automatic screen press" },
      { image: "factory-hand-print", caption: "Hand screen printing" },
      { image: "factory-screen-line", caption: "Print line" },
      { image: "factory-bulk-boxes", caption: "Packed for export" },
    ] as { image: ImageId; caption: string }[],
  },
};

export const faqs: { q: string; a: string }[] = [
  {
    q: "What can you manufacture?",
    a: "T-shirts (oversized, boxy and regular), hoodies, sweatshirts, tracksuits and co-ords, cargo and straight trousers, shorts, denim, basketball jerseys, puffer and bomber jackets, reflective outerwear, polos, crop tops and tank tops.",
  },
  {
    q: "What is your minimum order quantity?",
    a: `Our standard MOQ is ${facts.moqLong}. The heat-reactive puffer is the exception at 30 pieces.`,
  },
  {
    q: "Can I order a sample before bulk?",
    a: "Yes. You can order a sample first and approve weight, fit, print and finish before anything goes into bulk production.",
  },
  {
    q: "Do you only do large orders?",
    a: "No. We work from print-on-demand through to custom low-MOQ manufacturing and bulk, so you can start small and scale with the same team.",
  },
  {
    q: "What do I need to send you?",
    a: "A tech pack if you have one. If not, a mockup and PNG files of your design placements are enough to start; we spec fabric, GSM, fit and print with you.",
  },
  {
    q: "Which print, embroidery and wash techniques do you offer?",
    a: "Printing: screen and oil-based screen, puff, HD, DTF, reflective and rainbow reflective DTF, vinyl and sublimation. Embroidery: 3D puff, appliqué, chenille and high-density. Washes: acid, mineral and distressed.",
  },
  {
    q: "Can you match my colours and add my labels?",
    a: "Yes. We do Pantone colour matching, custom GSM and fabric compositions, and custom neck tags, labels and finishing, so the garment ships as your brand.",
  },
  {
    q: "How long does production take?",
    a: `Typical turnaround is ${facts.turnaround}. We confirm the timeline for your order with the quote, as it depends on the garment, techniques and quantity.`,
  },
  {
    q: "Do you ship worldwide?",
    a: `Yes. We ship worldwide and have exported to the ${facts.exportMarkets.slice(0, -1).join(", ")} and ${facts.exportMarkets.at(-1)}.`,
  },
  {
    q: "How do I get started?",
    a: `Send us the quote form, or message us on WhatsApp at ${contact.whatsappLocal}. Tell us the product, quantity and deadline and we will take it from there.`,
  },
];
