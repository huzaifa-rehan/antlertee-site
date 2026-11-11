import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `npm run build` writes a plain HTML/CSS/JS site to ./out that any static host can serve.
  output: "export",
  // /products/hoodie/ -> /products/hoodie/index.html, so simple static servers resolve clean URLs.
  trailingSlash: true,
  // The default image optimiser needs a server. Images are pre-optimised to AVIF/WebP by `npm run images`.
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
