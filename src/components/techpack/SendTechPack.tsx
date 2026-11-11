"use client";

import { useRef, useState, type FormEvent } from "react";
import { contact, facts, mailtoLink, whatsappLink } from "@/content/site";
import { garmentTypes, techPackChecklist } from "@/content/techpack";
import { todayIso, validateContact, type Errors } from "./logic";

type Field = "name" | "brand" | "email" | "whatsapp" | "product" | "quantity" | "deadline" | "notes";
type Values = Record<Field, string>;
type FieldErrors = Partial<Record<Field, string>>;

const ORDER: Field[] = ["name", "brand", "email", "whatsapp", "product", "quantity", "deadline", "notes"];
const LABELS: Record<Field, string> = {
  name: "Your name",
  brand: "Brand name",
  email: "Email",
  whatsapp: "WhatsApp number",
  product: "Product",
  quantity: "Quantity",
  deadline: "Deadline",
  notes: "Notes",
};

function validate(v: Values): FieldErrors {
  const contactErrors: Errors = validateContact(v);
  const e: FieldErrors = { name: contactErrors.name, email: contactErrors.email, whatsapp: contactErrors.whatsapp };
  if (!v.product) e.product = "Choose the product, or “Something else”.";
  if (v.quantity) {
    const q = Number(v.quantity);
    if (!Number.isInteger(q) || q < 1) e.quantity = "Enter a whole number of pieces.";
  }
  if (v.deadline && v.deadline < todayIso()) e.deadline = "Choose a date in the future.";
  return Object.fromEntries(Object.entries(e).filter(([, m]) => m)) as FieldErrors;
}

function compose(v: Values): { subject: string; body: string } {
  const product = garmentTypes.find((g) => g.id === v.product)?.label ?? "";
  const rows: [string, string][] = [
    ["Name", v.name],
    ["Brand", v.brand],
    ["Email", v.email],
    ["WhatsApp", v.whatsapp],
    ["Product", product],
    ["Quantity", v.quantity ? `${v.quantity} pcs` : ""],
    ["Deadline", v.deadline],
  ];
  const body = [
    "Hi Antlertee Creative Studios, I have a tech pack ready for a quote.",
    "",
    ...rows.filter(([, val]) => val.trim()).map(([k, val]) => `${k}: ${val.trim()}`),
    ...(v.notes.trim() ? ["", v.notes.trim()] : []),
    "",
    "My tech pack files are attached.",
  ].join("\n");
  const subject = `Tech pack${v.brand.trim() ? `: ${v.brand.trim()}` : ""}${product ? ` (${product})` : ""}`;
  return { subject, body };
}

