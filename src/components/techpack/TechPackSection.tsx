"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { contact, whatsappLink } from "@/content/site";
import { getLenis } from "@/lib/lenis";
import { ProcessHoodie } from "./ProcessHoodie";
import { SendTechPack } from "./SendTechPack";
import "./techpack.css";
import "./hero.css";

// The builder reads its saved draft from localStorage on first render, so it only renders in the browser.
const TechPackBuilder = dynamic(() => import("./TechPackBuilder"), {
  ssr: false,
  loading: () => (
    <p className="tp-loading" role="status">
      Loading the tech pack builder…
    </p>
  ),
});

type Mode = "build" | "send";
const PANEL: Record<Mode, string> = { build: "build-tech-pack", send: "send-tech-pack" };
const HASH_EVENT = "tp-hash";

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(HASH_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(HASH_EVENT, onChange);
  };
}

const OPTIONS: { mode: Mode; n: string; title: string; text: string }[] = [
  {
    mode: "build",
    n: "A",
    title: "Build a tech pack with us",
    text: "Eight short steps: garment, fit, fabric, colours, artwork, sizes, labels. Download it as a PDF or send it.",
  },
  {
    mode: "send",
    n: "B",
    title: "Send your own tech pack",
    text: "Already have one? Tell us the basics and attach your files in WhatsApp or email.",
  },
];

/**
 * The Process page hero: the page headline and the tech pack choice (build / send tabs) beside the 3D hoodie, which
 * plays by itself, from a transparent ghost to the grey acid-washed garment (ProcessHoodie.tsx).
 * Below the hero sit the panels. The URL hash picks the tab, so /process/#send-tech-pack opens the send panel and
 * #tech-pack or #build-tech-pack the builder.
 */
export function TechPackSection() {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  const mode: Mode = hash === `#${PANEL.send}` ? "send" : "build";
  const tabsRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);

  // Arriving with #send-tech-pack: that panel was hidden at first paint, so the browser could not scroll to it.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id !== PANEL.send && id !== PANEL.build) return;
    const raf = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(raf);
  }, []);

  const choose = (m: Mode, focus = false) => {
    window.history.replaceState(null, "", `#${PANEL[m]}`);
    window.dispatchEvent(new Event(HASH_EVENT));
    if (focus) tabsRef.current?.querySelector<HTMLButtonElement>(`#tab-${m}`)?.focus();
  };

  // Choosing a tab with the pointer takes you to its panel, which sits below the pinned hero.
  const pick = (m: Mode) => {
    choose(m);
    requestAnimationFrame(() => {
      const el = panelsRef.current;
      if (!el) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(el, { offset: -88, duration: 0.8 });
      else el.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  // Tabs pattern: arrow keys move between the two options.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const next: Mode = e.key === "Home" ? "build" : e.key === "End" ? "send" : mode === "build" ? "send" : "build";
      choose(next, true);
    }
  };

  return (
    <section id="tech-pack" className="tph" data-nav="dark" data-mode={mode} aria-labelledby="process-title">
      <div className="tph-zone">
        <div className="tph-pin">
          <div className="tph-in">
            <div className="tph-left">
              <header className="tph-head">
                <p className="br kicker tph-kicker">Process &nbsp;·&nbsp; Tech pack to bulk</p>
                <h1 id="process-title" className="tph-title">
                  Build your
                  <br />
                  tech pack<span className="dot">.</span>
                </h1>
                <p className="tph-lead">
                  Pick the garment, fabric, colour, wash and artwork. Send it to us on WhatsApp ({contact.whatsappDisplay}) or email and we
                  reply with options and a price.
                </p>
                <a className="tph-how" href="#how-it-works">
                  How it works ↓
                </a>
              </header>

              <div className="tp-tabs tph-tabs" role="tablist" aria-label="How do you want to start?" ref={tabsRef} onKeyDown={onKeyDown}>
                {OPTIONS.map((o) => (
                  <button
                    key={o.mode}
                    id={`tab-${o.mode}`}
                    type="button"
                    role="tab"
                    className="tp-tab"
                    aria-selected={mode === o.mode}
                    aria-controls={PANEL[o.mode]}
                    tabIndex={mode === o.mode ? 0 : -1}
                    onClick={() => pick(o.mode)}
                  >
                    <span className="tp-tab-n" aria-hidden="true">
                      {o.n}
                    </span>
                    <span className="tp-tab-t">{o.title}</span>
                    <span className="tp-tab-x">{o.text}</span>
                    <span className="tp-tab-go" aria-hidden="true">
                      {mode === o.mode ? "Selected" : "Choose"} →
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <ProcessHoodie />
          </div>
        </div>
      </div>

      <div className="tph-panels" data-nav="light" id="tph-panels" ref={panelsRef}>
        <div className="tph-panels-in">
          <div id={PANEL.build} role="tabpanel" aria-labelledby="tab-build" className="tp-panel" hidden={mode !== "build"}>
            <TechPackBuilder />
            <noscript>
              <p className="tp-loading">
                The builder needs JavaScript. You can still send your tech pack on <a href={whatsappLink()}>WhatsApp</a> or to{" "}
                <a href={`mailto:${contact.email}`}>{contact.email}</a>.
              </p>
            </noscript>
          </div>
          <div id={PANEL.send} role="tabpanel" aria-labelledby="tab-send" className="tp-panel" hidden={mode !== "send"}>
            <SendTechPack onBuild={() => choose("build", true)} />
          </div>
        </div>
      </div>
    </section>
  );
}
