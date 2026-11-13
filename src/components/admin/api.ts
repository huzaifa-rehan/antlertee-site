// Small fetch wrapper for admin actions: sends the CSRF header and returns a plain result.

export type AdminResult<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; error: string; status: number };

export async function adminRequest<T = Record<string, unknown>>(
  url: string,
  init: { method: "POST" | "PATCH" | "DELETE"; csrf: string; body?: unknown },
): Promise<AdminResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers: { "x-csrf-token": init.csrf, ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection.", status: 0 };
  }
  const data: unknown = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: (data ?? {}) as T };
  if (res.status === 401) {
    // Full reload (not client navigation) so the expired session is dropped everywhere.
    window.location.assign(new URL("/admin/login/", window.location.origin));
  }
  const error =
    typeof data === "object" && data !== null && typeof (data as { error?: unknown }).error === "string"
      ? (data as { error: string }).error
      : "Something went wrong. Please try again.";
  return { ok: false, error, status: res.status };
}
