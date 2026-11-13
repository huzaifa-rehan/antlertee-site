import type { ReactNode } from "react";
import { NOT_SURE, type TechPack } from "@/content/techpack";

export type SetField = <K extends keyof TechPack>(key: K, value: TechPack[K]) => void;
export type Update = (fn: (d: TechPack) => TechPack) => void;

export interface StepProps {
  data: TechPack;
  set: SetField;
  update: Update;
  errors: Partial<Record<string, string>>;
}

/** A small tag instead of "(optional)": the site does not use bracket labels. */
export function Optional() {
  return <span className="opt">Optional</span>;
}

/** Marks the few questions we cannot give a price without. Everything else is optional or "not sure". */
export function Required() {
  return <span className="opt req">Needed</span>;
}

/** A "What does this mean?" disclosure: plain words for a term a first-timer may not know. Native details, so it works without script. */
export function Help({ summary = "What does this mean?", children }: { summary?: string; children: ReactNode }) {
  return (
    <details className="tp-help">
      <summary>{summary}</summary>
      <div className="tp-help-body">{children}</div>
    </details>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="error" id={id}>
      <span aria-hidden="true">!</span> {message}
    </p>
  );
}

/**
 * A radio group drawn as cards or chips. The native radio stays in the DOM, so arrow keys and forms work as usual.
 * With `notSure`, the first card is "Not sure, you decide" and stands for an empty value: a valid answer, not a gap.
 */
export function Choices<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  variant = "card",
  error,
  hint,
  idPrefix,
  optional,
  notSure,
}: {
  legend: ReactNode;
  name: string;
  options: readonly { id: T; label: string; hint?: string }[];
  value: string;
  onChange: (v: T | "") => void;
  variant?: "card" | "chip";
  error?: string;
  hint?: string;
  idPrefix: string;
  optional?: boolean;
  notSure?: boolean;
}) {
  const errId = `${idPrefix}-err`;
  const hintId = `${idPrefix}-hint`;
  const describedBy = [error ? errId : "", hint ? hintId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className="tp-fieldset" aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className="tp-legend">
        {legend} {optional && <Optional />}
      </legend>
      {hint && (
        <p className="tp-hint" id={hintId}>
          {hint}
        </p>
      )}
      <div className={variant === "card" ? "tp-cards" : "tp-chips"}>
        {notSure && (
          <label className={variant === "card" ? "tp-card tp-card-unsure" : "tp-chip"}>
            <input type="radio" id={`${idPrefix}-unsure`} name={name} value="" checked={value === ""} onChange={() => onChange("")} />
            <span className="tp-card-t">{NOT_SURE.label}</span>
            {variant === "card" && <span className="tp-card-h">{NOT_SURE.hint}</span>}
          </label>
        )}
        {options.map((o) => (
          <label key={o.id} className={variant === "card" ? "tp-card" : "tp-chip"}>
            <input
              type="radio"
              id={`${idPrefix}-${o.id}`}
              name={name}
              value={o.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
            />
            <span className="tp-card-t">{o.label}</span>
            {variant === "card" && o.hint && <span className="tp-card-h">{o.hint}</span>}
          </label>
        ))}
      </div>
      <FieldError id={errId} message={error} />
    </fieldset>
  );
}

export function Check({ id, label, checked, onChange, hint }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="tp-check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="tp-card-t">{label}</span>
        {hint && <span className="tp-card-h">{hint}</span>}
      </span>
    </label>
  );
}
