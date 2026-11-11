import type { ReactNode } from "react";
import type { TechPack } from "@/content/techpack";

export type SetField = <K extends keyof TechPack>(key: K, value: TechPack[K]) => void;
export type Update = (fn: (d: TechPack) => TechPack) => void;

export interface StepProps {
  data: TechPack;
  set: SetField;
  update: Update;
  errors: Partial<Record<string, string>>;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="error" id={id}>
      <span aria-hidden="true">!</span> {message}
    </p>
  );
}

/** A radio group drawn as cards or chips. The native radio stays in the DOM, so arrow keys and forms work as usual. */
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
}: {
  legend: ReactNode;
  name: string;
  options: readonly { id: T; label: string; hint?: string }[];
  value: string;
  onChange: (v: T) => void;
  variant?: "card" | "chip";
  error?: string;
  hint?: string;
  idPrefix: string;
  optional?: boolean;
}) {
  const errId = `${idPrefix}-err`;
  const hintId = `${idPrefix}-hint`;
  const describedBy = [error ? errId : "", hint ? hintId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className="tp-fieldset" aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className="tp-legend">
        {legend} {optional && <span className="opt">(optional)</span>}
      </legend>
      {hint && (
        <p className="tp-hint" id={hintId}>
          {hint}
        </p>
      )}
      <div className={variant === "card" ? "tp-cards" : "tp-chips"}>
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
