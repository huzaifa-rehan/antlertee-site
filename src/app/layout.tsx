import type { Metadata, Viewport } from "next";
import { Gabarito, Onest } from "next/font/google";
import "./globals.css";
import "./buttons.css";
import { Loader, loaderBootScript } from "@/components/Loader";
import { MediaOverridesProvider } from "@/components/MediaOverrides";
import { Providers } from "@/components/Providers";
import { SiteChrome } from "@/components/SiteChrome";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { SmoothScroll } from "@/components/SmoothScroll";
import { brand } from "@/content/site";
import { metadataBase } from "@/lib/meta";
import { getMediaOverrides } from "@/server/media";

const gabarito = Gabarito({
  subsets: ["latin"],
  weight: ["400", "800", "900"],
  variable: "--font-gabarito",
  display: "swap",
});

const onest = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-onest",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: `${brand.name}: private-label streetwear manufacturer, Karachi`,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#0d0c0b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Admin image replacements: one cached read, revalidated on change (see src/server/media.ts).
  const overrides = await getMediaOverrides();
  return (
    <html lang="en" className={`${gabarito.variable} ${onest.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: loaderBootScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Providers>
          <MediaOverridesProvider value={overrides}>
            <SiteChrome
              before={
                <>
                  <Loader />
                  <SmoothScroll />
                  <SiteNav />
                </>
              }
              after={<SiteFooter />}
            >
              <main id="main" tabIndex={-1}>
                {children}
              </main>
            </SiteChrome>
          </MediaOverridesProvider>
        </Providers>
      </body>
    </html>
  );
}
