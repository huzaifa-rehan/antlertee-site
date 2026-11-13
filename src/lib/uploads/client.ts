// Browser-side uploads. Production: straight to Vercel Blob with a short-lived token from our server (so large
// files never pass through a serverless function). Development without Blob: multipart to our own route.
import { FILE_TYPES, extensionOf, sanitizeFilename } from "@/lib/leads/rules";

export type UploadMode = "blob" | "local";

export interface UploadedRef {
  key: string;
  name: string;
  size: number;
  mime: string;
}

export type UploadTarget = { kind: "lead" } | { kind: "media"; area: "incoming" | "library"; csrf: string; mime: string };

export class UploadError extends Error {}

let modePromise: Promise<UploadMode> | null = null;

export function getUploadMode(): Promise<UploadMode> {
  modePromise ??= fetch("/api/uploads/config/", { cache: "no-store" })
    .then(async (r) => {
      const data: unknown = await r.json().catch(() => null);
      const mode = typeof data === "object" && data !== null ? (data as { mode?: unknown }).mode : undefined;
      if (!r.ok || (mode !== "blob" && mode !== "local")) throw new UploadError("Uploads are not available right now.");
      return mode;
    })
    .catch((err: unknown) => {
      modePromise = null;
      throw err instanceof UploadError ? err : new UploadError("Could not reach the server. Check your connection and try again.");
    });
  return modePromise;
}

function errorMessage(data: unknown, fallback: string): string {
  return typeof data === "object" && data !== null && typeof (data as { error?: unknown }).error === "string" ? (data as { error: string }).error : fallback;
}

function localUpload(url: string, file: File, headers: Record<string, string>, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<UploadedRef> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON error page.
      }
      if (xhr.status >= 200 && xhr.status < 300 && typeof data === "object" && data !== null) {
        const d = data as Record<string, unknown>;
        if (typeof d.key === "string" && typeof d.size === "number" && typeof d.mime === "string") {
          resolve({ key: d.key, name: file.name, size: d.size, mime: d.mime });
          return;
        }
      }
      reject(new UploadError(errorMessage(data, "The upload failed. Please try again.")));
    };
    xhr.onerror = () => reject(new UploadError("The upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new UploadError("The upload was cancelled."));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

/** Uploads one file and returns the stored reference. Progress is reported as 0-100. */
export async function uploadFile(file: File, target: UploadTarget, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<UploadedRef> {
  const mode = await getUploadMode();
  const ext = extensionOf(file.name);
  const mime = target.kind === "lead" ? (FILE_TYPES[ext]?.[0] ?? "") : target.mime;
  if (mode === "local") {
    const url = target.kind === "lead" ? "/api/uploads/local/" : `/api/admin/uploads/local/?area=${target.area}`;
    return localUpload(url, file, target.kind === "media" ? { "x-csrf-token": target.csrf } : {}, onProgress, signal);
  }
  const { upload } = await import("@vercel/blob/client");
  const prefix = target.kind === "lead" ? "leads/incoming" : `media/${target.area}`;
  const pathname = `${prefix}/${crypto.randomUUID()}/${sanitizeFilename(file.name)}`;
  try {
    const result = await upload(pathname, file, {
      access: target.kind === "lead" ? "private" : "public",
      handleUploadUrl: target.kind === "lead" ? "/api/uploads/token/" : `/api/admin/uploads/token/?area=${target.area}`,
      headers: target.kind === "media" ? { "x-csrf-token": target.csrf } : undefined,
      contentType: mime,
      multipart: file.size > 8 * 1024 * 1024,
      onUploadProgress: (e) => onProgress(Math.round(e.percentage)),
      abortSignal: signal,
    });
    return { key: result.pathname, name: file.name, size: file.size, mime };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/too many/i.test(msg)) throw new UploadError("Too many uploads from this connection. Please wait a while.");
    if (/content type|file type/i.test(msg)) throw new UploadError(`“${file.name}” is not a file type we accept.`);
    if (/too large|maximum size/i.test(msg)) throw new UploadError(`“${file.name}” is too large.`);
    throw new UploadError("The upload failed. Check your connection and try again.");
  }
}
