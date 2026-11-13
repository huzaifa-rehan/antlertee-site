/**
 * Site-wide facts and contact details for Antlertee Creative Studios (ACS).
 *
 * Source of truth: MARKETING/Antlertee/RESEARCH/antlertee-baseline-study.md and the brand's Instagram captions.
 * Every figure the client has NOT confirmed lives in `facts` below and is marked `TODO confirm with client`.
 * Change a figure here and it updates everywhere on the site (home, products, process, FAQs, footer).
 */

/** Public site URL, used for canonical links, Open Graph and the sitemap.
 * TODO confirm with client: domain not chosen yet (baseline study, question 6). Set NEXT_PUBLIC_SITE_URL at build time. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.example.com").replace(/\/$/, "");

export const brand = {
  name: "Antlertee Creative Studios",
  short: "ACS",
  wordmark: "ANTLERTEE",
  city: "Karachi",
  country: "Pakistan",
  tagline: "Yarn to pack.",
  description:
    "Private-label streetwear and garment manufacturing in Karachi, Pakistan. Heavyweight knitwear, fleece, outerwear and denim with in-house print, embroidery and specialised washes, from tech pack to bulk.",
} as const;

export const contact = {
  whatsappDisplay: "+92 305 2555575",
  whatsappLocal: "0305-2555575",
  /** wa.me needs the international number without + or spaces. */
  whatsappNumber: "923052555575",
  email: "antlerteecreativestudios@gmail.com",
  instagram: "https://www.instagram.com/antlerteecreativestudios/",
  instagramHandle: "@antlerteecreativestudios",
  facebook: "https://www.facebook.com/profile.php?id=61557809762721",
  linkedin: "https://www.linkedin.com/company/antlertee-creative-studios/posts/?feedView=all",
} as const;

export const facts = {
  // 200+ clothing brands served, per the client's own site prototype (reviewed 2026-11-13). The Instagram carousel (Jun 2026) said 500+;
  // the owner chose 200+.
  brandsServed: "200+",
  // TODO confirm with client: "6 years" (2026 carousel); a 2024 reel celebrated "5 years in business". Founding year unknown.
  yearsInBusiness: "6",
  // TODO confirm with client: export markets named in posts (USA, UK, Canada, Kuwait).
  exportMarkets: ["USA", "UK", "Canada", "Kuwait"],
  // TODO confirm with client: standard MOQ has changed many times; 50–100 per colour/design is the current Instagram line.
  moq: "50–100",
  moqLong: "50–100 pcs per colour / design",
  // TODO confirm with client: 30 pcs MOQ applies only to the heat-reactive puffer (Oct 2026 caption).
  moqPuffer: "30 pcs (this piece only)",
  // TODO confirm with client: "3–4 week turnaround" (Jul 2025 caption).
  turnaround: "3–4 weeks",
  // TODO confirm with client: bomber pre-order delivery "2–3 weeks" (Nov 2025 caption).
  turnaroundBomber: "2–3 weeks",
  // TODO confirm with client: puffer pre-order delivery "12–15 business days" (Nov 2025 caption).
  turnaroundPuffer: "12–15 business days",
  // TODO confirm with client: "500 pcs 450+ GSM hoodies exported to the USA" (Apr 2026 carousel).
  proofHoodieExport: "500 pcs to the USA",
  // TODO confirm with client: client names. Spotify Pakistan, Valour Clothing, Prophetic Living, jersey clients and others
  // are mentioned in posts but permission is pending, so NO client names or logos are shown anywhere on the site.
  namedClients: [] as string[],
} as const;

export const nav = [
  { href: "/products/", label: "Products" },
  { href: "/process/", label: "Process" },
  { href: "/about/", label: "About" },
  { href: "/blog/", label: "Blog" },
  { href: "/contact/", label: "Contact" },
] as const;

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${contact.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function mailtoLink(subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  // URLSearchParams encodes spaces as "+", which mail clients show literally; use %20 instead.
  const query = params.toString().replace(/\+/g, "%20");
  return `mailto:${contact.email}${query ? `?${query}` : ""}`;
}
