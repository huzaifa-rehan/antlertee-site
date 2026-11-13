import Link from "next/link";
import type { ReactNode } from "react";
import type { Product } from "@/content/products";

interface ProductDetailsProps {
  product: Product;
  /** Back control (the overlay renders its own in a top bar, the product page passes a link). */
  back?: ReactNode;
  headingId: string;
  headingLevel?: "h1" | "h2";
}

/** The info column of a product view: shared by the wardrobe overlay and the deep-linkable product page. */
export function ProductDetails({ product, back, headingId, headingLevel = "h2" }: ProductDetailsProps) {
  const Heading = headingLevel;
  return (
    <div className="pdp-info">
      {back && <div className="pdp-back">{back}</div>}
      <p className="br pdp-kicker">
        {product.category} &nbsp;/&nbsp; {product.sub}
      </p>
      <Heading id={headingId} className="pdp-name">
        {product.name}
        <span className="dot">.</span>
      </Heading>
      <p className="pdp-desc">{product.description}</p>
      <dl className="spec-list">
        {product.specs.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
        <div>
          <dt>MOQ</dt>
          <dd>{product.moq}</dd>
        </div>
      </dl>
      <p className="br pdp-label" id={`${headingId}-finishes`}>
        Finishes
      </p>
      <ul className="chips" aria-labelledby={`${headingId}-finishes`}>
        {product.finishes.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <div className="pdp-cta">
        <Link className="pill solid lg" href={`/contact/?product=${product.slug}`}>
          Request a quote
        </Link>
        <span className="pdp-price">Price on request</span>
      </div>
    </div>
  );
}
