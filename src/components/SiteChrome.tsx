"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The marketing site's loader, smooth scroll, nav and footer; left out on the admin pages. */
export function SiteChrome({ before, after, children }: { before: ReactNode; after: ReactNode; children: ReactNode }) {
  const isAdmin = usePathname()?.startsWith("/admin") ?? false;
  if (isAdmin) return <>{children}</>;
  return (
    <>
      {before}
      {children}
      {after}
    </>
  );
}
