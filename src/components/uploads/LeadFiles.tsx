"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { ACCEPT_ATTR, ALLOWED_LABEL, MAX_FILE_BYTES, MAX_FILES, checkFile, checkSelection, formatBytes } from "@/lib/leads/rules";
import { UploadError, uploadFile, type UploadedRef } from "@/lib/uploads/client";
import "./uploads.css";

export interface PickedFile {
  id: string;
  file: File;
  progress: number;
  status: "waiting" | "uploading" | "done" | "error";
  error?: string;
  ref?: UploadedRef;
}

let seq = 0;

/** Files picked for a lead: validation on add, sequential upload with progress, retry-safe (done files are skipped). */
export function useLeadFiles() {
  const [items, setItems] = useState<PickedFile[]>([]);
  const [notice, setNotice] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const add = useCallback((files: File[]) => {
    const rejected: string[] = [];
    const accepted: PickedFile[] = [];
    const current = itemsRef.current;
    for (const file of files) {
      const verdict = checkFile(file.name, file.type, file.size);
      if (!verdict.ok) {
        rejected.push(verdict.error);
        continue;
      }
      if (current.some((i) => i.file.name === file.name && i.file.size === file.size) || accepted.some((i) => i.file.name === file.name && i.file.size === file.size)) {
        rejected.push(`“${file.name}” is already added.`);
        continue;
      }
      const selection = checkSelection([...current, ...accepted].map((i) => ({ size: i.file.size })).concat({ size: file.size }));
      if (selection) {
        rejected.push(`“${file.name}” was not added. ${selection}`);
        continue;
      }
      accepted.push({ id: `f${++seq}`, file, progress: 0, status: "waiting" });
    }
    if (accepted.length) setItems((prev) => [...prev, ...accepted]);
    setProblems(rejected);
    const added = accepted.length ? `${accepted.length} file${accepted.length > 1 ? "s" : ""} added.` : "";
    setNotice([added, rejected.length ? `${rejected.length} not added, see below.` : ""].filter(Boolean).join(" "));
  }, []);

  const remove = useCallback((id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (item) setNotice(`Removed ${item.file.name}.`);
    setProblems([]);
  }, []);

  const update = (id: string, patch: Partial<PickedFile>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  /** Uploads anything not yet uploaded. Throws UploadError (with a plain message) if a file fails. */
  const uploadAll = useCallback(async (): Promise<UploadedRef[]> => {
    const refs: UploadedRef[] = [];
    for (const item of itemsRef.current) {
      if (item.ref) {
        refs.push(item.ref);
        continue;
      }
      update(item.id, { status: "uploading", progress: 0, error: undefined });
      setNotice(`Uploading ${item.file.name}…`);
      try {
        const ref = await uploadFile(item.file, { kind: "lead" }, (progress) => update(item.id, { progress }));
        update(item.id, { status: "done", progress: 100, ref });
        refs.push(ref);
      } catch (err) {
        const message = err instanceof UploadError ? err.message : "The upload failed. Please try again.";
        update(item.id, { status: "error", error: message });
        setNotice(`${item.file.name} did not upload.`);
        throw new UploadError(`“${item.file.name}” did not upload: ${message}`);
      }
    }
    if (refs.length) setNotice(`${refs.length} file${refs.length > 1 ? "s" : ""} uploaded.`);
    return refs;
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setProblems([]);
    setNotice("");
  }, []);

  return { items, notice, problems, add, remove, uploadAll, reset };
}

interface LeadFileDropProps {
  idPrefix: string;
  label: string;
  hint?: string;
  files: ReturnType<typeof useLeadFiles>;
  disabled?: boolean;
}

/** Drop zone + "Choose files" button + file list with per-file progress and Remove. Keyboard and screen reader friendly. */
export function LeadFileDrop({ idPrefix, label, hint, files, disabled }: LeadFileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    files.add(Array.from(e.dataTransfer.files));
  };

  const hintId = `${idPrefix}-hint`;
  const statusId = `${idPrefix}-status`;
  return (
    <div className="lf" role="group" aria-labelledby={`${idPrefix}-label`}>
      <p className="lf-label" id={`${idPrefix}-label`}>
        {label} <span className="opt">Optional</span>
      </p>
      <p className="hint" id={hintId}>
        {hint ?? `${ALLOWED_LABEL}. Up to ${MAX_FILES} files, ${formatBytes(MAX_FILE_BYTES)} each.`}
      </p>
      <div
        className="lf-drop"
        data-over={over || undefined}
        data-disabled={disabled || undefined}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
        }}
        onDrop={onDrop}
      >
        <span className="lf-drop-icon" aria-hidden="true">
          ↑
        </span>
        <p>
          <strong>Drag files here</strong>
          <span className="lf-or"> or </span>
        </p>
        <button type="button" className="pill" onClick={() => inputRef.current?.click()} disabled={disabled} aria-describedby={hintId}>
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="lf-input"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            files.add(Array.from(e.currentTarget.files ?? []));
            e.currentTarget.value = "";
          }}
        />
      </div>

      <p className="lf-status" id={statusId} aria-live="polite" role="status">
        {files.notice}
      </p>
      {files.problems.length > 0 && (
        <ul className="lf-problems">
          {files.problems.map((p) => (
            <li key={p} className="error">
              <span aria-hidden="true">!</span> {p}
            </li>
          ))}
        </ul>
      )}

      {files.items.length > 0 && (
        <ul className="lf-list" aria-label="Files to send">
          {files.items.map((item) => (
            <li key={item.id} className="lf-item" data-status={item.status}>
              <div className="lf-item-main">
                <span className="lf-name">{item.file.name}</span>
                <span className="lf-meta">
                  {formatBytes(item.file.size)}
                  {item.status === "uploading" && ` · uploading ${item.progress}%`}
                  {item.status === "done" && " · uploaded"}
                </span>
                {(item.status === "uploading" || item.status === "done") && (
                  <span
                    className="lf-bar"
                    role="progressbar"
                    aria-label={`Upload progress for ${item.file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progress}
                  >
                    <i style={{ transform: `scaleX(${item.progress / 100})` }} />
                  </span>
                )}
                {item.error && (
                  <span className="error">
                    <span aria-hidden="true">!</span> {item.error}
                  </span>
                )}
              </div>
              <button type="button" className="tp-link" onClick={() => files.remove(item.id)} disabled={disabled} aria-label={`Remove ${item.file.name}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
