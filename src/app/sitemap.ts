import type { MetadataRoute } from "next";
import { products } from "@/content/products";
import { SITE_URL } from "@/content/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/products/", "/process/", "/about/", "/contact/", "/credits/"];
  return [
    ...pages.map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : 0.8,
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/products/${p.slug}/`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
