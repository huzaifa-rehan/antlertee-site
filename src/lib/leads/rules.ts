// Lead and upload rules shared by the browser (instant feedback) and the server (the real check).
// Pure and dependency-free on purpose: `npm test` imports this file directly with Node's type stripping,
// so keep it to erasable TypeScript (no enums, no namespaces) and no imports.

/* ---------- files ---------- */

export const MAX_FILES = 8;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 60 * 1024 * 1024;

/**
 * Allowed customer file types: extension -> accepted MIME types. The first MIME is the canonical one we store.
 * No SVG (can carry script), no archives, no executables.
 */
export const FILE_TYPES: Readonly<Record<string, readonly string[]>> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  heic: ["image/heic", "image/heif"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel"],
  csv: ["text/csv", "application/vnd.ms-excel", "text/plain"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ai: ["application/postscript", "application/illustrator", "application/pdf"],
  psd: ["image/vnd.adobe.photoshop", "application/x-photoshop", "image/x-photoshop", "application/photoshop", "application/psd"],
  eps: ["application/postscript", "application/eps", "application/x-eps", "image/x-eps"],
};

/** Browsers often report design files with no MIME type (or a generic one); for these the extension decides. */
const GENERIC_MIME_OK = new Set(["ai", "psd", "eps", "heic", "csv"]);
const GENERIC_MIMES = new Set(["", "application/octet-stream"]);

export const ACCEPT_ATTR = Object.keys(FILE_TYPES)
  .map((e) => `.${e}`)
  .join(",");
export const ALLOWED_LABEL = "PDF, PNG, JPG, WEBP, HEIC, Excel, CSV, Word, AI, PSD or EPS";

/** Every canonical + alternative MIME we accept (used for the Vercel Blob upload token). */
export const ALLOWED_MIMES: readonly string[] = [...new Set(Object.values(FILE_TYPES).flat())];

export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}

export type FileCheck = { ok: true; ext: string; mime: string } | { ok: false; error: string };

/** Checks one file's name, browser MIME and size. Returns the canonical MIME to store on success. */
export function checkFile(name: string, mime: string, size: number): FileCheck {
  const ext = extensionOf(name);
  const allowed = FILE_TYPES[ext];
  if (!allowed) return { ok: false, error: `“${shortName(name)}” is not a file type we accept. Use ${ALLOWED_LABEL}.` };
  const m = mime.trim().toLowerCase();
  const mimeOk = allowed.includes(m) || (GENERIC_MIME_OK.has(ext) && GENERIC_MIMES.has(m));
  if (!mimeOk) return { ok: false, error: `“${shortName(name)}” does not look like a real .${ext} file.` };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: `“${shortName(name)}” is empty.` };
  if (size > MAX_FILE_BYTES) {
    return { ok: false, error: `“${shortName(name)}” is too large (${formatBytes(size)}). Each file can be up to ${formatBytes(MAX_FILE_BYTES)}.` };
  }
  return { ok: true, ext, mime: allowed[0] as string };
}

function shortName(name: string): string {
  const n = name.split(/[\\/]/).pop() ?? name;
  return n.length > 40 ? `${n.slice(0, 28)}…${n.slice(-8)}` : n;
}

/** Checks a whole selection: count and total size. */
export function checkSelection(files: readonly { size: number }[]): string | null {
  if (files.length > MAX_FILES) return `You can send up to ${MAX_FILES} files. Remove ${files.length - MAX_FILES}.`;
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > MAX_TOTAL_BYTES) return `These files add up to ${formatBytes(total)}. The limit is ${formatBytes(MAX_TOTAL_BYTES)} in total.`;
  return null;
}

/**
 * Makes a safe storage file name: no path, no control or special characters, ASCII only, at most 80 characters,
 * extension kept. Never used for display (the original name is stored separately, escaped on output).
 */
export function sanitizeFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const ext = extensionOf(base).replace(/[^a-z0-9]/g, "").slice(0, 8);
  const stem = (ext ? base.slice(0, base.length - ext.length - 1) : base)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/[.]+/g, ".")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 70)
    .replace(/[-.]+$/g, "");
  const safeStem = stem || "file";
  return ext ? `${safeStem}.${ext}` : safeStem;
}

