import type { CSSProperties, ReactNode } from "react";
import { Picture } from "@/components/Picture";
import type { Product } from "@/content/products";
import { RailScroller } from "./RailScroller";

/** Shared-element spring for a garment travelling between its hanger and the product view. */
export const GARMENT_SPRING = { type: "spring", bounce: 0, duration: 0.55 } as const;

/** `sizes` for a garment photo on a hook (keep in sync with --gw in globals.css). */
export const HANGER_SIZES = "(max-width: 600px) 34vw, (max-width: 859.98px) 27vw, 176px";

type BayStyle = CSSProperties & { "--n": number };

/** Inline style that lets a compartment's width follow how many garments it holds. */
export function bayStyle(count: number): BayStyle {
  return { "--n": count };
}

// Silver hook: it curls over the rail and ends in a short stem, so it never covers the product photo.
const HOOK = "M12 22 V12 M12 12 V9 A4.4 4.4 0 1 1 7.6 4.6";

/** Chrome hook that hangs the garment from the rail. Decorative. */
export function HangerSvg() {
  return (
    <svg className="wd-hanger" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={HOOK} fill="none" stroke="#6f757b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={HOOK} fill="none" stroke="#eef1f3" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface GarmentArtProps {
  product: Product;
  /** The photo card. Defaults to a plain card; the rack passes a motion card (layoutId) or an empty slot. */
  card?: ReactNode;
}

/** A garment on its hook with its label underneath. Wrap it in a button or link. */
export function GarmentArt({ product, card }: GarmentArtProps) {
  return (
    <>
      <span className="wd-swing">
        <HangerSvg />
        {card ?? (
          <span className="wd-card">
            <Picture id={product.image} sizes={HANGER_SIZES} alt="" draggable={false} />
          </span>
        )}
      </span>
      <span className="wd-lbl">
        {product.name}
        <small>{product.sub}</small>
      </span>
    </>
  );
}

interface WardrobeProps {
  /** Content engraved into the top cornice (category tabs or a label). */
  cornice: ReactNode;
  children: ReactNode;
  className?: string;
}

/** The cabinet: cornice, a wooden body holding the compartments, and a plinth. */
export function Wardrobe({ cornice, children, className }: WardrobeProps) {
  return (
    <div className={className ? `wd ${className}` : "wd"}>
      <div className="wd-cornice">{cornice}</div>
      <div className="wd-body">{children}</div>
      <div className="wd-plinth" aria-hidden="true" />
    </div>
  );
}

interface BayContentsProps {
  /** Name plate on the shelf edge, e.g. "Fleece". Omit when the cornice already names it. */
  label?: string;
  count: number;
  headingId?: string;
  headingLevel?: "h2" | "h3";
  /** `<li className="wd-item">` elements. */
  children: ReactNode;
}

/** Inside of one compartment: back panel, brass rail with hangers (swipeable), and the shelf with its plate. */
export function BayContents({ label, count, headingId, headingLevel = "h2", children }: BayContentsProps) {
  const Heading = headingLevel;
  return (
    <>
      {label && (
        <Heading id={headingId} className="wd-plate">
          {label}
          <span aria-hidden="true">{count}</span>
          <span className="sr-only">
            , {count} {count === 1 ? "product" : "products"}
          </span>
        </Heading>
      )}
      <div className="wd-panel">
        <RailScroller label={label ?? "garments"}>{children}</RailScroller>
      </div>
      <div className="wd-shelf" aria-hidden="true" />
    </>
  );
}
