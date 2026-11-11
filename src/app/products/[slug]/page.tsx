import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/components/product/ProductDetails";
import { TurnStage } from "@/components/product/TurnStage";
import { BayContents, GarmentArt, Wardrobe, bayStyle } from "@/components/product/Wardrobe";
import { QuoteCta } from "@/components/QuoteCta";
import { getImage } from "@/content/images";
import { getProduct, products } from "@/content/products";
import { SITE_URL, brand } from "@/content/site";
import { pageMeta } from "@/lib/meta";

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
  const img = getImage(product.image);
  return pageMeta({
    title: `${product.name} (${product.sub}): private-label manufacturing`,
    description: `${product.description} MOQ ${product.moq}.`,
    path: `/products/${product.slug}/`,
    image: { url: `/img/${img.id}-${img.widths.at(-1)}.webp`, width: img.width, height: img.height, alt: img.alt },
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
    image: `${SITE_URL}/img/${product.image}-${getImage(product.image).widths.at(-1)}.webp`,
    manufacturer: { "@type": "Organization", name: brand.name },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="pdp pdp-page" data-nav="light" aria-labelledby="product-title">
        <div className="pv-media">
          <div className="pv-frame">
            <TurnStage image={product.image} alt={`${product.name}, ${product.sub}`} priority />
          </div>
        </div>
        <ProductDetails
          product={product}
          headingId="product-title"
          headingLevel="h1"
          back={
            <Link className="pill" href="/products/">
              ← All products
            </Link>
          }
        />
      </article>

      {related.length > 0 && (
        <section className="pdp-more" data-nav="light" aria-labelledby="related-title">
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
