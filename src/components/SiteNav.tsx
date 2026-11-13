"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { nav } from "@/content/site";
import { useDialog } from "@/lib/use-dialog";

/** "yellow" is the light theme over the yellow quote CTA, where the yellow "Get a quote" pill would vanish. */
type Theme = "dark" | "light" | "yellow";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href) || pathname === href.replace(/\/$/, "");
}

/**
 * Pill nav. Text colour follows the section under the nav: any element with data-nav="dark|light|yellow".
 * Under 860px the links collapse into a full-screen menu dialog.
 */
export function SiteNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDialog(menuRef, open, close);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = 40;
      let theme: Theme = "light";
      for (const sec of document.querySelectorAll<HTMLElement>("[data-nav]")) {
        const r = sec.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) {
          const v = sec.dataset.nav;
          theme = v === "dark" || v === "yellow" ? v : "light";
        }
      }
      el.dataset.theme = theme;
      // Once the page has scrolled the big logo shrinks, so it covers less of the section under it.
      el.dataset.compact = window.scrollY > 48 ? "1" : "0";
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Sections mount after hydration on some pages; re-check shortly after navigation.
    const t = window.setTimeout(update, 120);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [pathname]);

  return (
    <>
      <header className="nav" ref={navRef} data-theme="dark">
        <Link className="wm" href="/" aria-label="Antlertee Creative Studios, home">
          <span className="wm-logo" aria-hidden="true" />
        </Link>
        <nav aria-label="Main">
          <ul className="nav-links">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link className="pill" href={item.href} aria-current={active ? "page" : undefined}>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="nav-right">
          <Link className="pill solid" href="/contact/">
            Get a quote
          </Link>
          <button
            type="button"
            className="pill menu-btn"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            className="menu on-dark"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: [0.7, 0, 0.2, 1] }}
          >
            <div className="menu-top">
              <Link className="wm" href="/" onClick={close} aria-label="Antlertee Creative Studios, home">
                <span className="wm-logo" aria-hidden="true" />
              </Link>
              <button type="button" className="pill" onClick={close}>
                Close
              </button>
            </div>
            <nav aria-label="Menu">
              <ul>
                <li>
                  <Link href="/" onClick={close} aria-current={pathname === "/" ? "page" : undefined}>
                    Home<span className="dot">.</span>
                  </Link>
                </li>
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    >
                      {item.label}
                      <span className="dot">.</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="br" style={{ color: "var(--mute-inv)" }}>
              Karachi, Pakistan
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
