"use client";

import { useState } from "react";
import { techniques, zonesFor, type TechniqueId, type View } from "@/content/techpack";
import type { StepProps } from "./fields";
import { GarmentFlat } from "./GarmentFlat";
import { activePlacements, garmentLabel } from "./logic";

const focusSoon = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus({ preventScroll: false }));

/**
 * 5. Artwork and placements. Click a zone on the sketch, or use the zone list (the keyboard path),
 * then choose a technique and an approximate size for each placement.
 */
export function ArtworkStep({ data, update, set }: StepProps) {
  const zones = zonesFor(data.garment);
  const [view, setView] = useState<View>("front");
  const [selected, setSelected] = useState<string | null>(null);
  const markers = activePlacements(data);

  const add = (id: string) =>
    update((d) => (d.placements[id] ? d : { ...d, placements: { ...d.placements, [id]: { technique: "", size: "" } } }));
  const remove = (id: string) =>
    update((d) => {
      const placements = { ...d.placements };
      delete placements[id];
      return { ...d, placements };
    });
  const patch = (id: string, p: { technique?: TechniqueId | ""; size?: string }) =>
    update((d) => {
      const cur = d.placements[id] ?? { technique: "", size: "" };
      return { ...d, placements: { ...d.placements, [id]: { ...cur, ...p } } };
    });

  // Clicking the sketch adds the placement (if new) and jumps to its technique field.
  const onZone = (id: string) => {
    add(id);
    setSelected(id);
    focusSoon(`tp-z-${id}-tech`);
  };
  const toggle = (id: string) => {
    if (data.placements[id]) {
      remove(id);
      if (selected === id) setSelected(null);
    } else {
      add(id);
      setSelected(id);
      const z = zones.find((x) => x.id === id);
      if (z && !z.views.includes(view)) setView(z.views[0] ?? "front");
    }
  };

  return (
    <div className="tp-art">
      <div className="tp-art-sketch">
        <div className="tp-seg" role="group" aria-label="Sketch side">
          {(["front", "back"] as const).map((v) => (
            <button key={v} type="button" className="tp-seg-btn" aria-pressed={view === v} onClick={() => setView(v)}>
              {v === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
        <div className="tp-flat-wrap">
          <GarmentFlat
            className="tp-flat"
            garment={data.garment}
            view={view}
            markers={markers}
            selected={selected}
            onZone={onZone}
          />
        </div>
        <p className="hint tp-art-cap">
          {garmentLabel(data) || "Garment"}, {view} view. Tap a dashed zone to add a placement. Left and right are as worn.
        </p>
      </div>

      <div className="tp-art-list">
        <fieldset className="tp-fieldset">
          <legend className="tp-legend">Placements</legend>
          <ul className="tp-zones">
            {zones.map((z) => {
              const p = data.placements[z.id];
              const n = markers.find((m) => m.id === z.id)?.n;
              return (
                <li key={z.id} className="tp-zone-row" data-on={Boolean(p)} data-selected={selected === z.id}>
                  <button
                    type="button"
                    className="tp-zone-btn"
                    aria-pressed={Boolean(p)}
                    onClick={() => toggle(z.id)}
                    onFocus={() => {
                      if (!z.views.includes(view)) setView(z.views[0] ?? "front");
                    }}
                  >
                    <span className="tp-zone-n" aria-hidden="true">
                      {n ?? "+"}
                    </span>
                    <span className="tp-zone-l">{z.label}</span>
                    <span className="tp-zone-v">{z.views.join(" / ")}</span>
                  </button>
                  {p && (
                    <div className="tp-zone-set">
                      <div className="field">
                        <label htmlFor={`tp-z-${z.id}-tech`}>Technique</label>
                        <select
                          id={`tp-z-${z.id}-tech`}
                          className="input"
                          value={p.technique}
                          onChange={(e) => patch(z.id, { technique: e.target.value as TechniqueId | "" })}
                          onFocus={() => setSelected(z.id)}
                        >
                          <option value="">Not sure yet</option>
                          {techniques.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`tp-z-${z.id}-size`}>Approx. size</label>
                        <input
                          id={`tp-z-${z.id}-size`}
                          className="input"
                          type="text"
                          value={p.size}
                          placeholder={z.size}
                          onChange={(e) => patch(z.id, { size: e.target.value })}
                          onFocus={() => setSelected(z.id)}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
        <div className="field">
          <label htmlFor="tp-artwork">
            Artwork description <span className="opt">(optional)</span>
          </label>
          <textarea
            id="tp-artwork"
            className="input tp-textarea"
            rows={3}
            value={data.artworkNotes}
            onChange={(e) => set("artworkNotes", e.target.value)}
            placeholder="e.g. Logo in Pantone 109 C on the chest, flame graphic on the back. Files to follow."
            aria-describedby="tp-artwork-hint"
          />
          <p className="hint" id="tp-artwork-hint">
            You attach the artwork files (AI, PDF or PNG) in WhatsApp or email when you send this.
          </p>
        </div>
      </div>
    </div>
  );
}
