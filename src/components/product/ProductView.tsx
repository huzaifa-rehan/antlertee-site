"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import type { Product } from "@/content/products";
import { useDialog } from "@/lib/use-dialog";
import { useMediaQuery } from "@/lib/use-media";
import { ProductDetails } from "./ProductDetails";
import { TurnStage } from "./TurnStage";
import { GARMENT_SPRING } from "./Wardrobe";

interface ProductViewProps {
  product: Product;
  /** True while the view animates out (the garment is already flying back to its hanger). */
  closing: boolean;
  reduce: boolean;
  onClose: () => void;
  /** Called once the closing fade has finished, so the rack can unmount the view. */
  onClosed: () => void;
  returnFocus: () => HTMLElement | null | undefined;
}

/**
 * Product view over the wardrobe (modal dialog). The garment arrives through a shared layoutId with its
 * hanger card; details slide in on the right (below the photo on phones, in normal flow so nothing overlaps).
 */
export function ProductView({ product, closing, reduce, onClose, onClosed, returnFocus }: ProductViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  useDialog(ref, !closing, onClose, backRef, returnFocus);
  // Side by side the details slide in from the right; stacked on phones and tablets they rise from below.
  const stacked = useMediaQuery("(max-width: 859.98px)");
  const offset = reduce ? {} : stacked ? { y: 28 } : { x: 40 };

  return (
    <div
      ref={ref}
      className="pv"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pv-title"
      data-lenis-prevent
      data-closing={closing || undefined}
    >
      <motion.div
        className="pv-backdrop"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: reduce ? 0.2 : closing ? 0.42 : 0.32, ease: "easeOut" }}
        onAnimationComplete={() => {
          if (closing) onClosed();
        }}
      />
      <div className="pv-sheet">
        <motion.div
          className="pv-bar"
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 1 }}
          transition={{ duration: closing ? 0.15 : 0.3, delay: closing ? 0 : 0.15 }}
        >
          <button ref={backRef} type="button" className="pill" onClick={onClose}>
            ← Back to the rack
          </button>
          <span className="br pv-esc" aria-hidden="true">
            Esc to close
          </span>
        </motion.div>
        <div className="pv-main">
          <div className="pv-media">
            {/* While closing, a copy flies back from here (see Rack), so the slot just holds the layout. */}
            {closing ? (
              <div className="pv-frame" />
            ) : (
              <motion.div
                className="pv-frame"
                layoutId={reduce ? undefined : `garment-${product.slug}`}
                transition={GARMENT_SPRING}
                initial={reduce ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
              >
                <TurnStage image={product.image} alt={`${product.name}, ${product.sub}`} priority />
              </motion.div>
            )}
          </div>
          <motion.div
            className="pv-info"
            initial={{ opacity: 0, ...offset }}
            animate={
              closing
                ? { opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }
                : { opacity: 1, x: 0, y: 0, transition: { ...GARMENT_SPRING, delay: reduce ? 0 : 0.1 } }
            }
          >
            <ProductDetails product={product} headingId="pv-title" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
