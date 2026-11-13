"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { extensionOf, formatBytes } from "@/lib/leads/rules";
import { UploadError, uploadFile } from "@/lib/uploads/client";
import { adminRequest } from "./api";

interface Item {
  id: string;
  url: string;
  name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  kind: "image" | "video";
  alt: string;
  createdAt: string;
}

const TYPES: Record<string, { mime: string; max: number }> = {
  jpg: { mime: "image/jpeg", max: 15 * 1024 * 1024 },
  jpeg: { mime: "image/jpeg", max: 15 * 1024 * 1024 },
  png: { mime: "image/png", max: 15 * 1024 * 1024 },
  webp: { mime: "image/webp", max: 15 * 1024 * 1024 },
  avif: { mime: "image/avif", max: 15 * 1024 * 1024 },
  mp4: { mime: "video/mp4", max: 100 * 1024 * 1024 },
  webm: { mime: "video/webm", max: 100 * 1024 * 1024 },
};

/** Upload form + list of library items (preview, name/alt edit, copy link, delete). */
export function LibraryManager({ csrf, items }: { csrf: string; items: Item[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const onUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMsg({ tone: "error", text: "Choose a photo or video first." });
      return;
    }
    const type = TYPES[extensionOf(file.name)];
    if (!type || (file.type && file.type !== type.mime)) {
      setMsg({ tone: "error", text: "Use JPG, PNG, WebP or AVIF photos, or MP4 / WebM videos." });
      return;
    }
    if (file.size > type.max) {
      setMsg({ tone: "error", text: `That file is ${formatBytes(file.size)}; the limit is ${formatBytes(type.max)}.` });
      return;
    }
    setBusy(true);
    setMsg(null);
    setProgress(0);
    try {
      const ref = await uploadFile(file, { kind: "media", area: "library", csrf, mime: type.mime }, setProgress);
      setProgress(null);
      const r = await adminRequest("/api/admin/media/library/", {
        method: "POST",
        csrf,
        body: { key: ref.key, name: String(fd.get("name") ?? ""), alt: String(fd.get("alt") ?? "") },
      });
      if (!r.ok) throw new UploadError(r.error);
      form.reset();
      setMsg({ tone: "ok", text: `Added ${file.name}.` });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof UploadError ? err.message : "The upload failed. Please try again." });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <>
      <section className="adm-card" aria-labelledby="lib-up" style={{ margin: "20px 0" }}>
        <h2 className="adm-h2" id="lib-up">
          Add a photo or video
        </h2>
        <form className="adm-upload" onSubmit={(e) => void onUpload(e)}>
          <div className="field">
            <label htmlFor="lib-file">File</label>
            <input ref={fileRef} id="lib-file" name="file" type="file" className="input sm" accept=".jpg,.jpeg,.png,.webp,.avif,.mp4,.webm" aria-describedby="lib-file-hint" />
            <p className="hint" id="lib-file-hint">
              Photos: JPG, PNG, WebP or AVIF up to 15 MB. Videos: MP4 or WebM up to 100 MB.
            </p>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="lib-name">
                Name <span className="opt">Optional</span>
              </label>
              <input id="lib-name" name="name" type="text" className="input sm" maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="lib-alt">
                Description (alt text) <span className="opt">Optional</span>
              </label>
              <input id="lib-alt" name="alt" type="text" className="input sm" maxLength={300} />
            </div>
          </div>
          {progress !== null && (
            <div className="adm-progress" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <i style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
          )}
          <div className="adm-actions">
            <button type="submit" className="pill inked" disabled={busy}>
              {busy ? (progress !== null ? `Uploading ${progress}%…` : "Saving…") : "Upload"}
            </button>
          </div>
          <p className="adm-msg" data-tone={msg?.tone} role="status" aria-live="polite">
            {msg?.text}
          </p>
        </form>
      </section>

      {items.length === 0 ? (
        <p className="adm-empty">The library is empty. Uploaded photos and videos appear here.</p>
      ) : (
        <ul className="adm-grid">
          {items.map((item) => (
            <li key={item.id}>
              <LibraryCard item={item} csrf={csrf} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function LibraryCard({ item, csrf }: { item: Item; csrf: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const absolute = () => new URL(item.url, window.location.origin).toString();

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const r = await adminRequest(`/api/admin/media/library/${item.id}/`, {
      method: "PATCH",
      csrf,
      body: { name: String(fd.get("name") ?? ""), alt: String(fd.get("alt") ?? "") },
    });
    setBusy(false);
    setMsg(r.ok ? { tone: "ok", text: "Saved." } : { tone: "error", text: r.error });
    if (r.ok) router.refresh();
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${item.name}” from the library? Anything linking to it will break.`)) return;
    setBusy(true);
    const r = await adminRequest(`/api/admin/media/library/${item.id}/`, { method: "DELETE", csrf });
    setBusy(false);
    if (!r.ok) setMsg({ tone: "error", text: r.error });
    else router.refresh();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absolute());
      setMsg({ tone: "ok", text: "Link copied." });
    } catch {
      setMsg({ tone: "error", text: `Could not copy. The link is: ${absolute()}` });
    }
  };

  return (
    <article className="adm-slot" aria-label={item.name}>
      <div className="adm-thumb">
        {item.kind === "video" ? (
          <video src={item.url} controls preload="metadata" muted playsInline aria-label={item.alt || item.name} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview
          <img src={item.url} alt={item.alt} width={item.width ?? undefined} height={item.height ?? undefined} loading="lazy" />
        )}
      </div>
      <p className="adm-sub" style={{ fontSize: 12 }}>
        {item.kind === "video" ? "Video" : "Photo"} · {formatBytes(item.size)}
        {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
      </p>
      <form className="adm-form-row" onSubmit={(e) => void save(e)}>
        <label htmlFor={`n-${item.id}`} className="sr-only">
          Name
        </label>
        <input id={`n-${item.id}`} name="name" className="input sm" defaultValue={item.name} maxLength={120} />
        <label htmlFor={`a-${item.id}`} className="sr-only">
          Description (alt text)
        </label>
        <input id={`a-${item.id}`} name="alt" className="input sm" defaultValue={item.alt} maxLength={300} placeholder="Description (alt text)" />
        <div className="adm-actions">
          <button type="submit" className="pill" disabled={busy}>
            Save
          </button>
          <button type="button" className="pill" onClick={() => void copy()}>
            Copy link
          </button>
          <button type="button" className="pill danger" onClick={() => void remove()} disabled={busy}>
            Delete
          </button>
        </div>
      </form>
      <p className="adm-msg" data-tone={msg?.tone} role="status" aria-live="polite">
        {msg?.text}
      </p>
    </article>
  );
}
