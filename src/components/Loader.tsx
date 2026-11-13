"use client";

import { useEffect, useRef } from "react";

const KEY = "acs-seen";

/** First-visit loader: the Antlertee logo + yellow bar. Skipped on repeat visits in the same session and under reduced motion. */
export function Loader() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Storage blocked (private mode): just show the loader once per page load.
    }
    if (seen || reduce) {
      el.classList.add("done");
      return;
    }
    const start = performance.now();
    let timer = 0;
    const finish = () => {
      timer = window.setTimeout(() => el.classList.add("done"), Math.max(0, 1000 - (performance.now() - start)));
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="loader" ref={ref} aria-hidden="true">
      <div>
        <div className="br">Karachi, PK</div>
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, decorative brand mark */}
        <img className="loader-logo" src="/brand/logo-full-ink.png" alt="" width={520} height={1012} />
        <div className="br">Creative Studios</div>
      </div>
      <i className="loader-bar" />
    </div>
  );
}

/** Inline, render-blocking: hides the loader before first paint on repeat visits. */
export const loaderBootScript = `try{if(sessionStorage.getItem("${KEY}")==="1")document.documentElement.classList.add("seen")}catch(e){}`;
