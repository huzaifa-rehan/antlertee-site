import type { ImageId } from "@/content/images";
import { facts } from "@/content/site";

/** One block of an article body. Plain data, so the posts render as static HTML with no markdown pipeline. */
export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "note"; text: string };

export interface Post {
  slug: string;
  title: string;
  /** One sentence for the card, the page description and the share preview. */
  summary: string;
  /** ISO date. */
  date: string;
  readMinutes: number;
  tag: string;
  image: ImageId;
  body: Block[];
}

/**
 * The journal. General manufacturing guidance written for brands that are new to private label, in the studio's voice.
 * Nothing here names a client or states an unconfirmed figure; the only numbers that come from the business are read
 * from `facts` (src/content/site.ts), which carries the "confirm with client" notes. Swap or add posts here.
 */
export const posts: Post[] = [
  {
    slug: "what-goes-in-a-tech-pack",
    title: "What goes in a tech pack (and what you can leave to us)",
    summary: "The eight things a factory needs to quote and sample your garment, and the details you do not have to solve alone.",
    date: "2026-11-11",
    readMinutes: 5,
    tag: "Tech pack",
    image: "factory-own-label",
    body: [
      {
        type: "p",
        text: "A tech pack is the written version of your garment. It is the one document that lets a factory quote, cut and sew the piece you are picturing without guessing. A good one saves a sampling round or two. A thin one is still worth sending: we would rather start from a rough pack than from a screenshot.",
      },
      { type: "h2", text: "The eight things to cover" },
      {
        type: "ul",
        items: [
          "Garment: the type (hoodie, tee, jacket) and a flat sketch or reference photo from the front and back.",
          "Fit: boxy, oversized, regular or cropped, plus the length and width you want. A garment you already own and like is the best reference.",
          "Fabric: composition, weight in GSM and the feel you want, such as brushed fleece, heavy jersey or canvas.",
          "Colours: a Pantone code or a physical swatch for each colourway. Screen colours drift, so a code or a swatch beats a photo.",
          "Artwork: where each graphic sits, how big it is and how it is made (screen print, embroidery, puff, appliqué, DTF).",
          "Washes and finishes: acid, mineral, garment dye or distressing, and anything special such as reflective or heat-reactive fabric.",
          "Sizes: the size range and how many pieces per size and colour.",
          "Labels and packing: neck label, care label, hang tags and how the order is folded and boxed.",
        ],
      },
      { type: "h2", text: "What you can leave to us" },
      {
        type: "p",
        text: "You do not need to know the stitch type, the seam allowance or how a pattern is graded across sizes. Those are the factory's job. Tell us how the garment should look and feel and we turn it into the construction details, then confirm them with you on the sample.",
      },
      { type: "h2", text: "Do not have a tech pack yet?" },
      {
        type: "p",
        text: "Use the builder on the Process page. It walks through the same points, lets you download the result as a PDF and sends it to us on WhatsApp or email. If you already have a pack, send it as it is.",
      },
      { type: "note", text: "Start with the builder on the Process page, or send your own pack from the same section." },
    ],
  },
  {
    slug: "gsm-explained-how-heavy-should-your-hoodie-be",
    title: "GSM explained: how heavy should your hoodie be?",
    summary: "What grams per square metre really tells you about a fabric, and how to pick a weight for tees, hoodies and sweatshirts.",
    date: "2026-11-11",
    readMinutes: 4,
    tag: "Fabric",
    image: "hoodie-heavyweight",
    body: [
      {
        type: "p",
        text: "GSM is grams per square metre: the weight of one square metre of fabric. It is the quickest way to describe how substantial a garment will feel in the hand, and the number most brands ask us about first.",
      },
      { type: "h2", text: "Rough ranges" },
      {
        type: "ul",
        items: [
          "Light tees: around 140 to 180 GSM. Thin, drapey, good for layering and warm weather.",
          "Standard tees: around 180 to 220 GSM. The everyday weight.",
          "Heavyweight tees: 240 GSM and up. A boxy, structured drop that keeps its shape.",
          "Lightweight hoodies and sweats: around 250 to 300 GSM.",
          "Heavyweight hoodies and sweats: 350 GSM and above, with the premium end going past 450.",
        ],
      },
      { type: "h2", text: "Heavier is not always better" },
      {
        type: "p",
        text: "Weight changes the drape, the warmth, the shipping cost and the price. A very heavy fleece looks great on a cold-weather drop and feels wrong in a hot market. Pick the weight for where and how the piece will be worn, then match the fit to it: oversized and boxy cuts carry heavier fabric best.",
      },
      { type: "h2", text: "Knit and finish matter as much as the number" },
      {
        type: "p",
        text: "Two fabrics at the same GSM can feel different. The yarn, the knit structure and a brushed or unbrushed inside all change the hand feel, and washes take a little weight out. If you can, send a garment you like and we match it, then confirm the weight on the sample.",
      },
      { type: "note", text: `Typical minimum order: ${facts.moqLong}. Tell us your weight and we will confirm what is possible.` },
    ],
  },
  {
    slug: "acid-mineral-and-distressed-washes",
    title: "Acid wash, mineral wash and distressing: what each one does",
    summary: "Three finishes that give a garment its lived-in look, how they differ and what to think about before you choose one.",
    date: "2026-11-11",
    readMinutes: 4,
    tag: "Washes",
    image: "sweat-acid",
    body: [
      {
        type: "p",
        text: "A wash is the finishing step that gives a garment its character after it is sewn. The same black hoodie can read as clean and new, soft and faded or rough and worn depending on the wash.",
      },
      { type: "h2", text: "Acid wash" },
      {
        type: "p",
        text: "Acid wash strips colour in a marbled, uneven pattern, so each piece comes out slightly different. It reads as bold and high contrast, and suits oversized tees, sweatshirts and hoodies.",
      },
      { type: "h2", text: "Mineral wash" },
      {
        type: "p",
        text: "Mineral wash fades the colour more evenly and gives a soft, sun-washed, vintage tone with a gentler hand feel. It works well on heavyweight fleece and crew sweatshirts.",
      },
      { type: "h2", text: "Distressing" },
      {
        type: "p",
        text: "Distressing adds physical wear: worn edges, frayed hems and a rougher surface. It suits a streetwear look where the piece should seem as if it has already been lived in.",
      },
      { type: "h2", text: "Before you choose" },
      {
        type: "ul",
        items: [
          "Every washed piece varies a little. That is the point, so agree an approved sample and a range you are happy with.",
          "A wash can shrink fabric and soften it. Tell us the fit you want after washing and we plan the pattern for it.",
          "Dark base colours show the effect most strongly. Pale colours need a lighter touch.",
          "Print and embroidery sit differently on washed fabric, so decide the order of steps with your factory.",
        ],
      },
      { type: "note", text: "Not sure which wash fits your drop? Send a reference photo and we will suggest options and a price." },
    ],
  },
  {
    slug: "from-sample-to-bulk",
    title: "From sample to bulk: how a private-label order runs",
    summary: "The path from your first message to boxed garments, and where you make decisions along the way.",
    date: "2026-11-11",
    readMinutes: 5,
    tag: "Process",
    image: "factory-bulk-boxes",
    body: [
      {
        type: "p",
        text: "A private-label order is a short series of approvals. Knowing the order of them helps you plan a launch date without surprises.",
      },
      { type: "h2", text: "1. Brief and quote" },
      {
        type: "p",
        text: "You send a tech pack or a reference and your quantities. We reply with fabric options and a price. The more detail you give here, the fewer rounds you need later.",
      },
      { type: "h2", text: "2. Sample" },
      {
        type: "p",
        text: "We make a sample to the pack: the right fabric, fit, wash, print and labels. You check it, send notes and we adjust. This is the stage to be fussy; changes cost little now and a lot once bulk is cut.",
      },
      { type: "h2", text: "3. Approve and book bulk" },
      {
        type: "p",
        text: `Once you sign off the sample, we confirm quantities per size and colour. Minimums are ${facts.moqLong}, and we agree timing from the date the order is confirmed. Typical turnaround is ${facts.turnaround}, depending on the piece.`,
      },
      { type: "h2", text: "4. Production and quality checks" },
      {
        type: "p",
        text: "Fabric is cut, sewn, washed, printed or embroidered and labelled on one floor. We check the work against the approved sample as it goes, not only at the end.",
      },
      { type: "h2", text: "5. Pack and ship" },
      {
        type: "p",
        text: "Garments are folded, bagged and boxed to your instructions and shipped worldwide. If you need hang tags, polybag stickers or specific carton marking, put it in the tech pack.",
      },
      { type: "note", text: "Ready to start? Build a tech pack on the Process page or message us on WhatsApp." },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
