import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/components/product/ProductDetails";
import { TurnStage } from "@/components/product/TurnStage";
import { BayContents, GarmentArt, Wardrobe, bayStyle } from "@/components/product/Wardrobe";
import { QuoteCta } from "@/components/QuoteCta";
import { getProduct, products } from "@/content/products";
import { SITE_URL, brand } from "@/content/site";
import { absoluteUrl } from "@/lib/media";
import { pageMeta } from "@/lib/meta";
import { slotImage } from "@/server/media";

interface Params {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  const img = await slotImage(product.image);
  return pageMeta({
    title: `${product.name} (${product.sub}): private-label manufacturing`,
    description: `${product.description} MOQ ${product.moq}.`,
    path: `/products/${product.slug}/`,
    image: { url: img.src, width: img.width, height: img.height, alt: img.alt },
  });
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const related = products.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 4);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: product.category,
    image: absoluteUrl((await slotImage(product.image)).src, SITE_URL),
    manufacturer: { "@type": "Organization", name: brand.name },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="pdp-page fit-bands" data-snap="fit" aria-labelledby="product-title">
        <div className="band band-ink band-head is-first" data-nav="dark">
          <Link className="pill" href="/products/">
            ← All products
          </Link>
          <p className="br kicker">
            {product.category} &nbsp;/&nbsp; {product.sub}
          </p>
        </div>
        <div className="band band-paper band-main" data-nav="light">
          <div className="pdp">
            <div className="pv-media">
              <div className="pv-frame">
                <TurnStage image={product.image} alt={`${product.name}, ${product.sub}`} priority />
              </div>
            </div>
            <ProductDetails product={product} headingId="product-title" headingLevel="h1" inBands />
          </div>
        </div>
        <div className="band band-yellow band-foot pdp-buy" data-nav="yellow">
          <p className="pdp-price">Price on request</p>
          <Link className="pill inked lg" href={`/contact/?product=${product.slug}`}>
            Request a quote
          </Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className="pdp-more fit band-ink" data-nav="dark" data-snap="fit" aria-labelledby="related-title">
          <Wardrobe
            cornice={
              <h2 id="related-title" className="wd-engrave">
                More {product.category}
              </h2>
            }
          >
            <div className="wd-bay" style={bayStyle(related.length)}>
              <BayContents count={related.length}>
                {related.map((p) => (
                  <li key={p.slug} className="wd-item">
                    <Link className="wd-garment" href={`/products/${p.slug}/`} aria-label={`${p.name}, ${p.sub}`}>
                      <GarmentArt product={p} />
                    </Link>
                  </li>
                ))}
              </BayContents>
            </div>
          </Wardrobe>
        </section>
      )}
      <QuoteCta title={`Make it\nyours`} />
    </>
  );
}