/* ---------- storage keys ---------- */

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const SAFE_NAME = "[A-Za-z0-9][A-Za-z0-9._-]{0,119}";
const LEAD_KEY_RE = new RegExp(`^leads/incoming/${UUID}/${SAFE_NAME}$`);
const MEDIA_INCOMING_RE = new RegExp(`^media/incoming/${UUID}/${SAFE_NAME}$`);
const MEDIA_LIBRARY_RE = new RegExp(`^media/library/${UUID}/${SAFE_NAME}$`);

/** A customer upload must live under our lead prefix, in a per-upload random folder, with a sanitised name. */
export function isLeadFileKey(key: unknown): key is string {
  return typeof key === "string" && key.length <= 200 && !key.includes("..") && LEAD_KEY_RE.test(key);
}

/** Admin uploads: originals waiting to be processed, or library items. */
export function isMediaUploadKey(key: unknown, area: "incoming" | "library"): key is string {
  if (typeof key !== "string" || key.length > 200 || key.includes("..")) return false;
  return area === "incoming" ? MEDIA_INCOMING_RE.test(key) : MEDIA_LIBRARY_RE.test(key);
}

/**
 * A client-upload pathname before Vercel Blob adds its random suffix: `<prefix>/<uuid>/<sanitised name>`.
 * The suffix keeps the name inside SAFE_NAME, so the final key passes the same checks.
 */
export function isUploadPathname(pathname: string, prefix: "leads/incoming" | "media/incoming" | "media/library"): boolean {
  if (pathname.length > 200 || pathname.includes("..")) return false;
  return new RegExp(`^${prefix}/${UUID}/${SAFE_NAME}$`).test(pathname);
}

/* ---------- lead payload ---------- */

export type LeadKind = "quote" | "techpack";

export interface LeadFileRef {
  key: string;
  name: string;
  size: number;
  mime: string;
}

export interface LeadInput {
  kind: LeadKind;
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  brand: string;
  message: string;
  /** Extra form fields (product, quantity, deadline...), flat strings only. */
  fields: Record<string, string>;
  /** The tech pack builder state, untrusted: the server re-sanitises it with the builder's own sanitiser. */
  techPack: unknown;
  sourcePath: string;
  files: LeadFileRef[];
}

export type LeadValidation = { ok: true; value: LeadInput } | { ok: false; errors: Record<string, string> };

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?\d{8,15}$/;
const MAX_TECHPACK_JSON = 40_000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Trims, removes control characters (keeps newlines and tabs) and caps length. Non-strings become "". */
export function cleanText(v: unknown, max: number, multiline = false): string {
  if (typeof v !== "string") return "";
  const stripped = multiline ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "") : v.replace(/[\u0000-\u001f\u007f]/g, " ");
  return stripped.replace(/\r\n?/g, "\n").trim().slice(0, max);
}

