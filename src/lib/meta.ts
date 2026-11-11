import type { Metadata } from "next";
import { SITE_URL, brand } from "@/content/site";

interface PageMetaInput {
  title: string;
  description: string;
  /** Path with trailing slash, e.g. "/products/". */
  path: string;
  /** Absolute path of a 1200x630-ish image under /public. Defaults to /og.jpg. */
  image?: { url: string; width: number; height: number; alt: string };
  /** Skip the "| Antlertee Creative Studios" suffix (home page). */
  absoluteTitle?: boolean;
}

export function pageMeta({ title, description, path, image, absoluteTitle }: PageMetaInput): Metadata {
  const og = image ?? { url: "/og.jpg", width: 1200, height: 630, alt: `${brand.name}: ${brand.tagline}` };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: brand.name,
      title,
      description,
      url: path,
      locale: "en_GB",
      images: [og],
    },
    twitter: { card: "summary_large_image", title, description, images: [og.url] },
  };
}

export const metadataBase = new URL(SITE_URL);
