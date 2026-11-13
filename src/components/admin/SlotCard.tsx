"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { extensionOf } from "@/lib/leads/rules";
import { UploadError, uploadFile } from "@/lib/uploads/client";
import { adminRequest } from "./api";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const MAX = 20 * 1024 * 1024;

interface SlotCardProps {
  csrf: string;
  id: string;
  aspect: string;
  manifestAlt: string;
  customAlt: string | null;
  src: string;
  width: number;
  height: number;
  replaced: boolean;
  hasOverride: boolean;
  usedIn: string[];
}

/** One image slot: preview, where it is used, Replace / Edit alt / Reset. */
export function SlotCard(p: SlotCardProps) {
  const router = useRouter();
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const replace = async (file: File) => {
    const mime = TYPES[extensionOf(file.name)];
    if (!mime || (file.type && file.type !== mime)) {
      setMsg({ tone: "error", text: "Use a JPG, PNG or WebP image." });
      return;
    }
    if (file.size > MAX) {
      setMsg({ tone: "error", text: "That image is over 20 MB. Use a smaller one." });
      return;
    }
    setMsg(null);
    setBusy("Uploading…");
    setProgress(0);
    try {
      const ref = await uploadFile(file, { kind: "media", area: "incoming", csrf: p.csrf, mime }, setProgress);
      setBusy("Optimising…");
      const r = await adminRequest(`/api/admin/media/slots/${p.id}/`, { method: "POST", csrf: p.csrf, body: { key: ref.key } });
      if (!r.ok) throw new UploadError(r.error);
      setMsg({ tone: "ok", text: "Replaced. The site is updated." });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof UploadError ? err.message : "The upload failed. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const saveAlt = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const alt = String(new FormData(e.currentTarget).get("alt") ?? "");
    setBusy("Saving…");
    const r = await adminRequest(`/api/admin/media/slots/${p.id}/`, { method: "PATCH", csrf: p.csrf, body: { alt } });
    setBusy(null);
    setMsg(r.ok ? { tone: "ok", text: alt.trim() ? "Alt text saved." : "Alt text back to the original." } : { tone: "error", text: r.error });
    if (r.ok) router.refresh();
  };

  const reset = async () => {
    if (!window.confirm(`Put the original image and alt text back for “${p.id}”?`)) return;
    setBusy("Resetting…");
    const r = await adminRequest(`/api/admin/media/slots/${p.id}/`, { method: "DELETE", csrf: p.csrf });
    setBusy(null);
    setMsg(r.ok ? { tone: "ok", text: "Back to the original." } : { tone: "error", text: r.error });
    if (r.ok) router.refresh();
  };

  return (
    <article className="adm-slot" data-replaced={p.replaced || undefined} aria-labelledby={`${uid}-id`}>
      <div className="adm-thumb" style={{ aspectRatio: p.aspect.replace(":", " / ") }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of pre-optimised files */}
        <img src={p.src} alt={p.customAlt ?? p.manifestAlt} width={p.width} height={p.height} loading="lazy" decoding="async" />
      </div>
      <div>
        <p className="adm-slot-id" id={`${uid}-id`}>
          {p.id} {p.replaced && <span className="adm-tag">Replaced</span>}
        </p>
        <p className="adm-slot-alt">{p.customAlt ?? p.manifestAlt}</p>
        <p className="adm-sub" style={{ fontSize: 12 }}>
          Shape {p.aspect}
          {p.customAlt !== null && " · custom alt text"}
        </p>
      </div>
      {p.usedIn.length > 0 && (
        <ul className="adm-used" aria-label="Used on">
          {p.usedIn.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      )}
      {busy === "Uploading…" && (
        <div className="adm-progress" role="progressbar" aria-label={`Upload progress for ${p.id}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <i style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      )}
      <div className="adm-actions">
        <button type="button" className="pill inked" onClick={() => inputRef.current?.click()} disabled={busy !== null}>
          Replace<span className="sr-only"> {p.id}</span>
        </button>
        {p.hasOverride && (
          <button type="button" className="pill" onClick={() => void reset()} disabled={busy !== null}>
            Reset<span className="sr-only"> {p.id}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (f) void replace(f);
          }}
        />
      </div>
      <details>
        <summary>Edit alt text</summary>
        <form className="adm-form-row" onSubmit={(e) => void saveAlt(e)}>
          <label htmlFor={`${uid}-alt`} className="sr-only">
            Alt text for {p.id}
          </label>
          <textarea id={`${uid}-alt`} name="alt" className="input sm" rows={3} maxLength={300} defaultValue={p.customAlt ?? ""} placeholder={p.manifestAlt} />
          <p className="adm-sub" style={{ fontSize: 12 }}>
            Describe the photo for people who cannot see it. Leave empty to use the original text.
          </p>
          <button type="submit" className="pill" disabled={busy !== null}>
            Save alt text
          </button>
        </form>
      </details>
      <p className="adm-msg" data-tone={msg?.tone} role="status" aria-live="polite">
        {busy ?? msg?.text}
      </p>
    </article>
  );
}
