"use client";

import { useState } from "react";
import type { TechPack } from "@/content/techpack";
import { GarmentFlat } from "./GarmentFlat";
import { colourwayName, fitLabel, garmentLabel, washLabel } from "./logic";

/** The garment drawing in the visitor's own colour, beside the questions. Updates as they answer. */
export function LivePreview({ data }: { data: TechPack }) {
  const [picked, setPicked] = useState(0);
  const index = Math.min(picked, data.colourways.length - 1);
  const cw = data.colourways[index];
  const garment = garmentLabel(data);
  const caption = garment
    ? [fitLabel(data), garment]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .replace(/^./, (c) => c.toUpperCase())
    : "";
  const wash = data.wash !== "none" && data.wash !== "unsure" ? washLabel(data).toLowerCase() : "";

  return (
    <aside className="tp-preview" aria-label="Live preview" data-empty={garment ? undefined : "true"}>
      <GarmentFlat
        className="tp-preview-flat"
        garment={data.garment}
        view="front"
        markers={[]}
        bare
        fill={cw?.hex}
        title={caption ? `${caption}, drawn in ${cw ? colourwayName(cw, index).toLowerCase() : "your colour"}` : "Garment drawing"}
      />
      <div className="tp-preview-text">
        <p className="tp-preview-cap">{caption || "Your garment shows up here"}</p>
        <p className="tp-preview-sub">
          {garment
            ? [cw ? colourwayName(cw, index) : "", wash].filter(Boolean).join(", ")
            : "Pick a style and the drawing follows your choices."}
        </p>
        {data.colourways.length > 1 && (
          <div className="tp-preview-dots" role="group" aria-label="Show colour">
            {data.colourways.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="tp-preview-dot"
                style={{ background: c.hex }}
                aria-label={colourwayName(c, i)}
                aria-pressed={i === index}
                onClick={() => setPicked(i)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
