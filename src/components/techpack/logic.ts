import { splitEvenly } from "./quantity";
import {
  emptyTechPack,
  fabricTypes,
  fits,
  garmentTypes,
  MAX_COLOURWAYS,
  moqMin,
  neckLabels,
  sizes as allSizes,
  techniques,
  washes,
  weights,
  zonesFor,
  type Colourway,
  type Placement,
  type SizeId,
  type StepId,
  type TechPack,
} from "@/content/techpack";

/* ---------- persistence (localStorage, always wrapped: private mode and blocked storage throw) ---------- */

const STORAGE_KEY = "acs-techpack-v1";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 2000): string | undefined => (typeof v === "string" ? v.slice(0, max) : undefined);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined;

/** Rebuilds a draft from untrusted JSON, keeping only fields with the expected shape. */
export function sanitize(raw: unknown): TechPack {
  const d = emptyTechPack();
  if (!isRecord(raw)) return d;
  const ids = (list: readonly { id: string }[]) => list.map((x) => x.id);
  const out: TechPack = {
    ...d,
    preset: str(raw.preset, 40) ?? d.preset,
    garment: oneOf(raw.garment, ids(garmentTypes) as TechPack["garment"][]) ?? d.garment,
    garmentOther: str(raw.garmentOther, 200) ?? d.garmentOther,
    styleName: str(raw.styleName, 120) ?? d.styleName,
    fit: oneOf(raw.fit, ids(fits) as TechPack["fit"][]) ?? d.fit,
    dropShoulder: oneOf(raw.dropShoulder, ["yes", "no"] as const) ?? d.dropShoulder,
    lengthNotes: str(raw.lengthNotes, 400) ?? d.lengthNotes,
    composition: str(raw.composition, 120) ?? d.composition,
    gsm: str(raw.gsm, 8) ?? d.gsm,
    fabricType: oneOf(raw.fabricType, ids(fabricTypes) as TechPack["fabricType"][]) ?? d.fabricType,
    wash: oneOf(raw.wash, ids(washes) as TechPack["wash"][]) ?? d.wash,
    artworkNotes: str(raw.artworkNotes, 1000) ?? d.artworkNotes,
    neckLabel: oneOf(raw.neckLabel, ids(neckLabels) as TechPack["neckLabel"][]) ?? d.neckLabel,
    careLabel: typeof raw.careLabel === "boolean" ? raw.careLabel : d.careLabel,
    hangTag: typeof raw.hangTag === "boolean" ? raw.hangTag : d.hangTag,
    polybag: typeof raw.polybag === "boolean" ? raw.polybag : d.polybag,
    customPackaging: typeof raw.customPackaging === "boolean" ? raw.customPackaging : d.customPackaging,
    packagingNotes: str(raw.packagingNotes, 400) ?? d.packagingNotes,
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.deadline)) ? String(raw.deadline) : d.deadline,
    market: str(raw.market, 120) ?? d.market,
    name: str(raw.name, 120) ?? d.name,
    brand: str(raw.brand, 120) ?? d.brand,
    email: str(raw.email, 200) ?? d.email,
    whatsapp: str(raw.whatsapp, 40) ?? d.whatsapp,
    notes: str(raw.notes, 2000) ?? d.notes,
  };

  if (Array.isArray(raw.colourways)) {
    const cws: Colourway[] = raw.colourways
      .filter(isRecord)
      .slice(0, MAX_COLOURWAYS)
      .map((c, i) => ({
        id: str(c.id, 40) || `c${i + 1}`,
        name: str(c.name, 60) ?? "",
        hex: /^#[0-9a-f]{6}$/i.test(String(c.hex)) ? String(c.hex) : "#111111",
        pantone: str(c.pantone, 40) ?? "",
      }));
    if (cws.length) out.colourways = cws;
  }

  if (isRecord(raw.placements)) {
    const placements: Record<string, Placement> = {};
    for (const [zone, p] of Object.entries(raw.placements)) {
      if (!isRecord(p)) continue;
      placements[zone.slice(0, 40)] = {
        technique: oneOf(p.technique, ids(techniques) as Placement["technique"][]) ?? "",
        size: str(p.size, 60) ?? "",
      };
    }
    out.placements = placements;
  }

  if (Array.isArray(raw.sizes)) {
    const chosen = raw.sizes.filter((s): s is SizeId => oneOf(s, allSizes) !== undefined);
    out.sizes = allSizes.filter((s) => chosen.includes(s));
  }

  if (isRecord(raw.quantities)) {
    const q: TechPack["quantities"] = {};
    for (const [cw, row] of Object.entries(raw.quantities)) {
      if (!isRecord(row)) continue;
      const clean: Partial<Record<SizeId, string>> = {};
      for (const s of allSizes) {
        const v = row[s];
        if (typeof v === "string" && /^\d{0,6}$/.test(v)) clean[s] = v;
      }
      q[cw.slice(0, 40)] = clean;
    }
    out.quantities = q;
  }
  return out;
}

