// WhatsApp hand-off: after a visitor fills in a form, a chat with Antlertee opens with the message already typed.
// This uses a plain https://wa.me link (free, no WhatsApp Business API). The visitor only has to press send.
// A link cannot attach files, so any files are uploaded to our inbox first and the message names them and quotes
// the reference. If saving fails for any reason the chat still opens: the visitor is never blocked.
import type { UploadedRef } from "../uploads/client";

export interface HandoffInfo {
  /** Reference of the lead saved in the admin inbox, if saving worked. */
  reference?: string;
  /** Names of the files that were uploaded and saved with the lead. */
  uploaded?: string[];
  /** The visitor picked files that could not be saved, so they should attach them in the chat. */
  attachLater?: boolean;
}

/** Longest wa.me link (after encoding) that is safe to open on every phone and browser. */
const MAX_ENCODED = 3000;

const encodedLength = (s: string) => encodeURIComponent(s).length;

/** Adds the reference and file lines to a drafted message and keeps the whole thing within a safe link length. */
export function whatsappMessage(body: string, info: HandoffInfo = {}): string {
  const tail: string[] = [];
  if (info.reference) tail.push(`Reference: ${info.reference}`);
  if (info.uploaded?.length) tail.push(`Files saved with this request: ${info.uploaded.join(", ")}`);
  if (info.attachLater) tail.push("I will attach my files in this chat.");
  const footer = tail.length ? `\n\n${tail.join("\n")}` : "";

  let head = body.trim();
  if (encodedLength(head + footer) <= MAX_ENCODED) return head + footer;

  // Too long for a link: keep the start and point to the full copy (in the inbox if it was saved).
  const note = info.reference ? `\n(...full details are saved under the reference below.)` : `\n(...more details on request.)`;
  while (head.length > 200 && encodedLength(head + note + footer) > MAX_ENCODED) head = head.slice(0, Math.floor(head.length * 0.9));
  return head.trimEnd() + note + footer;
}

/**
 * Opens an empty tab. Call it synchronously inside the click handler, before any await, so the browser treats it as
 * the visitor's own action; it is pointed at WhatsApp once the request has been saved. Returns null if blocked.
 */
export function openHandoffTab(): Window | null {
  try {
    const tab = window.open("", "_blank");
    if (tab) tab.document.title = "Opening WhatsApp…";
    return tab;
  } catch {
    return null;
  }
}

/** Sends the pre-opened tab to WhatsApp. Returns false if there is no tab, so the page can offer a link instead. */
export function goToWhatsApp(tab: Window | null, href: string): boolean {
  if (!tab || tab.closed) return false;
  try {
    tab.opener = null;
    tab.location.href = href;
    return true;
  } catch {
    return false;
  }
}

/**
 * Uploads files and saves the lead, never throwing: whatever worked is reported so the message can say so.
 * `save` receives the uploaded file references and returns the lead reference.
 */
export async function saveForHandoff(opts: {
  pickedCount: number;
  upload: () => Promise<UploadedRef[]>;
  save: (files: UploadedRef[]) => Promise<{ reference: string }>;
}): Promise<HandoffInfo> {
  let refs: UploadedRef[] = [];
  try {
    refs = await opts.upload();
  } catch {
    refs = [];
  }
  let reference: string | undefined;
  try {
    reference = (await opts.save(refs)).reference;
  } catch {
    reference = undefined;
  }
  // Files only count as saved when the lead that holds them was saved too.
  const uploaded = reference ? refs.map((r) => r.name) : [];
  return { reference, uploaded, attachLater: opts.pickedCount > uploaded.length };
}
