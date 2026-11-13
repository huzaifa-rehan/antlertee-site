"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LeadStatus } from "@/lib/leads/rules";
import { adminRequest } from "./api";

const ACTIONS: { status: LeadStatus; label: string }[] = [
  { status: "read", label: "Mark read" },
  { status: "done", label: "Mark done" },
  { status: "spam", label: "Mark spam" },
  { status: "new", label: "Mark unread" },
];

/** Status buttons and delete for one lead. Opening a new lead marks it read. */
export function LeadActions({ id, status, csrf }: { id: string; status: LeadStatus; csrf: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const autoRead = useRef(false);

  const setStatus = async (next: LeadStatus, quiet = false) => {
    setBusy(true);
    const r = await adminRequest(`/api/admin/leads/${id}/`, { method: "PATCH", csrf, body: { status: next } });
    setBusy(false);
    if (!r.ok) {
      setMsg({ tone: "error", text: r.error });
      return;
    }
    if (!quiet) setMsg({ tone: "ok", text: `Marked ${next === "new" ? "unread" : next}.` });
    router.refresh();
  };

  useEffect(() => {
    if (status === "new" && !autoRead.current) {
      autoRead.current = true;
      void setStatus("read", true);
    }
    // Run once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async () => {
    if (!window.confirm("Delete this lead and its files for good? This cannot be undone.")) return;
    setBusy(true);
    const r = await adminRequest(`/api/admin/leads/${id}/`, { method: "DELETE", csrf });
    if (!r.ok) {
      setBusy(false);
      setMsg({ tone: "error", text: r.error });
      return;
    }
    router.push("/admin/leads/");
    router.refresh();
  };

  return (
    <div style={{ margin: "16px 0 20px" }}>
      <div className="adm-actions" role="group" aria-label="Lead actions">
        {ACTIONS.filter((a) => a.status !== status).map((a) => (
          <button key={a.status} type="button" className="pill" onClick={() => void setStatus(a.status)} disabled={busy}>
            {a.label}
          </button>
        ))}
        <button type="button" className="pill danger" onClick={() => void remove()} disabled={busy}>
          Delete
        </button>
      </div>
      <p className="adm-msg" data-tone={msg?.tone} role="status" aria-live="polite">
        {msg?.text}
      </p>
    </div>
  );
}