/** Validates the JSON body of POST /api/leads. Everything is untrusted. */
export function validateLead(raw: unknown): LeadValidation {
  const errors: Record<string, string> = {};
  if (!isRecord(raw)) return { ok: false, errors: { form: "Invalid request." } };

  // Honeypot: a hidden field real visitors never fill in.
  if (typeof raw.website === "string" && raw.website.trim() !== "") return { ok: false, errors: { form: "Invalid request." } };

  const kind = raw.kind === "quote" || raw.kind === "techpack" ? raw.kind : null;
  if (!kind) errors.kind = "Unknown form.";

  const tooLong = (field: string, v: unknown, max: number) => {
    if (typeof v === "string" && v.trim().length > max) errors[field] = `Keep this under ${max} characters.`;
  };
  tooLong("name", raw.name, 120);
  tooLong("email", raw.email, 200);
  tooLong("whatsapp", raw.whatsapp, 40);
  tooLong("country", raw.country, 80);
  tooLong("brand", raw.brand, 120);
  tooLong("message", raw.message, 5000);

  const name = cleanText(raw.name, 120);
  const email = cleanText(raw.email, 200);
  const whatsapp = cleanText(raw.whatsapp, 40);
  const phone = whatsapp.replace(/[\s()-]/g, "");
  const message = cleanText(raw.message, 5000, true);

  if (name.length < 2) errors.name = "Enter your name.";
  if (!email && !phone) {
    errors.email = "Enter an email or a WhatsApp number so we can reply.";
    errors.whatsapp = "Enter a WhatsApp number or an email so we can reply.";
  }
  if (email && !EMAIL_RE.test(email)) errors.email = "Enter a valid email, like name@brand.com.";
  if (phone && !PHONE_RE.test(phone)) errors.whatsapp = "Enter a valid number with country code, like +44 7700 900123.";
  if (kind === "quote" && message.length < 10) errors.message = "Tell us a little about the order (at least 10 characters).";

  const fields: Record<string, string> = {};
  if (raw.fields !== undefined) {
    if (!isRecord(raw.fields) || Object.keys(raw.fields).length > 20) errors.fields = "Invalid form fields.";
    else {
      for (const [k, v] of Object.entries(raw.fields)) {
        if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(k) || typeof v !== "string" || v.length > 1000) {
          errors.fields = "Invalid form fields.";
          break;
        }
        const clean = cleanText(v, 1000, true);
        if (clean) fields[k] = clean;
      }
    }
  }
  if (fields.quantity !== undefined) {
    const q = Number(fields.quantity);
    if (!Number.isInteger(q) || q < 1 || q > 1_000_000) errors.quantity = "Enter a whole number of pieces.";
  }
  if (fields.deadline !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(fields.deadline)) errors.deadline = "Enter a valid date.";

  let techPack: unknown = null;
  if (raw.techPack !== undefined && raw.techPack !== null) {
    if (!isRecord(raw.techPack)) errors.techPack = "Invalid tech pack.";
    else if (JSON.stringify(raw.techPack).length > MAX_TECHPACK_JSON) errors.techPack = "The tech pack is too large.";
    else techPack = raw.techPack;
  }

  const sourcePath = typeof raw.sourcePath === "string" && /^\/[A-Za-z0-9/_.#?=&-]{0,199}$/.test(raw.sourcePath) ? raw.sourcePath : "";

  const files: LeadFileRef[] = [];
  if (raw.files !== undefined) {
    if (!Array.isArray(raw.files)) errors.files = "Invalid file list.";
    else if (raw.files.length > MAX_FILES) errors.files = `You can send up to ${MAX_FILES} files.`;
    else {
      const seen = new Set<string>();
      for (const f of raw.files) {
        if (!isRecord(f) || !isLeadFileKey(f.key) || typeof f.name !== "string" || typeof f.size !== "number" || typeof f.mime !== "string") {
          errors.files = "One of the files is invalid. Please add it again.";
          break;
        }
        if (seen.has(f.key)) {
          errors.files = "The same file was added twice.";
          break;
        }
        seen.add(f.key);
        const check = checkFile(f.name, f.mime, f.size);
        if (!check.ok) {
          errors.files = check.error;
          break;
        }
        files.push({ key: f.key, name: cleanText(f.name, 200) || "file", size: f.size, mime: check.mime });
      }
      const selectionError = errors.files ? null : checkSelection(files);
      if (selectionError) errors.files = selectionError;
    }
  }

  if (Object.keys(errors).length > 0 || !kind) return { ok: false, errors };
  return {
    ok: true,
    value: {
      kind,
      name,
      email,
      whatsapp,
      country: cleanText(raw.country, 80),
      brand: cleanText(raw.brand, 120),
      message,
      fields,
      techPack,
      sourcePath,
      files,
    },
  };
}

/* ---------- status ---------- */

export const LEAD_STATUSES = ["new", "read", "done", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const isLeadStatus = (v: unknown): v is LeadStatus => typeof v === "string" && (LEAD_STATUSES as readonly string[]).includes(v);

/** Short human reference shown to the customer and in the inbox, e.g. "ACS-3F9A21". */
export function leadReference(id: string): string {
  return `ACS-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
