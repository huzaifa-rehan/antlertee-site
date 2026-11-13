/**
 * Client work shown on the home page, taken from the client's own prototype ("Antlertee Creative Studios (1).html").
 * The owner chose to show these brands; logos and photos are the client's, not ours.
 */
import type { ImageId } from "./images";

export const spotify: { title: string; text: string; images: { id: ImageId; alt?: string }[] } = {
  title: "Spotify RADAR Pakistan",
  text: "Reflective bomber jackets for the Spotify crew: iridescent reflective fabric, printed event branding on the front and back, rib collar, cuffs and hem, and zip pockets.",
  images: [{ id: "spotify-bomber-front" }, { id: "spotify-bomber-back" }, { id: "spotify-bomber-flat" }],
};

export const hardGarments = {
  title: "We take the hard garments",
  text: "Washes that take weeks to get right, puff and chenille, heavyweight fleece, colour-block construction. We take these on because we love making them, and that shows in how they turn out.",
  brand: "Valour",
  pieces: [
    { id: "valour-acid-tee", title: "Acid-wash oversized tee", spec: "Acid wash, large-format print" },
    { id: "valour-colourblock-hoodie", title: "Colour-block hoodie", spec: "Contrast panels, outline embroidery" },
    { id: "valour-heavyweight-hoodie", title: "Heavyweight hoodie", spec: "Fleece, raised logo print" },
    { id: "valour-garment-dyed-tee", title: "Garment-dyed tee", spec: "Washed finish, multi-colour back print" },
  ] satisfies { id: ImageId; title: string; spec: string }[],
};

/** Logo files are in public/brand/clients; `bg` is the colour each logo was supplied on. */
export const brandLogos = [
  { file: "nox-bikergirls", name: "NOX Bikergirls", bg: "#1a1819", w: 360, h: 163 },
  { file: "twoone", name: "TWOONE", bg: "#000000", w: 251, h: 240 },
  { file: "imersiverse", name: "imersiverse", bg: "#000000", w: 360, h: 155 },
  { file: "runway-advertising", name: "Runway Advertising Pakistan", bg: "#000000", w: 360, h: 134 },
  { file: "yarn-script", name: "Client logo, yarn script", bg: "#000000", w: 360, h: 202 },
  { file: "slayworld", name: "slayworld Clothing", bg: "#000000", w: 360, h: 107 },
  { file: "valour", name: "Valour", bg: "#ffffff", w: 234, h: 240 },
  { file: "anime-vogue", name: "Anime Vogue", bg: "#1e1e1e", w: 360, h: 203 },
  { file: "xii-x", name: "XII•X", bg: "#060606", w: 360, h: 118 },
] as const;
