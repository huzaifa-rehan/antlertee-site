"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (!password) {
      setError("Enter the password.");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "same-origin",
      });
      if (res.ok) {
        router.replace("/admin/leads/");
        router.refresh();
        return;
      }
      const data: unknown = await res.json().catch(() => null);
      setError(
        typeof data === "object" && data !== null && typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : "Could not log in. Please try again.",
      );
    } catch {
      setError("Could not reach the server. Check your connection.");
    }
    setBusy(false);
    inputRef.current?.select();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="adm-form-row">
      <div className="field">
        <label htmlFor="adm-password">Password</label>
        <input
          ref={inputRef}
          id="adm-password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "adm-login-err" : undefined}
        />
      </div>
      <p id="adm-login-err" className="adm-msg" data-tone="error" role="alert">
        {error}
      </p>
      <button type="submit" className="pill inked lg" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
