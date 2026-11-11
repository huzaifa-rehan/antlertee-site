"use client";

import {
  compositionSuggestions,
  fabricTypes,
  fits,
  garmentTypes,
  gsmPresets,
  MAX_COLOURWAYS,
  moqMin,
  neckLabels,
  newColourwayId,
  sizes as allSizes,
  washes,
  type SizeId,
} from "@/content/techpack";
import type { InputHTMLAttributes } from "react";
import { facts } from "@/content/site";
import { Check, Choices, FieldError, type StepProps } from "./fields";
import { colourwayName, colourwayTotal, grandTotal, isUnderMoq, todayIso } from "./logic";

const desc = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

/* 1. Garment type */
export function GarmentStep({ data, set, errors }: StepProps) {
  return (
    <div className="tp-stack">
      <Choices
        legend="What are we making?"
        name="tp-garment"
        idPrefix="tp-garment"
        options={garmentTypes}
        value={data.garment}
        onChange={(v) => set("garment", v)}
        error={errors.garment}
      />
      {data.garment === "other" && (
        <div className="field">
          <label htmlFor="tp-garment-other">What is the garment?</label>
          <input
            id="tp-garment-other"
            className="input"
            type="text"
            value={data.garmentOther}
            onChange={(e) => set("garmentOther", e.target.value)}
            placeholder="e.g. polo, tank top, tracksuit set"
            aria-invalid={errors.garmentOther ? true : undefined}
            aria-describedby={desc(errors.garmentOther && "tp-garment-other-err")}
          />
          <FieldError id="tp-garment-other-err" message={errors.garmentOther} />
        </div>
      )}
      <div className="field">
        <label htmlFor="tp-style">
          Style name <span className="opt">(optional)</span>
        </label>
        <input
          id="tp-style"
          className="input"
          type="text"
          value={data.styleName}
          onChange={(e) => set("styleName", e.target.value)}
          placeholder="e.g. Core heavyweight hoodie"
          aria-describedby="tp-style-hint"
        />
        <p className="hint" id="tp-style-hint">
          Goes at the top of your tech pack.
        </p>
      </div>
    </div>
  );
}

/* 2. Fit and silhouette */
export function FitStep({ data, set }: StepProps) {
  return (
    <div className="tp-stack">
      <Choices legend="Fit" name="tp-fit" idPrefix="tp-fit" options={fits} value={data.fit} onChange={(v) => set("fit", v)} variant="chip" optional />
      <Choices
        legend="Drop shoulder?"
        name="tp-drop"
        idPrefix="tp-drop"
        options={[
          { id: "yes", label: "Yes, drop shoulder" },
          { id: "no", label: "No, set-in shoulder" },
        ]}
        value={data.dropShoulder}
        onChange={(v) => set("dropShoulder", v)}
        variant="chip"
        optional
      />
      <div className="field">
        <label htmlFor="tp-length">
          Length and fit notes <span className="opt">(optional)</span>
        </label>
        <textarea
          id="tp-length"
          className="input tp-textarea"
          rows={3}
          value={data.lengthNotes}
          onChange={(e) => set("lengthNotes", e.target.value)}
          placeholder="e.g. body length 72 cm on size M, cropped 5 cm, wide sleeves, ribbed cuffs"
          aria-describedby="tp-length-hint"
        />
        <p className="hint" id="tp-length-hint">
          Have a size spec or a reference garment? Mention it here and send it with the tech pack.
        </p>
      </div>
    </div>
  );
}

