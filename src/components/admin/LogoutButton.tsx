"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminRequest } from "./api";

export function LogoutButton({ csrf }: { csrf: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="adm-linkbtn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await adminRequest("/api/admin/logout/", { method: "POST", csrf });
        router.replace("/admin/login/");
        router.refresh();
      }}
    >
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
