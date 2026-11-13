"use client";

import { createPortal } from "react-dom";
import { brand, contact } from "@/content/site";
import type { TechPack } from "@/content/techpack";
import { GarmentFlat } from "./GarmentFlat";
import {
  activePlacements,
  colourwayName,
  colourwayTotal,
  fabricLabel,
  fitLabel,
  garmentLabel,
  grandTotal,
  qty,
  trimsList,
  washLabel,
} from "./logic";

const dash = (v: string) => v.trim() || "–";

/**
 * The printable tech pack. It is rendered straight into <body>, hidden on screen, and shown on its own
 * when the builder adds `tp-printing` to <html> and opens the print dialog (globals.css, "tech pack print").
 */
export function TechPackSheet({ data, printedOn }: { data: TechPack; printedOn: string }) {
  if (typeof document === "undefined") return null;
  const placements = activePlacements(data);
  const total = grandTotal(data);
  const specs: [string, string][] = [
    ["Garment", garmentLabel(data)],
    ["Fit", [fitLabel(data), data.dropShoulder === "yes" ? "drop shoulder" : data.dropShoulder === "no" ? "set-in shoulder" : ""].filter(Boolean).join(", ")],
    ["Length / fit notes", data.lengthNotes],
    ["Fabric type", fabricLabel(data)],
    ["Composition", data.composition],
    ["Weight", data.gsm ? `${data.gsm} GSM` : ""],
    ["Wash", data.wash === "none" ? "No wash" : washLabel(data)],
  ];
  const title = data.styleName.trim() || garmentLabel(data) || "Tech pack";

  return createPortal(
    <div className="tp-print-root">
      <article className="tp-sheet" aria-label="Tech pack">
        <header className="tp-sh-head">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export; printed logo */}
          <img src="/brand/logo-full-ink.png" alt={brand.name} width={520} height={1012} className="tp-sh-logo" />
          <div className="tp-sh-title">
            <p className="tp-sh-k">Tech pack</p>
            <h1>
              {title}
              <span className="tp-sh-dot">.</span>
            </h1>
            <p>
              {garmentLabel(data)}
              {data.brand.trim() ? ` for ${data.brand.trim()}` : ""}
            </p>
          </div>
          <dl className="tp-sh-meta">
            <div>
              <dt>Date</dt>
              <dd>{printedOn}</dd>
            </div>
            <div>
              <dt>Brand</dt>
              <dd>{dash(data.brand)}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>{[data.name, data.email, data.whatsapp].map((s) => s.trim()).filter(Boolean).join(" · ") || "–"}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{total} pcs</dd>
            </div>
          </dl>
        </header>

        <section className="tp-sh-art">
          <div className="tp-sh-flats">
            {(["front", "back"] as const).map((v) => (
              <figure key={v}>
                <GarmentFlat
                  className="tp-sh-flat"
                  garment={data.garment}
                  view={v}
                  markers={placements}
                  title={`${garmentLabel(data)}, ${v} view, with placements marked`}
                />
                <figcaption>{v === "front" ? "Front" : "Back"}</figcaption>
              </figure>
            ))}
          </div>
          <div>
            <h2>Artwork placements</h2>
            {placements.length ? (
              <table className="tp-sh-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Zone</th>
                    <th scope="col">Technique</th>
                    <th scope="col">Approx. size</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="tp-sh-pin">{p.n}</span>
                      </td>
                      <td>{p.label}</td>
                      <td>{p.technique || "TBC"}</td>
                      <td>{p.size || "TBC"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="tp-sh-muted">No placements yet: plain garment, or artwork to follow.</p>
            )}
            {data.artworkNotes.trim() && <p className="tp-sh-note">{data.artworkNotes.trim()}</p>}
          </div>
        </section>

        <div className="tp-sh-cols">
          <section>
            <h2>Specifications</h2>
            <table className="tp-sh-table tp-sh-kv">
              <tbody>
                {specs.map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{dash(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h2>Colourways</h2>
            <ul className="tp-sh-cws">
              {data.colourways.map((c, i) => (
                <li key={c.id}>
                  <span className="tp-sh-sw" style={{ background: c.hex }} />
                  <span>
                    <strong>{colourwayName(c, i)}</strong>
                    <small>
                      {c.pantone.trim() ? `Pantone ${c.pantone.trim()} · ` : ""}
                      {c.hex.toUpperCase()}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
            <h2>Labels, trims and packing</h2>
            <table className="tp-sh-table tp-sh-kv">
              <tbody>
                <tr>
                  <th scope="row">Trims</th>
                  <td>{trimsList(data).join(", ") || "–"}</td>
                </tr>
                {data.customPackaging && data.packagingNotes.trim() && (
                  <tr>
                    <th scope="row">Packaging</th>
                    <td>{data.packagingNotes.trim()}</td>
                  </tr>
                )}
                <tr>
                  <th scope="row">Deadline</th>
                  <td>{dash(data.deadline)}</td>
                </tr>
                <tr>
                  <th scope="row">Market</th>
                  <td>{dash(data.market)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <section className="tp-sh-qty">
          <h2>Sizes and quantities</h2>
          <table className="tp-sh-table tp-sh-grid">
            <thead>
              <tr>
                <th scope="col">Colourway</th>
                {data.sizes.map((s) => (
                  <th key={s} scope="col">
                    {s}
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.colourways.map((c, i) => (
                <tr key={c.id}>
                  <th scope="row">
                    <span className="tp-sh-sw sm" style={{ background: c.hex }} /> {colourwayName(c, i)}
                  </th>
                  {data.sizes.map((s) => (
                    <td key={s}>{qty(data, c.id, s) || "–"}</td>
                  ))}
                  <td>
                    <strong>{colourwayTotal(data, c.id)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                {data.sizes.map((s) => (
                  <td key={s}>{data.colourways.reduce((sum, c) => sum + qty(data, c.id, s), 0) || "–"}</td>
                ))}
                <td>
                  <strong>{total}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {data.notes.trim() && (
          <section className="tp-sh-notes">
            <h2>Notes</h2>
            <p>{data.notes.trim()}</p>
          </section>
        )}

        <footer className="tp-sh-foot">
          <span>
            {brand.name} · {brand.city}, {brand.country}
          </span>
          <span>
            WhatsApp {contact.whatsappDisplay} · {contact.email}
          </span>
        </footer>
      </article>
    </div>,
    document.body,
  );
}