/* 3. Fabric and wash */
export function FabricStep({ data, set, errors }: StepProps) {
  return (
    <div className="tp-stack">
      <Choices
        legend="Fabric type"
        name="tp-fabric"
        idPrefix="tp-fabric"
        options={fabricTypes}
        value={data.fabricType}
        onChange={(v) => set("fabricType", v)}
        optional
      />
      <div className="tp-two">
        <div className="field">
          <label htmlFor="tp-composition">
            Composition <span className="opt">(optional)</span>
          </label>
          <input
            id="tp-composition"
            className="input"
            type="text"
            list="tp-composition-list"
            value={data.composition}
            onChange={(e) => set("composition", e.target.value)}
            placeholder="e.g. 100% cotton"
            autoComplete="off"
          />
          <datalist id="tp-composition-list">
            {compositionSuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <fieldset className="tp-fieldset" aria-describedby={desc("tp-gsm-hint", errors.gsm && "tp-gsm-err")}>
          <legend className="tp-legend">
            Weight (GSM) <span className="opt">(optional)</span>
          </legend>
          <div className="tp-chips">
            {gsmPresets.map((g) => (
              <label key={g} className="tp-chip">
                <input type="radio" name="tp-gsm-preset" value={g} checked={data.gsm === g} onChange={() => set("gsm", g)} />
                <span className="tp-card-t">{g === "450" ? "450+" : g}</span>
              </label>
            ))}
          </div>
          <div className="tp-inline">
            <label htmlFor="tp-gsm">Or type it</label>
            <input
              id="tp-gsm"
              className="input tp-gsm-input"
              type="text"
              inputMode="numeric"
              value={data.gsm}
              onChange={(e) => set("gsm", e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              placeholder="e.g. 320"
              aria-invalid={errors.gsm ? true : undefined}
              aria-describedby={desc("tp-gsm-hint", errors.gsm && "tp-gsm-err")}
            />
            <span aria-hidden="true">GSM</span>
          </div>
          <p className="hint" id="tp-gsm-hint">
            Not sure? Leave it blank and we will suggest a weight for the garment.
          </p>
          <FieldError id="tp-gsm-err" message={errors.gsm} />
        </fieldset>
      </div>
      <Choices legend="Wash" name="tp-wash" idPrefix="tp-wash" options={washes} value={data.wash} onChange={(v) => set("wash", v)} variant="chip" />
    </div>
  );
}

/* 4. Colourways */
export function ColoursStep({ data, update }: StepProps) {
  const setCw = (id: string, patch: Partial<{ name: string; hex: string; pantone: string }>) =>
    update((d) => ({ ...d, colourways: d.colourways.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const remove = (id: string) =>
    update((d) => {
      const quantities = { ...d.quantities };
      delete quantities[id];
      return { ...d, colourways: d.colourways.filter((c) => c.id !== id), quantities };
    });
  const add = () =>
    update((d) =>
      d.colourways.length >= MAX_COLOURWAYS ? d : { ...d, colourways: [...d.colourways, { id: newColourwayId(), name: "", hex: "#e9e5de", pantone: "" }] },
    );
  const full = data.colourways.length >= MAX_COLOURWAYS;

  return (
    <div className="tp-stack">
      <p className="tp-lead">
        Up to {MAX_COLOURWAYS} colourways. Pick a colour to show us roughly, and add the Pantone code if you have one; we match the
        Pantone for dye and print.
      </p>
      <ol className="tp-cws">
        {data.colourways.map((c, i) => (
          <li key={c.id} className="tp-cw">
            <fieldset className="tp-fieldset">
              <legend className="tp-legend">
                <span className="tp-swatch" style={{ background: c.hex }} aria-hidden="true" /> Colourway {i + 1}
              </legend>
              <div className="tp-cw-grid">
                <div className="field">
                  <label htmlFor={`tp-cw-${c.id}-name`}>Name</label>
                  <input
                    id={`tp-cw-${c.id}-name`}
                    className="input"
                    type="text"
                    value={c.name}
                    onChange={(e) => setCw(c.id, { name: e.target.value })}
                    placeholder={i === 0 ? "e.g. Washed black" : "e.g. Bone"}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`tp-cw-${c.id}-hex`}>Colour</label>
                  <span className="tp-colour">
                    <input id={`tp-cw-${c.id}-hex`} type="color" value={c.hex} onChange={(e) => setCw(c.id, { hex: e.target.value })} />
                    <span aria-hidden="true">{c.hex.toUpperCase()}</span>
                  </span>
                </div>
                <div className="field">
                  <label htmlFor={`tp-cw-${c.id}-pantone`}>
                    Pantone <span className="opt">(optional)</span>
                  </label>
                  <input
                    id={`tp-cw-${c.id}-pantone`}
                    className="input"
                    type="text"
                    value={c.pantone}
                    onChange={(e) => setCw(c.id, { pantone: e.target.value })}
                    placeholder="e.g. 19-4005 TCX"
                    autoComplete="off"
                  />
                </div>
              </div>
              {data.colourways.length > 1 && (
                <button type="button" className="tp-link" onClick={() => remove(c.id)}>
                  Remove {colourwayName(c, i)}
                </button>
              )}
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="tp-inline">
        <button type="button" className="pill" onClick={add} disabled={full} aria-describedby={full ? "tp-cw-full" : undefined}>
          + Add a colourway
        </button>
        {full && (
          <p className="hint" id="tp-cw-full">
            That is the maximum of {MAX_COLOURWAYS}. Need more? Add a note at the end.
          </p>
        )}
      </div>
    </div>
  );
}

/* 6. Sizes and quantities */
export function SizesStep({ data, set, update, errors }: StepProps) {
  const toggleSize = (s: SizeId) =>
    set(
      "sizes",
      data.sizes.includes(s) ? data.sizes.filter((x) => x !== s) : allSizes.filter((x) => x === s || data.sizes.includes(x)),
    );
  const setQty = (cw: string, s: SizeId, v: string) =>
    update((d) => ({ ...d, quantities: { ...d.quantities, [cw]: { ...d.quantities[cw], [s]: v.replace(/[^\d]/g, "").slice(0, 6) } } }));
  const total = grandTotal(data);

  return (
    <div className="tp-stack">
      <fieldset className="tp-fieldset">
        <legend className="tp-legend">Size range</legend>
        <div className="tp-chips">
          {allSizes.map((s) => (
            <label key={s} className="tp-chip">
              <input type="checkbox" checked={data.sizes.includes(s)} onChange={() => toggleSize(s)} />
              <span className="tp-card-t">{s}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {data.sizes.length === 0 ? (
        <p className="tp-empty">Choose at least one size to enter quantities.</p>
      ) : (
        <div className="tp-qty" aria-describedby={errors.quantities ? "tp-qty-err" : undefined}>
          {data.colourways.map((c, i) => {
            const t = colourwayTotal(data, c.id);
            const under = isUnderMoq(t);
            return (
              <fieldset key={c.id} className="tp-qty-row" aria-describedby={under ? `tp-qty-${c.id}-moq` : undefined}>
                <legend className="tp-legend">
                  <span className="tp-swatch" style={{ background: c.hex }} aria-hidden="true" /> {colourwayName(c, i)}
                  <span className="tp-qty-total" aria-live="polite">
                    {t} pcs
                  </span>
                </legend>
                <div className="tp-qty-grid">
                  {data.sizes.map((s, k) => (
                    <div key={s} className="tp-qty-cell">
                      <label htmlFor={i === 0 && k === 0 ? "tp-qty-first" : `tp-qty-${c.id}-${s}`}>
                        {s}
                        <span className="sr-only-focusable">, {colourwayName(c, i)}</span>
                      </label>
                      <input
                        id={i === 0 && k === 0 ? "tp-qty-first" : `tp-qty-${c.id}-${s}`}
                        className="input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="0"
                        value={data.quantities[c.id]?.[s] ?? ""}
                        onChange={(e) => setQty(c.id, s, e.target.value)}
                        aria-invalid={errors.quantities ? true : undefined}
                      />
                    </div>
                  ))}
                </div>
                {under && (
                  <p className="tp-note" id={`tp-qty-${c.id}-moq`}>
                    This colourway is under our standard MOQ of {facts.moqLong}. Send it anyway and we will tell you what is possible.
                  </p>
                )}
              </fieldset>
            );
          })}
        </div>
      )}
      <FieldError id="tp-qty-err" message={errors.quantities} />
      <p className="tp-total">
        <span>Total</span>
        <strong aria-live="polite">{total} pcs</strong>
      </p>
      {moqMin > 0 && (
        <p className="hint">
          Standard MOQ is {facts.moqLong}. Quantities can change after sampling.
        </p>
      )}
    </div>
  );
}

/* 7. Labels, trims, packing, deadline */
export function LabelsStep({ data, set, errors }: StepProps) {
  return (
    <div className="tp-stack">
      <Choices
        legend="Neck label"
        name="tp-neck"
        idPrefix="tp-neck"
        options={neckLabels}
        value={data.neckLabel}
        onChange={(v) => set("neckLabel", v)}
        variant="chip"
        optional
      />
      <fieldset className="tp-fieldset">
        <legend className="tp-legend">Trims and packing</legend>
        <div className="tp-checks">
          <Check id="tp-care" label="Care label" checked={data.careLabel} onChange={(v) => set("careLabel", v)} hint="Wash care and composition" />
          <Check id="tp-hang" label="Hang tag" checked={data.hangTag} onChange={(v) => set("hangTag", v)} hint="Branded swing tag" />
          <Check id="tp-poly" label="Polybag" checked={data.polybag} onChange={(v) => set("polybag", v)} hint="Each piece bagged" />
          <Check id="tp-pack" label="Custom packaging" checked={data.customPackaging} onChange={(v) => set("customPackaging", v)} hint="Boxes, mailers, stickers" />
        </div>
      </fieldset>
      {data.customPackaging && (
        <div className="field">
          <label htmlFor="tp-pack-notes">
            Packaging notes <span className="opt">(optional)</span>
          </label>
          <input
            id="tp-pack-notes"
            className="input"
            type="text"
            value={data.packagingNotes}
            onChange={(e) => set("packagingNotes", e.target.value)}
            placeholder="e.g. printed mailer box, tissue, sticker seal"
          />
        </div>
      )}
      <div className="tp-two">
        <div className="field">
          <label htmlFor="tp-deadline">
            Deadline <span className="opt">(optional)</span>
          </label>
          <input
            id="tp-deadline"
            className="input"
            type="date"
            min={todayIso()}
            value={data.deadline}
            onChange={(e) => set("deadline", e.target.value)}
            aria-invalid={errors.deadline ? true : undefined}
            aria-describedby={desc("tp-deadline-hint", errors.deadline && "tp-deadline-err")}
          />
          <p className="hint" id="tp-deadline-hint">
            When you need the goods. Typical turnaround is {facts.turnaround}.
          </p>
          <FieldError id="tp-deadline-err" message={errors.deadline} />
        </div>
        <div className="field">
          <label htmlFor="tp-market">
            Target market <span className="opt">(optional)</span>
          </label>
          <input
            id="tp-market"
            className="input"
            type="text"
            list="tp-market-list"
            value={data.market}
            onChange={(e) => set("market", e.target.value)}
            placeholder="Where it sells or ships"
            autoComplete="off"
          />
          <datalist id="tp-market-list">
            {[...facts.exportMarkets, "Pakistan"].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}

/* 8. Contact fields (shown on the review step) */
export function ContactFields({ data, set, errors }: StepProps) {
  const input = (key: "name" | "brand" | "email" | "whatsapp", label: string, props: InputHTMLAttributes<HTMLInputElement>, opt?: boolean) => (
    <div className="field">
      <label htmlFor={`tp-${key}`}>
        {label} {opt && <span className="opt">(optional)</span>}
      </label>
      <input
        id={`tp-${key}`}
        className="input"
        value={data[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={desc(key === "email" && "tp-email-hint", errors[key] && `tp-${key}-err`)}
        {...props}
      />
      {key === "email" && (
        <p className="hint" id="tp-email-hint">
          Email or WhatsApp: at least one, so we can reply.
        </p>
      )}
      <FieldError id={`tp-${key}-err`} message={errors[key]} />
    </div>
  );
  return (
    <fieldset className="tp-fieldset">
      <legend className="tp-legend tp-legend-lg">Your details</legend>
      <div className="form-grid">
        {input("name", "Your name", { type: "text", autoComplete: "name" })}
        {input("brand", "Brand name", { type: "text", autoComplete: "organization" }, true)}
        {input("email", "Email", { type: "email", autoComplete: "email", inputMode: "email" })}
        {input("whatsapp", "WhatsApp number", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "+44 7700 900123" })}
        <div className="field full">
          <label htmlFor="tp-notes">
            Anything else? <span className="opt">(optional)</span>
          </label>
          <textarea
            id="tp-notes"
            className="input tp-textarea"
            rows={3}
            value={data.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Sampling first, references, target price, questions"
          />
        </div>
      </div>
    </fieldset>
  );
}
