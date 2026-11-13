"use client";

import { useState, type InputHTMLAttributes } from "react";
import {
  colourPresets,
  compositionSuggestions,
  fabricTypes,
  fits,
  garmentTypes,
  isBottom,
  MAX_COLOURWAYS,
  moqMin,
  neckLabels,
  newColourwayId,
  sizeRanges,
  sizes as allSizes,
  startingPoints,
  washes,
  weights,
  type SizeId,
  type StartingPoint,
} from "@/content/techpack";
import { facts } from "@/content/site";
import { Check, Choices, FieldError, Help, Optional, Required, type StepProps } from "./fields";
import {
  colourwayName,
  colourwayTotal,
  fabricLabel,
  fitLabel,
  grandTotal,
  isEvenSplit,
  isUnderMoq,
  rebalance,
  todayIso,
  washLabel,
  weightLabel,
  withEvenSplit,
} from "./logic";

const desc = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

/* 1. Start: a popular starting point, or the garment type from scratch */
export function GarmentStep({ data, set, update, errors }: StepProps) {
  const chosen = startingPoints.find((p) => p.id === data.preset);
  const apply = (id: string) => {
    const sp: StartingPoint | undefined = startingPoints.find((p) => p.id === id);
    if (!sp) return;
    update((d) => ({
      ...d,
      preset: sp.id,
      garment: sp.garment,
      fit: sp.fit,
      dropShoulder: sp.dropShoulder,
      fabricType: sp.fabricType,
      gsm: sp.gsm,
      wash: sp.wash,
    }));
  };

  return (
    <div className="tp-stack">
      <div className="tp-stack tp-stack-tight">
        <Choices
          legend="Start from a popular style"
          name="tp-preset"
          idPrefix="tp-preset"
          options={startingPoints}
          value={data.preset}
          onChange={(v) => v && apply(v)}
          hint="It fills in the fit and fabric for you. You can change anything on the next steps."
        />
        {chosen && (
          <p className="tp-note" role="status">
            Filled in for you: {[chosen.fit && `${fitLabel(data).toLowerCase()} fit`, fabricLabel(data).toLowerCase(), weightLabel(data) && `${weightLabel(data).toLowerCase()} weight`, data.wash !== "none" && data.wash !== "unsure" && washLabel(data).toLowerCase()].filter(Boolean).join(", ")}.
            Change any of it later.
          </p>
        )}
      </div>

      <Choices
        legend={
          <>
            Or start from scratch: what are we making? <Required />
          </>
        }
        name="tp-garment"
        idPrefix="tp-garment"
        options={garmentTypes}
        value={data.garment}
        onChange={(v) => update((d) => ({ ...d, garment: v, preset: v === d.garment ? d.preset : "" }))}
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
            enterKeyHint="next"
            aria-invalid={errors.garmentOther ? true : undefined}
            aria-describedby={desc(errors.garmentOther && "tp-garment-other-err")}
          />
          <FieldError id="tp-garment-other-err" message={errors.garmentOther} />
        </div>
      )}
      <div className="field">
        <label htmlFor="tp-style">
          Give it a name <Optional />
        </label>
        <input
          id="tp-style"
          className="input"
          type="text"
          value={data.styleName}
          onChange={(e) => set("styleName", e.target.value)}
          placeholder="e.g. Core heavyweight hoodie"
          enterKeyHint="next"
          aria-describedby="tp-style-hint"
        />
        <p className="hint" id="tp-style-hint">
          Just so we can find it later. It goes at the top of your tech pack.
        </p>
      </div>
    </div>
  );
}

/* 2. Fit */
export function FitStep({ data, set }: StepProps) {
  const bottom = isBottom(data.garment);
  return (
    <div className="tp-stack">
      <Choices
        legend="How loose should it be?"
        name="tp-fit"
        idPrefix="tp-fit"
        options={fits.filter((f) => !(bottom && f.topsOnly))}
        value={data.fit}
        onChange={(v) => set("fit", v)}
        optional
        notSure
      />
      {!bottom && (
        <Choices
          legend="Where does the shoulder seam sit?"
          name="tp-drop"
          idPrefix="tp-drop"
          options={[
            { id: "yes", label: "Dropped shoulder", hint: "The seam sits down the arm. A relaxed look." },
            { id: "no", label: "Standard shoulder", hint: "The seam sits at the top of the arm. A neat look." },
          ]}
          value={data.dropShoulder}
          onChange={(v) => set("dropShoulder", v)}
          optional
          notSure
        />
      )}
      <div className="field">
        <label htmlFor="tp-length">
          Anything about length or sleeves? <Optional />
        </label>
        <textarea
          id="tp-length"
          className="input tp-textarea"
          rows={3}
          value={data.lengthNotes}
          onChange={(e) => set("lengthNotes", e.target.value)}
          placeholder="e.g. a bit cropped, wide sleeves, ribbed cuffs"
          aria-describedby="tp-length-hint"
        />
        <p className="hint" id="tp-length-hint">
          Have a garment that fits you well? Say so. You can send us a photo or its measurements and we will copy it.
        </p>
      </div>
    </div>
  );
}