export function loadDraft(): { data: TechPack; step: number } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: emptyTechPack(), step: 0 };
    const parsed: unknown = JSON.parse(raw);
    const step = isRecord(parsed) && typeof parsed.step === "number" ? Math.max(0, Math.min(7, Math.floor(parsed.step))) : 0;
    return { data: sanitize(isRecord(parsed) ? parsed.data : undefined), step };
  } catch {
    // Storage blocked or corrupt JSON: start a fresh draft.
    return { data: emptyTechPack(), step: 0 };
  }
}

export function saveDraft(data: TechPack, step: number): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step }));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/* ---------- derived values ---------- */

const labelOf = <T extends { id: string; label: string }>(list: readonly T[], id: string): string =>
  list.find((x) => x.id === id)?.label ?? "";

export const garmentLabel = (d: TechPack): string =>
  d.garment === "other" ? d.garmentOther.trim() || "Other garment" : labelOf(garmentTypes, d.garment);
export const fitLabel = (d: TechPack): string => labelOf(fits, d.fit);
export const fabricLabel = (d: TechPack): string => labelOf(fabricTypes, d.fabricType);
export const washLabel = (d: TechPack): string => labelOf(washes, d.wash);
export const techniqueLabel = (id: string): string => labelOf(techniques, id);
export const neckLabelLabel = (d: TechPack): string => labelOf(neckLabels, d.neckLabel);

export const weightLabel = (d: TechPack): string => weights.find((w) => w.gsm === d.gsm)?.label ?? "";

export const colourwayName = (c: Colourway, i: number): string => c.name.trim() || `Colour ${i + 1}`;

