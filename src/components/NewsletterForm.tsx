"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { whatsappLink } from "@/content/site";
import { normalizeEmail } from "@/lib/newsletter";
import "./newsletter.css";

type Phase = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

/** Footer newsletter sign-up: an email field and a button. Saves the address to the admin's Subscribers list. */
export function NewsletterForm() {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const sending = phase.kind === "sending";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const data = new FormData(e.currentTarget);
    const email = normalizeEmail(data.get("email"));
    if (!email) {
      setPhase({ kind: "error", message: "Enter a valid email, like name@brand.com." });
      inputRef.current?.focus();
      return;
    }
    setPhase({ kind: "sending" });
    try {
      const res = await fetch("/api/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website: String(data.get("website") ?? ""), sourcePath: window.location.pathname }),
      });
      if (res.ok) {
        setPhase({ kind: "done" });
        return;
      }
      const body: unknown = await res.json().catch(() => null);
      const message =
        typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : "Sign-up is not available right now. Please try again later.";
      setPhase({ kind: "error", message });
    } catch {
      setPhase({ kind: "error", message: "Could not reach the server. Check your connection and try again." });
    }
  };

  if (phase.kind === "done") {
    return (
      <div className="nl nl-done" role="status">
        <p className="nl-done-h">You&rsquo;re in.</p>
        <p className="nl-note">We&rsquo;ll send you the odd drop update and behind-the-scenes from the floor. Nothing else.</p>
      </div>
    );
  }

  return (
    <form className="nl" noValidate onSubmit={onSubmit} aria-busy={sending || undefined}>
      <label className="nl-label" htmlFor={`${id}-email`}>
        Get the next drop first
      </label>
      <div className="nl-row">
        <input
          ref={inputRef}
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Your email"
          required
          aria-invalid={phase.kind === "error" || undefined}
          aria-describedby={`${id}-note`}
          disabled={sending}
        />
        <button type="submit" className="nl-btn" disabled={sending}>
          <span>{sending ? "Adding you…" : "Count me in"}</span>
        </button>
      </div>
      <div className="nl-hp" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <p id={`${id}-note`} className="nl-note" role={phase.kind === "error" ? "alert" : undefined} data-error={phase.kind === "error" || undefined}>
        {phase.kind === "error" ? (
          <>
            {phase.message}{" "}
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              Or message us on WhatsApp
            </a>
            .
          </>
        ) : (
          <>New drops, new fabrics and how we make them. Now and then, never spam.</>
        )}
      </p>
    </form>
  );
}