/** "Send your own tech pack": a checklist, a short form, then WhatsApp or email opens with the message ready. */
export function SendTechPack({ onBuild }: { onBuild: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState<{ channel: "whatsapp" | "email"; href: string } | null>(null);

  const read = (form: HTMLFormElement): Values => {
    const fd = new FormData(form);
    return Object.fromEntries(ORDER.map((k) => [k, String(fd.get(k) ?? "")])) as Values;
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const channel = submitter?.value === "email" ? "email" : "whatsapp";
    const values = read(e.currentTarget);
    const found = validate(values);
    setErrors(found);
    setSubmitted(true);
    if (Object.keys(found).length) {
      setSent(null);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const { subject, body } = compose(values);
    const href = channel === "whatsapp" ? whatsappLink(body) : mailtoLink(subject, body);
    setSent({ channel, href });
    if (channel === "whatsapp") window.open(href, "_blank", "noopener,noreferrer");
    else window.location.href = href;
  };

  const onChange = () => {
    if (submitted && formRef.current) setErrors(validate(read(formRef.current)));
  };

  const errorList = ORDER.filter((k) => errors[k]);
  const fp = (name: Field, hint?: boolean) => ({
    id: `ts-${name}`,
    name,
    className: "input",
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": [errors[name] ? `ts-${name}-err` : "", hint ? `ts-${name}-hint` : ""].filter(Boolean).join(" ") || undefined,
  });
  const err = (name: Field) =>
    errors[name] ? (
      <p className="error" id={`ts-${name}-err`}>
        <span aria-hidden="true">!</span> {errors[name]}
      </p>
    ) : null;

  return (
    <div className="ts">
      <div className="ts-check">
        <h3 className="ts-h">
          A good tech pack has<span className="dot">:</span>
        </h3>
        <ol className="ts-list">
          {techPackChecklist.map((item, i) => (
            <li key={item.title}>
              <b aria-hidden="true">{String(i + 1).padStart(2, "0")}</b>
              <span>
                <strong>{item.title}</strong>
                {item.text}
              </span>
            </li>
          ))}
        </ol>
        <p className="ts-aside">
          Missing a few? Send what you have. A mockup and PNG files are enough to start, and you can also{" "}
          <a
            href="#build-tech-pack"
            className="ts-switch"
            onClick={(e) => {
              e.preventDefault();
              onBuild();
            }}
          >
            build one here
          </a>
          .
        </p>
      </div>

      <form ref={formRef} className="ts-form" noValidate onSubmit={onSubmit} onChange={onChange} aria-describedby="ts-how">
        <div className="ts-how" id="ts-how">
          <p className="br">( How it works )</p>
          <ol>
            <li>Fill in the short form below.</li>
            <li>Press a button: WhatsApp or your email app opens with the message written.</li>
            <li>
              <strong>Attach your tech pack files there</strong> (PDF, AI, PNG) and send.
            </li>
          </ol>
          <p>Files are attached in WhatsApp or email. Nothing is uploaded to this website.</p>
        </div>

        {errorList.length > 0 && (
          <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
            <h4>Please fix {errorList.length === 1 ? "this" : `these ${errorList.length} things`}:</h4>
            <ul>
              {errorList.map((k) => (
                <li key={k}>
                  <a href={`#ts-${k}`}>
                    {LABELS[k]}: {errors[k]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {sent && errorList.length === 0 && (
          <div className="status-ok" role="status">
            <strong>{sent.channel === "whatsapp" ? "WhatsApp is open in a new tab." : "Your email app is open."}</strong>{" "}
            {sent.channel === "whatsapp"
              ? "Tap the paperclip or + in the chat, choose Document, attach your tech pack files, then send."
              : "Use Attach (the paperclip) to add your tech pack files, then send."}{" "}
            Nothing happened?{" "}
            <a href={sent.href} target={sent.channel === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer">
              Open it again
            </a>{" "}
            or write to {contact.email}.
          </div>
        )}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="ts-name">{LABELS.name}</label>
            <input {...fp("name")} type="text" autoComplete="name" />
            {err("name")}
          </div>
          <div className="field">
            <label htmlFor="ts-brand">
              {LABELS.brand} <span className="opt">(optional)</span>
            </label>
            <input {...fp("brand")} type="text" autoComplete="organization" />
          </div>
          <div className="field">
            <label htmlFor="ts-email">{LABELS.email}</label>
            <input {...fp("email", true)} type="email" autoComplete="email" inputMode="email" />
            <p className="hint" id="ts-email-hint">
              Email or WhatsApp: at least one, so we can reply.
            </p>
            {err("email")}
          </div>
          <div className="field">
            <label htmlFor="ts-whatsapp">{LABELS.whatsapp}</label>
            <input {...fp("whatsapp")} type="tel" autoComplete="tel" inputMode="tel" placeholder="+44 7700 900123" />
            {err("whatsapp")}
          </div>
          <div className="field">
            <label htmlFor="ts-product">{LABELS.product}</label>
            <select {...fp("product")} defaultValue="">
              <option value="" disabled>
                Choose a product
              </option>
              {garmentTypes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            {err("product")}
          </div>
          <div className="field">
            <label htmlFor="ts-quantity">
              {LABELS.quantity} <span className="opt">(pieces, optional)</span>
            </label>
            <input {...fp("quantity", true)} type="number" min={1} step={1} inputMode="numeric" />
            <p className="hint" id="ts-quantity-hint">
              Standard MOQ is {facts.moqLong}.
            </p>
            {err("quantity")}
          </div>
          <div className="field">
            <label htmlFor="ts-deadline">
              {LABELS.deadline} <span className="opt">(optional)</span>
            </label>
            <input {...fp("deadline")} type="date" min={todayIso()} />
            {err("deadline")}
          </div>
          <div className="field full">
            <label htmlFor="ts-notes">
              {LABELS.notes} <span className="opt">(optional)</span>
            </label>
            <textarea {...fp("notes")} className="input tp-textarea" rows={4} placeholder="Colours, sampling first, anything we should know" />
          </div>
        </div>

        <div className="tp-out">
          <button type="submit" value="whatsapp" className="pill inked lg">
            Open WhatsApp
          </button>
          <button type="submit" value="email" className="pill lg">
            Open email
          </button>
        </div>
        <p className="tp-hint tp-out-note">
          Sends to WhatsApp {contact.whatsappDisplay} or {contact.email}. Remember to attach your files before you press send.
        </p>
      </form>
    </div>
  );
}
