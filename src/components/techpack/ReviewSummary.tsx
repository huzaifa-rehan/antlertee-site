import type { ReactNode } from "react";
import type { StepId, TechPack } from "@/content/techpack";
import { GarmentFlat } from "./GarmentFlat";
import {
  activePlacements,
  colourwayName,
  colourwayTotal,
  fabricLine,
  fitLine,
  garmentLabel,
  grandTotal,
  isUnderMoq,
  qty,
  trimsList,
  washLabel,
} from "./logic";

const orDash = (v: string) => v.trim() || "Not set";

function Block({ step, title, onEdit, children }: { step: StepId; title: string; onEdit: (step: StepId) => void; children: ReactNode }) {
  return (
    <section className="tp-rv-block">
      <div className="tp-rv-head">
        <h4>{title}</h4>
        <button type="button" className="tp-link" onClick={() => onEdit(step)}>
          Edit<span className="sr-only-focusable"> {title.toLowerCase()}</span>
        </button>
      </div>
      {children}
    </section>
  );
}

/** Step 8: a tidy read-back of every step, each with an Edit link back to it. */
export function ReviewSummary({ data, onEdit }: { data: TechPack; onEdit: (step: StepId) => void }) {
  const placements = activePlacements(data);
  const total = grandTotal(data);

  return (
    <div className="tp-rv">
      <Block onEdit={onEdit} step="garment" title="Garment">
        <dl className="tp-rv-dl">
          <div>
            <dt>Type</dt>
            <dd>{orDash(garmentLabel(data))}</dd>
          </div>
          <div>
            <dt>Style</dt>
            <dd>{orDash(data.styleName)}</dd>
          </div>
          <div>
            <dt>Fit</dt>
            <dd>{orDash([fitLine(data), data.lengthNotes.trim()].filter(Boolean).join("; "))}</dd>
          </div>
          <div>
            <dt>Fabric</dt>
            <dd>{orDash(fabricLine(data))}</dd>
          </div>
          <div>
            <dt>Wash</dt>
            <dd>{washLabel(data)}</dd>
          </div>
        </dl>
      </Block>

      <Block onEdit={onEdit} step="colours" title="Colourways">
        <ul className="tp-rv-cws">
          {data.colourways.map((c, i) => (
            <li key={c.id}>
              <span className="tp-swatch" style={{ background: c.hex }} aria-hidden="true" />
              <span>
                {colourwayName(c, i)}
                <small>{[c.pantone.trim() && `Pantone ${c.pantone.trim()}`, c.hex.toUpperCase()].filter(Boolean).join(" · ")}</small>
              </span>
            </li>
          ))}
        </ul>
      </Block>

      <Block onEdit={onEdit} step="artwork" title="Artwork">
        <div className="tp-rv-art">
          <div className="tp-rv-flats" aria-hidden="true">
            <GarmentFlat className="tp-rv-flat" garment={data.garment} view="front" markers={placements} />
            <GarmentFlat className="tp-rv-flat" garment={data.garment} view="back" markers={placements} />
          </div>
          {placements.length ? (
            <ol className="tp-rv-pl">
              {placements.map((p) => (
                <li key={p.id}>
                  <b aria-hidden="true">{p.n}</b>
                  <span>
                    {p.label}: {p.technique || "technique not chosen"}
                    {p.size && <small>{p.size}</small>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="tp-empty">No placements. A plain garment, or artwork to follow.</p>
          )}
        </div>
        {data.artworkNotes.trim() && <p className="tp-rv-note">{data.artworkNotes.trim()}</p>}
      </Block>

      <Block onEdit={onEdit} step="sizes" title="Sizes and quantities">
        {total === 0 ? (
          <p className="tp-empty">No quantities yet.</p>
        ) : (
          <ul className="tp-rv-qty">
            {data.colourways.map((c, i) => {
              const t = colourwayTotal(data, c.id);
              const parts = data.sizes.filter((s) => qty(data, c.id, s) > 0).map((s) => `${s} ${qty(data, c.id, s)}`);
              return (
                <li key={c.id}>
                  <span>
                    <span className="tp-swatch" style={{ background: c.hex }} aria-hidden="true" /> {colourwayName(c, i)}
                    <small>{parts.join(" · ") || "No quantities"}</small>
                  </span>
                  <strong>
                    {t} pcs{isUnderMoq(t) && <em> under MOQ</em>}
                  </strong>
                </li>
              );
            })}
          </ul>
        )}
        <p className="tp-total">
          <span>Total</span>
          <strong>{total} pcs</strong>
        </p>
      </Block>

      <Block onEdit={onEdit} step="labels" title="Labels, packing and timing">
        <dl className="tp-rv-dl">
          <div>
            <dt>Trims</dt>
            <dd>{trimsList(data).join(", ") || "None"}</dd>
          </div>
          {data.customPackaging && data.packagingNotes.trim() && (
            <div>
              <dt>Packaging</dt>
              <dd>{data.packagingNotes.trim()}</dd>
            </div>
          )}
          <div>
            <dt>Deadline</dt>
            <dd>{orDash(data.deadline)}</dd>
          </div>
          <div>
            <dt>Market</dt>
            <dd>{orDash(data.market)}</dd>
          </div>
        </dl>
      </Block>
    </div>
  );
}
