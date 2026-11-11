"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Picture } from "@/components/Picture";
import { categories, type Category, type Product } from "@/content/products";
import { useDialog } from "@/lib/use-dialog";
import { ProductDetails } from "./ProductDetails";

const EASE = [0.76, 0, 0.24, 1] as const;

function Hook() {
  return (
    <svg className="hook" viewBox="0 0 60 34" aria-hidden="true">
      <path
        d="M30 2 q6 0 6 6 q0 5 -6 7 v4 L4 32 h52 L30 19"
        fill="none"
        stroke="#6d6963"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Slug of the product whose URL is showing, e.g. "/products/heat-reactive-puffer/". */
function slugFromPath(pathname: string): string | null {
  const m = /^\/products\/([^/]+)\/?$/.exec(pathname);
  return m?.[1] ?? null;
}

interface RackProps {
  products: Product[];
  /** The page this rack lives on, restored when the product view closes. */
  basePath: "/" | "/products/";
  showFilters?: boolean;
  /** Section heading level and copy. */
  title: string;
  intro: string;
  titleAs?: "h1" | "h2";
}

/**
 * "The rack." Garments on hangers. Clicking one flies its photo into a product view (motion layoutId)
 * and updates the URL to /products/<slug>/ so the view is shareable; that URL is also a static page.
 * Back button / Escape / "← Rack" close it and the photo flies back onto its hanger.
 */
export function Rack({ products, basePath, showFilters = false, title, intro, titleAs = "h2" }: RackProps) {
  const pathname = usePathname();
  const [filter, setFilter] = useState<Category | "All">("All");
  const pushed = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // The open product is derived from the URL, so browser back/forward just work.
  const openSlug = slugFromPath(pathname);
  const open = openSlug ? products.find((p) => p.slug === openSlug) : undefined;

  const visible = useMemo(
    () => (filter === "All" ? products : products.filter((p) => p.category === filter)),
    [filter, products],
  );
  const counts = useMemo(() => {
    const map = new Map<Category, number>();
    products.forEach((p) => map.set(p.category, (map.get(p.category) ?? 0) + 1));
    return map;
  }, [products]);

  const openProduct = (slug: string) => {
    pushed.current = true;
    window.history.pushState(null, "", `/products/${slug}/`);
  };

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", basePath);
    }
  }, [basePath]);

  useDialog(dialogRef, Boolean(open), close, closeRef);

  const Title = titleAs;
  return (
    <section className={`rack${showFilters ? " rack-full" : ""}`} id="rack" data-nav="light" aria-labelledby="rack-title">
      <div className="rack-head">
        <Title id="rack-title" className={titleAs === "h1" ? "h-page" : "h-section"}>
          {title}
          <span className="dot">.</span>
        </Title>
        <p>{intro}</p>
      </div>

      {showFilters && (
        <div className="filters" role="group" aria-label="Filter by category">
          {(["All", ...categories] as const).map((c) => (
            <button
              key={c}
              type="button"
              className="pill"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
            >
              {c}
              <span aria-hidden="true" style={{ opacity: 0.55 }}>
                {c === "All" ? products.length : (counts.get(c) ?? 0)}
              </span>
              <span className="sr-only">products</span>
            </button>
          ))}
        </div>
      )}
      {showFilters && (
        <p className="sr-only" aria-live="polite">
          {`Showing ${visible.length} ${filter === "All" ? "products" : filter}`}
        </p>
      )}

      <div className="rail" aria-hidden="true" />
      <LayoutGroup>
        <motion.ul className="hangers" layout={showFilters}>
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((p) => (
              <motion.li
                key={p.slug}
                layout={showFilters ? "position" : false}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.35 }}
              >
                <button
                  type="button"
                  className="hanger"
                  aria-label={`Open ${p.name}, ${p.sub}`}
                  aria-haspopup="dialog"
                  onClick={() => openProduct(p.slug)}
                >
                  <Hook />
                  {open?.slug === p.slug ? (
                    <div className="frame" />
                  ) : (
                    <motion.div
                      layoutId={`garment-${p.slug}`}
                      className="frame"
                      style={{ borderRadius: 14 }}
                      transition={{ duration: 0.75, ease: EASE }}
                    >
                      <Picture id={p.image} sizes="(max-width: 520px) 46vw, (max-width: 860px) 30vw, 16vw" alt="" />
                    </motion.div>
                  )}
                  <span className="lbl">
                    {p.name}
                    <small>{p.sub}</small>
                  </span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        {!showFilters && (
          <p style={{ marginTop: 56 }}>
            <Link className="pill lg" href="/products/">
              See the full rack →
            </Link>
          </p>
        )}

        <AnimatePresence>
          {open && (
            <motion.div
              key={open.slug}
              ref={dialogRef}
              className="pdp pdp-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pdp-title"
              data-lenis-prevent
              initial={{ backgroundColor: "rgba(244,242,238,0)" }}
              animate={{ backgroundColor: "rgba(244,242,238,1)" }}
              exit={{ backgroundColor: "rgba(244,242,238,0)", transition: { duration: 0.45, delay: 0.25 } }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                layoutId={`garment-${open.slug}`}
                className="pdp-slot"
                style={{ borderRadius: 22 }}
                transition={{ duration: 0.75, ease: EASE }}
              >
                <Picture id={open.image} sizes="(max-width: 860px) 90vw, 40vw" priority />
              </motion.div>
              <motion.div
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={{
                  hidden: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
                  show: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } },
                }}
              >
                <motion.div
                  variants={{ hidden: { opacity: 0, x: 24 }, show: { opacity: 1, x: 0 } }}
                  transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <ProductDetails
                    product={open}
                    headingId="pdp-title"
                    back={
                      <button ref={closeRef} type="button" className="pill" onClick={close}>
                        ← Rack
                      </button>
                    }
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </section>
  );
}
