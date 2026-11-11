"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { contact, whatsappLink } from "@/content/site";
import { SendTechPack } from "./SendTechPack";
import "./techpack.css";

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
  { mode: "build", n: "A", title: "Build a tech pack with us", text: "Eight short steps: garment, fit, fabric, colours, artwork, sizes, labels. Download it as a PDF or send it." },
  { mode: "send", n: "B", title: "Send your own tech pack", text: "Already have one? Tell us the basics and attach your files in WhatsApp or email." },
];

/**
 * The tech pack choice: two large tabs (build / send) with their panels. The URL hash picks the tab,
 * so /process/#send-tech-pack opens the send panel and #tech-pack or #build-tech-pack the builder.
 */
export function TechPackSection() {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const mode: Mode = hash === `#${PANEL.send}` ? "send" : "build";
  const tabsRef = useRef<HTMLDivElement>(null);

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

  // Tabs pattern: arrow keys move between the two options.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const next: Mode = e.key === "Home" ? "build" : e.key === "End" ? "send" : mode === "build" ? "send" : "build";
      choose(next, true);
    }
  };

  return (
    <section id="tech-pack" className="section tp-section" data-nav="light" aria-labelledby="tp-title">
      <div className="tp-intro">
        <div>
          <p className="br kicker">( Tech pack ) &nbsp; [ Build or send ]</p>
          <h2 id="tp-title" className="h-section mt-4">
            Your tech
            <br />
            pack<span className="dot">.</span>
          </h2>
        </div>
        <p className="tp-intro-p">
          The tech pack is the brief for your garment. Build one with us here, or send the one you already have. Either way it reaches
          us on WhatsApp ({contact.whatsappDisplay}) or email, and we reply with options and a price.
        </p>
      </div>

      <div className="tp-tabs" role="tablist" aria-label="How do you want to start?" ref={tabsRef} onKeyDown={onKeyDown}>
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
            onClick={() => choose(o.mode)}
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
    </section>
  );
}
