"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Picture } from "@/components/Picture";
import type { ImageId } from "@/content/images";
import { categories, products as allProducts, type Category, type Product } from "@/content/products";
import { usePrefersReducedMotion } from "@/lib/use-media";
import { ProductView } from "./ProductView";
import { BayContents, GARMENT_SPRING, GarmentArt, HANGER_SIZES, Wardrobe, bayStyle } from "./Wardrobe";

/** Slug of the product whose URL is showing, e.g. "/products/heat-reactive-puffer/". */
function slugFromPath(pathname: string): string | null {
  const m = /^\/products\/([^/]+)\/?$/.exec(pathname);
  return m?.[1] ?? null;
}

const idFor = (label: string) => `bay-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

interface Flight {
  slug: string;
  image: ImageId;
  rect: { top: number; left: number; width: number; height: number };
}

interface Group {
  label: string;
  /** Set for category compartments (the full wardrobe); the home rack has one unnamed compartment. */
  category?: Category;
  items: Product[];
}

interface RackProps {
  products: Product[];
  /** The page this rack lives on, restored when the product view closes. */
  basePath: "/" | "/products/";
  /** Full wardrobe: one compartment per category, with the category tabs on the cornice. */
  showFilters?: boolean;
  /** Section heading level and copy. */
  title: string;
  intro: string;
  titleAs?: "h1" | "h2";
}

/**
 * "The rack": a wooden wardrobe with a compartment per category. Clicking a garment carries its photo off the
 * hanger into a product view (motion layoutId) and sets the URL to /products/<slug>/ so the view is shareable
 * (that URL is also a static page). Back button / Escape / "Back to the rack" send it home to the same hanger.
 *
 * The return trip flies a fixed-position copy (portalled to <body>) instead of the hanger card itself, because
 * the card sits inside a horizontally scrolling rail that would clip it mid-flight.
 */
export function Rack({ products, basePath, showFilters = false, title, intro, titleAs = "h2" }: RackProps) {
  const reduce = usePrefersReducedMotion();
  const [filter, setFilter] = useState<Category | "All">("All");
  const sectionRef = useRef<HTMLElement>(null);
  const pushed = useRef(false);

  // The garment in the product view. Seeded from the URL when we land here through history (e.g. Back from
  // /contact/ to a /products/<slug>/ entry we pushed); afterwards clicks and popstate drive it.
  const [view, setView] = useState<string | null>(() =>
    typeof window === "undefined" ? null : (slugFromPath(window.location.pathname) ?? null),
  );
  const [closing, setClosing] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);

  const viewed = view ? products.find((p) => p.slug === view) : undefined;

  const groups = useMemo<Group[]>(() => {
    if (!showFilters) return [{ label: "Featured", items: products }];
    return categories
      .map((c) => ({ label: c, category: c, items: products.filter((p) => p.category === c) }))
      .filter((g) => g.items.length > 0);
  }, [products, showFilters]);
  const tabs: (Category | "All")[] = ["All", ...groups.flatMap((g) => (g.category ? [g.category] : []))];
  const visible = filter === "All" ? groups : groups.filter((g) => g.category === filter);
  const shownCount = visible.reduce((n, g) => n + g.items.length, 0);

  const find = useCallback(
    (attr: "data-slot" | "data-garment", slug: string) =>
      sectionRef.current?.querySelector<HTMLElement>(`[${attr}="${slug}"]`) ?? null,
    [],
  );

  /** Starts the exit: the view fades, and a copy of the photo flies from the stage back to its hanger. */
  const beginClose = useCallback(() => {
    if (!viewed || closing) return;
    const slot = find("data-slot", viewed.slug);
    // If the hanger has slid out of view along its rail, bring it back so the garment lands where it can be seen.
    const rail = slot?.closest<HTMLElement>(".wd-scroll");
    if (slot && rail) {
      const s = slot.getBoundingClientRect();
      const v = rail.getBoundingClientRect();
      if (s.left < v.left + 16) rail.scrollLeft -= v.left + 16 - s.left;
      else if (s.right > v.right - 16) rail.scrollLeft += s.right - (v.right - 16);
    }
    const r = slot?.getBoundingClientRect();
    if (!reduce && r && r.width > 0) {
      setFlight({
        slug: viewed.slug,
        image: viewed.image,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      });
    }
    setClosing(true);
  }, [viewed, closing, reduce, find]);

  const openProduct = (slug: string) => {
    pushed.current = true;
    window.history.pushState(null, "", `/products/${slug}/`);
    setFlight(null);
    setClosing(false);
    setView(slug);
  };

  const close = useCallback(() => {
    beginClose();
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", basePath);
    }
  }, [beginClose, basePath]);

  const finishClose = useCallback(() => {
    setView(null);
    setClosing(false);
  }, []);

  const returnFocus = useCallback(() => (view ? find("data-garment", view) : null), [view, find]);

  // Browser back/forward: follow the URL.
  useEffect(() => {
    const onPop = () => {
      const slug = slugFromPath(window.location.pathname);
      if (slug && products.some((p) => p.slug === slug)) {
        if (slug !== view || closing) {
          setFlight(null);
          setClosing(false);
          setView(slug);
        }
      } else if (view && !closing) {
        pushed.current = false;
        beginClose();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [products, view, closing, beginClose]);

  // Safety net: drop the flying copy even if its layout animation never reports completion.
  useEffect(() => {
    if (!flight) return;
    const t = window.setTimeout(() => setFlight(null), 1400);
    return () => window.clearTimeout(t);
  }, [flight]);

  const Title = titleAs;
  const offRail = (slug: string) => view === slug || flight?.slug === slug;
  const head = (
    <div className="rack-head">
      <Title id="rack-title" className={titleAs === "h1" ? "h-page" : "h-section"}>
        {title}
        <span className="dot">.</span>
      </Title>
      <p>{intro}</p>
    </div>
  );

  // The full wardrobe (products page): an ink hero band over the paper wardrobe. The home rack is one screen: the wardrobe
  // on ink with a yellow foot band holding the link to the full rack.
  return (
    <section
      ref={sectionRef}
      className={showFilters ? "rack rack-full" : "rack rack-feature fit-bands"}
      id="rack"
      data-snap={showFilters ? "edge" : "fit"}
      aria-labelledby="rack-title"
    >
      <LayoutGroup>
        {showFilters && (
          <div className="band band-ink rack-hero" data-nav="dark">
            {head}
          </div>
        )}
        <div
          className={showFilters ? "band band-paper rack-body" : "band band-ink band-main rack-body"}
          data-nav={showFilters ? "light" : "dark"}
        >
          {!showFilters && head}
        <Wardrobe
          cornice={
            showFilters ? (
              <div className="wd-tabs" role="group" aria-label="Filter by category">
                {tabs.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="wd-tab"
                    aria-pressed={filter === c}
                    onClick={() => setFilter(c)}
                  >
                    {c}
                    <span aria-hidden="true">
                      {c === "All" ? products.length : (groups.find((g) => g.category === c)?.items.length ?? 0)}
                    </span>
                    <span className="sr-only"> products</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="wd-engrave">Featured pieces</p>
            )
          }
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((g) => (
              <motion.section
                key={g.label}
                className="wd-bay"
                style={bayStyle(g.items.length)}
                aria-labelledby={showFilters ? idFor(g.label) : undefined}
                aria-label={showFilters ? undefined : "Featured pieces"}
                layout={showFilters ? "position" : false}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BayContents
                  label={showFilters ? g.label : undefined}
                  count={g.items.length}
                  headingId={idFor(g.label)}
                  headingLevel={titleAs === "h1" ? "h2" : "h3"}
                >
                  {g.items.map((p) => (
                    <li key={p.slug} className="wd-item">
                      <button
                        type="button"
                        className="wd-garment"
                        data-garment={p.slug}
                        aria-label={`${p.name}, ${p.sub}`}
                        aria-haspopup="dialog"
                        onClick={() => openProduct(p.slug)}
                      >
                        <GarmentArt
                          product={p}
                          card={
                            offRail(p.slug) ? (
                              <span className="wd-card is-out" data-slot={p.slug} />
                            ) : (
                              <motion.span
                                className="wd-card"
                                data-slot={p.slug}
                                layoutId={`garment-${p.slug}`}
                                transition={GARMENT_SPRING}
                              >
                                <Picture id={p.image} sizes={HANGER_SIZES} alt="" draggable={false} />
                              </motion.span>
                            )
                          }
                        />
                      </button>
                    </li>
                  ))}
                </BayContents>
              </motion.section>
            ))}
          </AnimatePresence>
        </Wardrobe>

        {showFilters && (
          <p className="sr-only" aria-live="polite">
            {`Showing ${shownCount} ${filter === "All" ? "products" : filter}`}
          </p>
        )}

        </div>

        {!showFilters && (
          <div className="band band-yellow band-foot rack-more" data-nav="yellow">
            <p className="br">
              {allProducts.length} bases across {categories.length} categories
            </p>
            <Link className="pill inked lg" href="/products/">
              Show me everything
            </Link>
          </div>
        )}

        {viewed && (
          <ProductView
            key={viewed.slug}
            product={viewed}
            closing={closing}
            reduce={reduce}
            onClose={close}
            onClosed={finishClose}
            returnFocus={returnFocus}
          />
        )}

        {flight &&
          createPortal(
            <motion.span
              className="wd-card wd-flight"
              layoutId={`garment-${flight.slug}`}
              transition={GARMENT_SPRING}
              style={{
                top: flight.rect.top,
                left: flight.rect.left,
                width: flight.rect.width,
                height: flight.rect.height,
              }}
              onLayoutAnimationComplete={() => setFlight(null)}
            >
              <Picture id={flight.image} sizes={HANGER_SIZES} alt="" draggable={false} />
            </motion.span>,
            document.body,
          )}
      </LayoutGroup>
    </section>
  );
}