/* 3. Fabric and wash */
export function FabricStep({ data, set }: StepProps) {
  const customWeight = data.gsm !== "" && !weights.some((w) => w.gsm === data.gsm);
  return (
    <div className="tp-stack">
      <Choices
        legend="What kind of fabric?"
        name="tp-fabric"
        idPrefix="tp-fabric"
        options={fabricTypes}
        value={data.fabricType}
        onChange={(v) => set("fabricType", v)}
        optional
        notSure
      />

      <div className="tp-stack tp-stack-tight">
        <Choices
          legend="How heavy should it feel?"
          name="tp-weight"
          idPrefix="tp-weight"
          options={weights.map((w) => ({ id: w.gsm, label: w.label, hint: w.hint }))}
          value={data.gsm}
          onChange={(v) => set("gsm", v)}
          optional
          notSure
        />
        <Help summary="What is GSM?">
          <p>
            GSM means grams per square metre. It is a number for how heavy a fabric is. A higher number is thicker and warmer. Light
            tees are around 180, heavyweight hoodies are 450 or more. If you do not know, pick a feel above or leave it as it is.
          </p>
        </Help>
        <div className="tp-inline">
          <label htmlFor="tp-gsm">Know the exact weight? Type it</label>
          <input
            id="tp-gsm"
            className="input tp-gsm-input"
            type="text"
            inputMode="numeric"
            value={customWeight ? data.gsm : ""}
            onChange={(e) => set("gsm", e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
            placeholder="e.g. 300"
            enterKeyHint="next"
          />
          <span aria-hidden="true">GSM</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="tp-composition">
          What is it made of? <Optional />
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
          enterKeyHint="next"
          aria-describedby="tp-composition-hint"
        />
        <datalist id="tp-composition-list">
          {compositionSuggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="tp-chips" role="group" aria-label="Common choices">
          {compositionSuggestions.map((c) => (
            <button
              key={c}
              type="button"
              className="tp-chip tp-chip-btn"
              aria-pressed={data.composition === c}
              onClick={() => set("composition", data.composition === c ? "" : c)}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="hint" id="tp-composition-hint">
          Not sure? Leave it empty and we will suggest one for this garment.
        </p>
      </div>

      <div className="tp-stack tp-stack-tight">
        <Choices
          legend="Do you want a wash?"
          name="tp-wash"
          idPrefix="tp-wash"
          options={washes}
          value={data.wash}
          onChange={(v) => v && set("wash", v)}
          optional
        />
        <Help summary="What is a wash?">
          <p>
            A wash is a treatment after sewing that fades, softens or ages the garment so it looks lived in. Choose no wash for a clean,
            plain finish. Not sure? Pick not sure and we will show you options.
          </p>
        </Help>
      </div>
    </div>
  );
}

/* 4. Colours */
export function ColoursStep({ data, update }: StepProps) {
  const setCw = (id: string, patch: Partial<{ name: string; hex: string; pantone: string }>) =>
    update((d) => ({ ...d, colourways: d.colourways.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const remove = (id: string) =>
    update((d) => {
      const quantities = { ...d.quantities };
      delete quantities[id];
      return rebalance(d, { ...d, colourways: d.colourways.filter((c) => c.id !== id), quantities });
    });
  const add = () =>
    update((d) =>
      d.colourways.length >= MAX_COLOURWAYS
        ? d
        : rebalance(d, { ...d, colourways: [...d.colourways, { id: newColourwayId(), name: "", hex: "#e9e5de", pantone: "" }] }),
    );
  const pickPreset = (id: string, name: string, hex: string) => {
    const known = colourPresets.some((p) => p.name === data.colourways.find((c) => c.id === id)?.name);
    const current = data.colourways.find((c) => c.id === id);
    setCw(id, { hex, name: !current?.name.trim() || known ? name : current.name });
  };
  const full = data.colourways.length >= MAX_COLOURWAYS;
  const washed = data.wash !== "none" && data.wash !== "unsure";

  return (
    <div className="tp-stack">
      <p className="tp-lead">
        Tap a colour, or use the colour picker for any shade. {washed && "You chose a wash, so pick the colour before it is washed. The wash fades it."}
      </p>
      <ol className="tp-cws">
        {data.colourways.map((c, i) => (
          <li key={c.id} className="tp-cw">
            <fieldset className="tp-fieldset">
              <legend className="tp-legend">
                <span className="tp-swatch" style={{ background: c.hex }} aria-hidden="true" /> Colour {i + 1}
              </legend>
              <div className="tp-swatches" role="group" aria-label={`Quick colours for colour ${i + 1}`}>
                {colourPresets.map((p) => {
                  const on = c.hex.toLowerCase() === p.hex.toLowerCase();
                  return (
                    <button
                      key={p.name}
                      type="button"
                      className="tp-sw"
                      style={{ background: p.hex }}
                      aria-label={p.name}
                      title={p.name}
                      aria-pressed={on}
                      onClick={() => pickPreset(c.id, p.name, p.hex)}
                    >
                      {on && (
                        <svg viewBox="0 0 12 10" aria-hidden="true">
                          <path d="M1 5l3.5 3.5L11 1.5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="tp-cw-grid">
                <div className="field">
                  <label htmlFor={`tp-cw-${c.id}-name`}>
                    Colour name <Optional />
                  </label>
                  <input
                    id={`tp-cw-${c.id}-name`}
                    className="input"
                    type="text"
                    value={c.name}
                    onChange={(e) => setCw(c.id, { name: e.target.value })}
                    placeholder={i === 0 ? "e.g. Washed black" : "e.g. Bone"}
                    enterKeyHint="next"
                  />
                </div>
                <div className="field">
                  <label htmlFor={`tp-cw-${c.id}-hex`}>Or pick any colour</label>
                  <span className="tp-colour">
                    <input id={`tp-cw-${c.id}-hex`} type="color" value={c.hex} onChange={(e) => setCw(c.id, { hex: e.target.value })} />
                    <span aria-hidden="true">{c.hex.toUpperCase()}</span>
                  </span>
                </div>
              </div>
              <Help summary="Have a colour code? Pantone">
                <p>
                  A Pantone code is a number that names an exact colour, like 19-4005 TCX. It is optional. If you do not have one, just
                  pick a colour above and we match it from there, or from a photo you send us.
                </p>
                <div className="field">
                  <label htmlFor={`tp-cw-${c.id}-pantone`}>
                    Pantone code <Optional />
                  </label>
                  <input
                    id={`tp-cw-${c.id}-pantone`}
                    className="input"
                    type="text"
                    value={c.pantone}
                    onChange={(e) => setCw(c.id, { pantone: e.target.value })}
                    placeholder="e.g. 19-4005 TCX"
                    autoComplete="off"
                    enterKeyHint="next"
                  />
                </div>
              </Help>
              {data.colourways.length > 1 && (
                <button type="button" className="tp-link" onClick={() => remove(c.id)}>
                  Remove {colourwayName(c, i).toLowerCase()}
                </button>
              )}
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="tp-inline">
        <button type="button" className="pill" onClick={add} disabled={full} aria-describedby="tp-cw-hint">
          + Add another colour
        </button>
        <p className="hint" id="tp-cw-hint">
          {full
            ? `That is the most we can take here, ${MAX_COLOURWAYS} colours. Need more? Add a note on the last step.`
            : "Only if you want the same garment in more than one colour."}
        </p>
      </div>
    </div>
  );
}

/* 6. How many: one rough total, split across sizes for you */
export function SizesStep({ data, update, errors }: StepProps) {
  const total = grandTotal(data);
  const even = isEvenSplit(data);
  const [gridOpen, setGridOpen] = useState(total > 0 && !even);
  const colours = data.colourways.length;
  const sizeCount = data.sizes.length;

  const setTotal = (raw: string) => {
    const n = Number.parseInt(raw.replace(/[^\d]/g, "").slice(0, 6), 10);
    update((d) => withEvenSplit(d, Number.isFinite(n) ? n : 0));
  };
  const chooseSizes = (next: SizeId[]) =>
    update((d) => rebalance(d, { ...d, sizes: allSizes.filter((s) => next.includes(s)) }));
  const toggleSize = (s: SizeId) =>
    chooseSizes(data.sizes.includes(s) ? data.sizes.filter((x) => x !== s) : [...data.sizes, s]);
  const setQty = (cw: string, s: SizeId, v: string) =>
    update((d) => ({ ...d, quantities: { ...d.quantities, [cw]: { ...d.quantities[cw], [s]: v.replace(/[^\d]/g, "").slice(0, 6) } } }));

  const under = data.colourways.map((c, i) => ({ c, i, t: colourwayTotal(data, c.id) })).filter((x) => isUnderMoq(x.t));
  const per = sizeCount > 0 && total > 0 ? Math.round(total / (colours * sizeCount)) : 0;

  return (
    <div className="tp-stack">
      <div className="field tp-total-field">
        <label htmlFor="tp-qty-total" className="tp-big-label">
          How many pieces in total? <Required />
        </label>
        <input
          id="tp-qty-total"
          className="input tp-big-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 300"
          enterKeyHint="next"
          value={total > 0 ? String(total) : ""}
          onChange={(e) => setTotal(e.target.value)}
          aria-invalid={errors.quantities ? true : undefined}
          aria-describedby={desc("tp-qty-hint", errors.quantities && "tp-qty-err")}
        />
        <p className="hint" id="tp-qty-hint">
          A rough number is fine. It can change after sampling. A sample is one test piece we make for you to check first.
          {moqMin > 0 && ` Our usual minimum is ${facts.moqLong}.`}
        </p>
        <FieldError id="tp-qty-err" message={errors.quantities} />
      </div>

      <div aria-live="polite">
        {under.length > 0 && (
          <p className="tp-note">
            {colours === 1 ? "That is" : `${under.map((u) => colourwayName(u.c, u.i)).join(", ")} ${under.length === 1 ? "is" : "are"}`} under our usual
            minimum of {facts.moqLong}. You can still send it. We will tell you what is possible.
          </p>
        )}
      </div>

      <fieldset className="tp-fieldset">
        <legend className="tp-legend">
          Which sizes? <Optional />
        </legend>
        <div className="tp-chips" role="group" aria-label="Size ranges">
          {sizeRanges.map((r) => {
            const on = r.sizes.length === data.sizes.length && r.sizes.every((s, k) => s === data.sizes[k]);
            return (
              <button key={r.id} type="button" className="tp-chip tp-chip-btn" aria-pressed={on} onClick={() => chooseSizes(r.sizes)}>
                {r.label}
              </button>
            );
          })}
        </div>
        <p className="hint" style={{ margin: "10px 0 8px" }}>
          Not sure? Keep S to XL. We will suggest a split that fits your customers.
        </p>
        <div className="tp-chips" role="group" aria-label="Pick sizes one by one">
          {allSizes.map((s) => (
            <label key={s} className="tp-chip tp-chip-sm">
              <input type="checkbox" checked={data.sizes.includes(s)} onChange={() => toggleSize(s)} />
              <span className="tp-card-t">{s}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {data.sizes.length === 0 ? (
        <p className="tp-empty">Choose at least one size so we can split your pieces.</p>
      ) : (
        <div className="tp-stack tp-stack-tight">
          <p className="tp-total">
            <span>Total</span>
            <strong aria-live="polite">{total} pcs</strong>
          </p>
          {total > 0 && even && (
            <p className="hint tp-split-note">
              Split evenly: about {per} of each size{colours > 1 ? `, in each of your ${colours} colours` : ""}.
            </p>
          )}
          {total > 0 && !even && (
            <div className="tp-inline">
              <button type="button" className="pill" onClick={() => update((d) => withEvenSplit(d, grandTotal(d)))}>
                Split evenly across sizes
              </button>
              <p className="hint">Your sizes are set by hand. This spreads the same total evenly again.</p>
            </div>
          )}
          <details className="tp-help" open={gridOpen} onToggle={(e) => setGridOpen(e.currentTarget.open)}>
            <summary>Set each size yourself</summary>
            <div className="tp-help-body">
              <p>Optional. Use this if you already know your split, for example more M than XL.</p>
              <div className="tp-qty">
                {data.colourways.map((c, i) => (
                  <fieldset key={c.id} className="tp-qty-row">
                    <legend className="tp-legend">
                      <span className="tp-swatch" style={{ background: c.hex }} aria-hidden="true" /> {colourwayName(c, i)}
                      <span className="tp-qty-total" aria-live="polite">
                        {colourwayTotal(data, c.id)} pcs
                      </span>
                    </legend>
                    <div className="tp-qty-grid">
                      {data.sizes.map((s) => (
                        <div key={s} className="tp-qty-cell">
                          <label htmlFor={`tp-qty-${c.id}-${s}`}>
                            {s}
                            <span className="sr-only-focusable">, {colourwayName(c, i)}</span>
                          </label>
                          <input
                            id={`tp-qty-${c.id}-${s}`}
                            className="input"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="0"
                            value={data.quantities[c.id]?.[s] ?? ""}
                            onChange={(e) => setQty(c.id, s, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

/* 7. Finishing: labels, trims, packing, timing */
export function LabelsStep({ data, set, errors }: StepProps) {
  return (
    <div className="tp-stack">
      <Choices
        legend="Do you want a label at the neck?"
        name="tp-neck"
        idPrefix="tp-neck"
        options={neckLabels}
        value={data.neckLabel}
        onChange={(v) => set("neckLabel", v)}
        optional
        notSure
      />
      <fieldset className="tp-fieldset">
        <legend className="tp-legend">
          Extras and packing <Optional />
        </legend>
        <p className="tp-hint">Tick what you want. The usual ones are ticked already. Not sure? Leave them as they are.</p>
        <div className="tp-checks">
          <Check id="tp-care" label="Care label" checked={data.careLabel} onChange={(v) => set("careLabel", v)} hint="A small tag with wash instructions" />
          <Check id="tp-hang" label="Hang tag" checked={data.hangTag} onChange={(v) => set("hangTag", v)} hint="A card tag on a string, with your brand on it" />
          <Check id="tp-poly" label="Polybag" checked={data.polybag} onChange={(v) => set("polybag", v)} hint="Each piece sealed in its own bag" />
          <Check id="tp-pack" label="Custom packaging" checked={data.customPackaging} onChange={(v) => set("customPackaging", v)} hint="Boxes, mailers or stickers with your brand" />
        </div>
      </fieldset>
      {data.customPackaging && (
        <div className="field">
          <label htmlFor="tp-pack-notes">
            What packaging? <Optional />
          </label>
          <input
            id="tp-pack-notes"
            className="input"
            type="text"
            value={data.packagingNotes}
            onChange={(e) => set("packagingNotes", e.target.value)}
            placeholder="e.g. printed mailer box, tissue, sticker seal"
            enterKeyHint="next"
          />
        </div>
      )}
      <div className="tp-two">
        <div className="field">
          <label htmlFor="tp-deadline">
            When do you need it? <Optional />
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
            No fixed date? Leave it empty. Typical turnaround is {facts.turnaround}.
          </p>
          <FieldError id="tp-deadline-err" message={errors.deadline} />
        </div>
        <div className="field">
          <label htmlFor="tp-market">
            Where will you sell it? <Optional />
          </label>
          <input
            id="tp-market"
            className="input"
            type="text"
            list="tp-market-list"
            value={data.market}
            onChange={(e) => set("market", e.target.value)}
            placeholder="e.g. UK, USA, Pakistan"
            autoComplete="off"
            enterKeyHint="next"
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
  const input = (key: "name" | "brand" | "email" | "whatsapp", label: string, props: InputHTMLAttributes<HTMLInputElement>, tag?: "opt" | "req", hint?: string) => (
    <div className="field">
      <label htmlFor={`tp-${key}`}>
        {label} {tag === "opt" && <Optional />}
        {tag === "req" && <Required />}
      </label>
      <input
        id={`tp-${key}`}
        className="input"
        value={data[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={desc(hint && `tp-${key}-hint`, errors[key] && `tp-${key}-err`)}
        {...props}
      />
      {hint && (
        <p className="hint" id={`tp-${key}-hint`}>
          {hint}
        </p>
      )}
      <FieldError id={`tp-${key}-err`} message={errors[key]} />
    </div>
  );
  return (
    <fieldset className="tp-fieldset">
      <legend className="tp-legend tp-legend-lg">Where should we reply?</legend>
      <p className="tp-hint">Give us an email, a WhatsApp number, or both. We need at least one way to reach you.</p>
      <div className="form-grid">
        {input("name", "Your name", { type: "text", autoComplete: "name", enterKeyHint: "next" }, "req")}
        {input("brand", "Brand name", { type: "text", autoComplete: "organization", enterKeyHint: "next" }, "opt")}
        {input("email", "Email", { type: "email", autoComplete: "email", inputMode: "email", enterKeyHint: "next" })}
        {input(
          "whatsapp",
          "WhatsApp number",
          { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "+44 7700 900123", enterKeyHint: "done" },
          undefined,
          "Include your country code, like +44.",
        )}
        <div className="field full">
          <label htmlFor="tp-notes">
            Anything else we should know? <Optional />
          </label>
          <textarea
            id="tp-notes"
            className="input tp-textarea"
            rows={3}
            value={data.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="e.g. I would like a sample first, or my target price is..."
          />
        </div>
      </div>
    </fieldset>
  );
}