export function qty(d: TechPack, cwId: string, size: SizeId): number {
  const n = Number.parseInt(d.quantities[cwId]?.[size] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function colourwayTotal(d: TechPack, cwId: string): number {
  return d.sizes.reduce((sum, s) => sum + qty(d, cwId, s), 0);
}

export function grandTotal(d: TechPack): number {
  return d.colourways.reduce((sum, c) => sum + colourwayTotal(d, c.id), 0);
}

export function isUnderMoq(total: number): boolean {
  return total > 0 && moqMin > 0 && total < moqMin;
}

/** Placements on zones the chosen garment actually has, in sketch order. */
export function activePlacements(d: TechPack): { id: string; label: string; n: number; technique: string; size: string }[] {
  return zonesFor(d.garment)
    .filter((z) => d.placements[z.id])
    .map((z, i) => {
      const p = d.placements[z.id] as Placement;
      return { id: z.id, label: z.label, n: i + 1, technique: techniqueLabel(p.technique), size: p.size.trim() };
    });
}

export function trimsList(d: TechPack): string[] {
  const out: string[] = [];
  if (d.neckLabel) out.push(neckLabelLabel(d));
  if (d.careLabel) out.push("Care label");
  if (d.hangTag) out.push("Hang tag");
  if (d.polybag) out.push("Polybag");
  if (d.customPackaging) out.push("Custom packaging");
  return out;
}

export function fabricLine(d: TechPack): string {
  return [fabricLabel(d), d.composition.trim(), d.gsm ? `${d.gsm} GSM` : ""].filter(Boolean).join(", ");
}

/** The quantities grid is an even split when every colour and size holds the same number (give or take one). */
export function isEvenSplit(d: TechPack): boolean {
  const total = grandTotal(d);
  if (total === 0) return true;
  const even = splitEvenly(total, d.colourways.map((c) => c.id), d.sizes);
  return d.colourways.every((c) => d.sizes.every((s) => qty(d, c.id, s) === Number.parseInt(even[c.id]?.[s] || "0", 10)));
}

/** Writes an even split of `total` into the quantities, replacing what was there. */
export function withEvenSplit(d: TechPack, total: number): TechPack {
  return { ...d, quantities: splitEvenly(total, d.colourways.map((c) => c.id), d.sizes) };
}

/** Keeps the visitor's total steady when colours are added or removed, if they had not set the sizes by hand. */
export function rebalance(prev: TechPack, next: TechPack): TechPack {
  const total = grandTotal(prev);
  return total > 0 && isEvenSplit(prev) ? withEvenSplit(next, total) : next;
}

/* ---------- plain-English read-back ---------- */

const PLURAL: Record<string, string> = {
  tee: "T-shirts",
  hoodie: "hoodies",
  sweatshirt: "sweatshirts",
  jacket: "jackets",
  trousers: "pairs of trousers",
  shorts: "pairs of shorts",
  jersey: "jerseys",
};
const WASH_WORD: Record<string, string> = { acid: "acid-wash", mineral: "mineral-wash", enzyme: "enzyme-wash", distressed: "distressed" };

const listWords = (items: string[]): string =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export const colourNames = (d: TechPack): string[] => d.colourways.map((c, i) => (c.name.trim() || `colour ${i + 1}`).toLowerCase());

/** "You are asking for 300 oversized acid-wash hoodies in washed black." */
export function askSentence(d: TechPack): string {
  const total = grandTotal(d);
  const noun = d.garment === "other" ? d.garmentOther.trim().toLowerCase() || "garments" : (PLURAL[d.garment] ?? "garments");
  const adjectives = [d.fit && d.fit !== "regular" ? fitLabel(d).toLowerCase() : "", WASH_WORD[d.wash] ?? ""].filter(Boolean);
  const what = [...adjectives, noun].join(" ");
  const count = total > 0 ? `${total} ` : "";
  const colours = d.colourways.some((c) => c.name.trim()) || d.colourways.length > 1 ? ` in ${listWords(colourNames(d))}` : "";
  return `You are asking for ${count}${what}${colours}.`;
}

/** The size range as words: "sizes S to XL". */
export function sizeWords(d: TechPack): string {
  if (!d.sizes.length) return "";
  const first = d.sizes[0];
  const last = d.sizes[d.sizes.length - 1];
  const run = d.sizes.length > 2 && allSizes.slice(allSizes.indexOf(first as SizeId), allSizes.indexOf(last as SizeId) + 1).length === d.sizes.length;
  if (d.sizes.length === 1) return `size ${first}`;
  return run ? `sizes ${first} to ${last}` : `sizes ${listWords([...d.sizes])}`;
}

export function fitLine(d: TechPack): string {
  return [fitLabel(d), d.dropShoulder === "yes" ? "drop shoulder" : d.dropShoulder === "no" ? "set-in shoulder" : ""]
    .filter(Boolean)
    .join(", ");
}

/* ---------- validation ---------- */

export type ErrorKey = "garment" | "garmentOther" | "quantities" | "name" | "email" | "whatsapp" | "deadline";
export type Errors = Partial<Record<ErrorKey, string>>;

/** Which step each error belongs to, so the summary can link back to it. */
export const errorStep: Record<ErrorKey, StepId> = {
  garment: "garment",
  garmentOther: "garment",
  quantities: "sizes",
  deadline: "labels",
  name: "review",
  email: "review",
  whatsapp: "review",
};

export const errorField: Record<ErrorKey, string> = {
  garment: "tp-garment-tee",
  garmentOther: "tp-garment-other",
  quantities: "tp-qty-total",
  deadline: "tp-deadline",
  name: "tp-name",
  email: "tp-email",
  whatsapp: "tp-whatsapp",
};

export function todayIso(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d{8,15}$/;

/** Name plus at least one valid way to reply: the same rules as the contact page's quote form. */
export function validateContact(v: { name: string; email: string; whatsapp: string }): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Add your name so we know who to reply to.";
  const email = v.email.trim();
  const phone = v.whatsapp.replace(/[\s()-]/g, "");
  if (!email && !phone) {
    e.email = "Enter an email or a WhatsApp number so we can reply.";
    e.whatsapp = "Enter a WhatsApp number or an email so we can reply.";
  }
  if (email && !EMAIL_RE.test(email)) e.email = "Enter a valid email, like name@brand.com.";
  if (phone && !PHONE_RE.test(phone)) e.whatsapp = "Enter a valid number with country code, like +44 7700 900123.";
  return e;
}

export function validateStep(d: TechPack, step: StepId): Errors {
  const e: Errors = {};
  if (step === "garment") {
    if (!d.garment) e.garment = "Pick what we are making, or tap a starting point.";
    else if (d.garment === "other" && d.garmentOther.trim().length < 2) e.garmentOther = "Tell us what the garment is.";
  }
  // Only what we cannot quote without: the garment and a rough quantity. Fit, fabric, colours and the rest can be "not sure".
  if (step === "sizes" && grandTotal(d) === 0) e.quantities = "Type a rough number of pieces. A guess is fine.";
  if (step === "labels" && d.deadline && d.deadline < todayIso()) e.deadline = "Choose a date that has not passed, or leave it empty.";
  return e;
}

/** "print" needs a real garment and quantities; "send" also needs a way to reply. */
export function validateAll(d: TechPack, purpose: "print" | "send"): Errors {
  const e: Errors = {
    ...validateStep(d, "garment"),
    ...validateStep(d, "sizes"),
    ...validateStep(d, "labels"),
  };
  return purpose === "send" ? { ...e, ...validateContact(d) } : e;
}

/* ---------- message for WhatsApp / email ---------- */

export function composeTechPack(d: TechPack): { subject: string; body: string } {
  const lines: string[] = ["Hi Antlertee Creative Studios, here is my tech pack.", ""];
  const add = (label: string, value: string) => {
    if (value.trim()) lines.push(`${label}: ${value.trim()}`);
  };
  const unsure = "not sure, please suggest";
  add("Garment", [garmentLabel(d), d.styleName.trim() ? `"${d.styleName.trim()}"` : ""].filter(Boolean).join(" "));
  add("Fit", [fitLine(d), d.lengthNotes.trim()].filter(Boolean).join("; ") || unsure);
  add("Fabric", fabricLine(d) || unsure);
  if (d.wash !== "none") add("Wash", d.wash === "unsure" ? unsure : washLabel(d));

  const cws = d.colourways.map((c, i) => `${colourwayName(c, i)}: ${[c.hex.toUpperCase(), c.pantone.trim() && `Pantone ${c.pantone.trim()}`].filter(Boolean).join(", ")}`);
  add("Colours", cws.join("; "));

  const placements = activePlacements(d);
  if (placements.length) {
    add("Artwork", placements.map((p) => `${p.label}: ${[p.technique || "technique to be confirmed", p.size].filter(Boolean).join(", ")}`).join("; "));
  }
  add("Artwork notes", d.artworkNotes);

  const total = grandTotal(d);
  lines.push("", `Quantities, ${total} pcs in total:`);
  d.colourways.forEach((c, i) => {
    const t = colourwayTotal(d, c.id);
    if (!t) return;
    const bySize = d.sizes
      .map((s) => [s, qty(d, c.id, s)] as const)
      .filter(([, n]) => n > 0)
      .map(([s, n]) => `${s} ${n}`)
      .join(", ");
    lines.push(`- ${colourwayName(c, i)}: ${bySize} = ${t} pcs`);
  });
  lines.push("");

  add("Labels & packing", [...trimsList(d), d.packagingNotes.trim()].filter(Boolean).join(", "));
  add("Deadline", d.deadline);
  add("Target market", d.market);
  add("Notes", d.notes);
  lines.push("");
  add("Name", d.name);
  add("Brand", d.brand);
  add("Email", d.email);
  add("WhatsApp", d.whatsapp);

  const brand = d.brand.trim();
  const subject = `Tech pack${brand ? `: ${brand}` : ""}, ${garmentLabel(d) || "garment"}, ${total} pcs`;
  return { subject, body: lines.join("\n") };
}
