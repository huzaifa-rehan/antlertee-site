// Upload plumbing shared by the public (lead files) and admin (media) upload routes.
import { randomUUID } from "node:crypto";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { NextRequest } from "next/server";
import { extensionOf, sanitizeFilename } from "@/lib/leads/rules";
import { jsonError, json } from "./http";
import { localPutStream, type Area } from "./storage";

export type UploadPrefix = "leads/incoming" | "media/incoming" | "media/library";

export interface UploadPolicy {
  /** MIME types accepted for this file (by extension), or null to refuse. */
  typesFor: (ext: string) => readonly string[] | null;
  /** Max bytes for this extension. */
  maxBytesFor: (ext: string) => number;
}

const isHandleUploadBody = (v: unknown): v is HandleUploadBody =>
  typeof v === "object" && v !== null && (v as { type?: unknown }).type === "blob.generate-client-token";

/**
 * Vercel Blob client-upload handshake. Only issues tokens (we register no completion callback); the token is
 * locked to the requested pathname, which must sit under `prefix`, with the allowed types and size.
 * `beforeIssue` runs extra checks (rate limits) and may throw to refuse.
 */
export async function blobTokenResponse(
  req: NextRequest,
  token: string,
  prefix: UploadPrefix,
  policy: UploadPolicy,
  validPathname: (pathname: string) => boolean,
  beforeIssue: () => Promise<void>,
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid request.");
  }
  if (!isHandleUploadBody(body)) return jsonError(400, "Invalid request.");
  try {
    const result = await handleUpload({
      body,
      request: req,
      token,
      onBeforeGenerateToken: async (pathname) => {
        const ext = extensionOf(pathname);
        const types = policy.typesFor(ext);
        if (!pathname.startsWith(`${prefix}/`) || !validPathname(pathname) || !types) throw new UploadRefused("That file type is not accepted.");
        await beforeIssue();
        return {
          allowedContentTypes: [...types],
          maximumSizeInBytes: policy.maxBytesFor(ext),
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return json(result);
  } catch (err) {
    if (err instanceof UploadRefused) return jsonError(err.status, err.message);
    console.error(`[upload-token] failed: ${err instanceof Error ? err.name : "unknown error"}`);
    return jsonError(400, "The upload could not start. Please try again.");
  }
}

export class UploadRefused extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

/**
 * Local-development upload (no Vercel Blob): multipart form with one `file`, streamed to .data/uploads with the
 * size cap enforced while writing. Returns the stored key.
 */
export async function localUpload(
  req: NextRequest,
  area: Area,
  prefix: UploadPrefix,
  check: (name: string, mime: string, size: number) => { ok: true; mime: string } | { ok: false; error: string },
  maxBytes: number,
) {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes + 64 * 1024) return jsonError(413, "That file is too large.");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "Invalid upload.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "No file was sent.");
  const verdict = check(file.name, file.type, file.size);
  if (!verdict.ok) return jsonError(400, verdict.error);
  const key = `${prefix}/${randomUUID()}/${sanitizeFilename(file.name)}`;
  try {
    const size = await localPutStream(area, key, file.stream(), maxBytes);
    return json({ key, name: file.name.slice(0, 200), size, mime: verdict.mime }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === "too-large") return jsonError(413, "That file is too large.");
    throw err;
  }
}
