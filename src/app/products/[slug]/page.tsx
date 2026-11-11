import Link from "next/link";
import { notFound } from "next/navigation";
import { Picture } from "@/components/Picture";
import { ProductDetails } from "@/components/product/ProductDetails";
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
        <div className="pdp-slot">
          <Picture id={product.image} sizes="(max-width: 860px) 90vw, 40vw" priority />
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
        <section className="section" data-nav="light" aria-labelledby="related-title" style={{ paddingTop: 0 }}>
          <h2 id="related-title" className="br" style={{ color: "var(--mute)", marginBottom: 20 }}>
            ( More {product.category} )
          </h2>
          <ul className="hangers" style={{ marginTop: 0 }}>
            {related.map((p) => (
              <li key={p.slug}>
                <Link className="hanger" href={`/products/${p.slug}/`} style={{ textDecoration: "none" }}>
                  <div className="frame">
                    <Picture id={p.image} sizes="(max-width: 860px) 46vw, 16vw" alt="" />
                  </div>
                  <span className="lbl">
                    {p.name}
                    <small>{p.sub}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <QuoteCta title={`Make it\nyours`} />
    </>
  );
}
