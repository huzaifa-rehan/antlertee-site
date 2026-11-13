import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No `output: "export"` any more: the site now has route handlers (leads inbox, uploads, admin). The marketing
  // pages are still statically generated at build time and revalidated on demand when the admin changes an image.
  // /products/hoodie/ style URLs, as before.
  trailingSlash: true,
  // Images are pre-optimised to AVIF/WebP (`npm run images`, or by the admin when an image is replaced), so the
  // Next image optimiser is not used.
  images: { unoptimized: true },
  // The embedded development database ships WASM/data files; load it from node_modules instead of bundling it.
  serverExternalPackages: ["@electric-sql/pglite"],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow" };
    return [
      { source: "/admin/:path*", headers: [noindex, { key: "Cache-Control", value: "private, no-store" }, { key: "Referrer-Policy", value: "same-origin" }] },
      { source: "/api/:path*", headers: [noindex] },
    ];
  },
};

export default nextConfig;
