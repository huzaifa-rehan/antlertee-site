// Browser helper: POST /api/leads and turn the reply into a success or a plain-language error.
import type { UploadedRef } from "@/lib/uploads/client";

export interface LeadRequest {
  kind: "quote" | "techpack";
  name: string;
  email: string;
  whatsapp: string;
  brand: string;
  message: string;
  country?: string;
  fields?: Record<string, string>;
  techPack?: unknown;
  files: UploadedRef[];
  /** Honeypot: always "" from real visitors. */
  website: string;
}

export class LeadSubmitError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function submitLead(req: LeadRequest): Promise<{ id: string; reference: string }> {
  let res: Response;
  try {
    res = await fetch("/api/leads/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, sourcePath: window.location.pathname }),
    });
  } catch {
    throw new LeadSubmitError("Could not reach the server. Check your connection and try again.");
  }
  const data: unknown = await res.json().catch(() => null);
  const d = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  if (res.ok && typeof d.id === "string" && typeof d.reference === "string") return { id: d.id, reference: d.reference };
  const errors = typeof d.errors === "object" && d.errors !== null ? (d.errors as Record<string, string>) : {};
  const firstField = Object.values(errors).find((v) => typeof v === "string");
  const message = typeof d.error === "string" ? d.error : "Something went wrong. Please try again.";
  throw new LeadSubmitError(firstField && res.status === 400 ? `${message} ${firstField}` : message, errors);
}
