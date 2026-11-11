import Link from "next/link";
import type { ReactNode } from "react";
import type { Product } from "@/content/products";

interface ProductDetailsProps {
  product: Product;
  /** Back control (button in the overlay, link on the product page). */
  back: ReactNode;
  headingId: string;
  headingLevel?: "h1" | "h2";
}

/** The info column of a product view: shared by the rack overlay and the deep-linkable product page. */
export function ProductDetails({ product, back, headingId, headingLevel = "h2" }: ProductDetailsProps) {
  const Heading = headingLevel;
  return (
    <div className="pdp-info">
      <div>{back}</div>
      <p className="br" style={{ marginTop: 24, color: "var(--mute)" }}>
        ( {product.category} ) &nbsp; [ {product.sub} ]
      </p>
      <Heading id={headingId} className="pdp-name">
        {product.name}
        <span className="dot">.</span>
      </Heading>
      <p className="pdp-desc">
        {product.description}
      </p>
      <ul className="chips" aria-label="Available finishes">
        {product.finishes.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <dl className="spec-list">
        {product.specs.map((s) => (
          <div key={s.label} style={{ display: "contents" }}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
        <div style={{ display: "contents" }}>
          <dt>MOQ</dt>
          <dd>{product.moq}</dd>
        </div>
      </dl>
      <div>
        <Link className="pill solid lg" href={`/contact/?product=${product.slug}`}>
          Request a quote
        </Link>
      </div>
      <p className="turn-note">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 12a8 8 0 0 1 14.5-4.6M20 12a8 8 0 0 1-14.5 4.6" strokeLinecap="round" />
          <path d="M18.5 3.5v4h-4M5.5 20.5v-4h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Drag to turn: a 360° view of this piece arrives with our product shoot.
      </p>
    </div>
  );
}
