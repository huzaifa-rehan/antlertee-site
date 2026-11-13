import type { ReactNode } from "react";
import type { StepId, TechPack } from "@/content/techpack";
import { GarmentFlat } from "./GarmentFlat";
import {
  activePlacements,
  askSentence,
  colourwayName,
  colourwayTotal,
  fabricLabel,
  fitLabel,
  garmentLabel,
  grandTotal,
  isUnderMoq,
  qty,
  sizeWords,
  trimsList,
  washLabel,
  weightLabel,
} from "./logic";

const SUGGEST = "We will suggest";
const orSuggest = (v: string) => v.trim() || SUGGEST;

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

/** Step 8: a plain-English read-back first, then each part with an Edit link back to its step. */
export function ReviewSummary({ data, onEdit }: { data: TechPack; onEdit: (step: StepId) => void }) {
  const placements = activePlacements(data);
  const total = grandTotal(data);
  const sizes = sizeWords(data);
  const wash = data.wash === "none" ? "No wash" : data.wash === "unsure" ? SUGGEST : washLabel(data);

  return (
    <div className="tp-rv">
      <div className="tp-rv-lead">
        <p className="tp-rv-ask">
          {askSentence(data)} {sizes && `${sizes.charAt(0).toUpperCase()}${sizes.slice(1)}.`}
        </p>
        <p>Anything marked as something we will suggest, we will go through with you before any sampling.</p>
      </div>

      <Block onEdit={onEdit} step="garment" title="Garment">
        <dl className="tp-rv-dl">
          <div>
            <dt>Type</dt>
            <dd>{orSuggest(garmentLabel(data))}</dd>
          </div>
          <div>
            <dt>Name</dt>
            <dd>{data.styleName.trim() || "No name"}</dd>
          </div>
        </dl>
      </Block>

      <Block onEdit={onEdit} step="fit" title="Fit">
        <dl className="tp-rv-dl">
          <div>
            <dt>Looseness</dt>
            <dd>{orSuggest(fitLabel(data))}</dd>
          </div>
          <div>
            <dt>Shoulder</dt>
            <dd>{data.dropShoulder === "yes" ? "Dropped shoulder" : data.dropShoulder === "no" ? "Standard shoulder" : SUGGEST}</dd>
          </div>
          {data.lengthNotes.trim() && (
            <div>
              <dt>Notes</dt>
              <dd>{data.lengthNotes.trim()}</dd>
            </div>
          )}
        </dl>
      </Block>

      <Block onEdit={onEdit} step="fabric" title="Fabric and finish">
        <dl className="tp-rv-dl">
          <div>
            <dt>Fabric</dt>
            <dd>{orSuggest(fabricLabel(data))}</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{data.gsm ? `${weightLabel(data) ? `${weightLabel(data)}, ` : ""}${data.gsm} GSM` : SUGGEST}</dd>
          </div>
          <div>
            <dt>Made of</dt>
            <dd>{orSuggest(data.composition)}</dd>
          </div>
          <div>
            <dt>Wash</dt>
            <dd>{wash}</dd>
          </div>
        </dl>
      </Block>

      <Block onEdit={onEdit} step="colours" title="Colours">
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

      <Block onEdit={onEdit} step="artwork" title="Logos and prints">
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
                    {p.label}: {p.technique || "we will suggest how"}
                    {p.size && <small>{p.size}</small>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="tp-empty">No logos or prints yet. A plain garment, or artwork to follow.</p>
          )}
        </div>
        {data.artworkNotes.trim() && <p className="tp-rv-note">{data.artworkNotes.trim()}</p>}
      </Block>

      <Block onEdit={onEdit} step="sizes" title="Quantity">
        {total === 0 ? (
          <p className="tp-empty">No number yet.</p>
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
                    {t} pcs{isUnderMoq(t) && <em>under our usual minimum</em>}
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

      <Block onEdit={onEdit} step="labels" title="Finishing and timing">
        <dl className="tp-rv-dl">
          <div>
            <dt>Extras</dt>
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
            <dd>{data.deadline || "No fixed date"}</dd>
          </div>
          <div>
            <dt>Market</dt>
            <dd>{data.market.trim() || "Not said"}</dd>
          </div>
        </dl>
      </Block>
    </div>
  );
}
