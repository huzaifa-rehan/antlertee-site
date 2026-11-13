"use client";

import { useRef, useState, type FormEvent } from "react";
import { LeadFileDrop, useLeadFiles } from "@/components/uploads/LeadFiles";
import { contact, facts, mailtoLink, whatsappLink } from "@/content/site";
import { garmentTypes, techPackChecklist } from "@/content/techpack";
import { submitLead } from "@/lib/leads/submit";
import { goToWhatsApp, openHandoffTab, saveForHandoff, whatsappMessage, type HandoffInfo } from "@/lib/leads/whatsapp";
import { todayIso, validateContact, type Errors } from "./logic";

type Phase = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; info: HandoffInfo; href: string; opened: boolean };

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
  ].join("\n");
  const subject = `Tech pack${v.brand.trim() ? `: ${v.brand.trim()}` : ""}${product ? ` (${product})` : ""}`;
  return { subject, body };
}

/**
 * "Send your own tech pack": a checklist, a short form with file upload, then "Send it on WhatsApp": the request and
 * files are saved to the admin inbox and a chat opens with the message already written. Email is the alternative.
 */
export function SendTechPack({ onBuild }: { onBuild: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const okRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [emailHref, setEmailHref] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const files = useLeadFiles();
  const sending = phase.kind === "sending";

  const read = (form: HTMLFormElement): Values => {
    const fd = new FormData(form);
    return Object.fromEntries(ORDER.map((k) => [k, String(fd.get(k) ?? "")])) as Values;
  };

  const sendOnWhatsApp = async (values: Values, honeypot: string) => {
    // Open the tab now (inside the click), then point it at WhatsApp once the request is saved.
    const tab = openHandoffTab();
    setPhase({ kind: "sending" });
    const product = garmentTypes.find((g) => g.id === values.product)?.label ?? values.product;
    const fields: Record<string, string> = { product };
    if (values.quantity) fields.quantity = values.quantity;
    if (values.deadline) fields.deadline = values.deadline;
    const info = await saveForHandoff({
      pickedCount: files.items.length,
      upload: () => files.uploadAll(),
      save: (refs) =>
        submitLead({
          kind: "techpack",
          name: values.name,
          email: values.email,
          whatsapp: values.whatsapp,
          brand: values.brand,
          message: values.notes,
          fields,
          files: refs,
          website: honeypot,
        }),
    });
    const href = whatsappLink(whatsappMessage(compose(values).body, info));
    const opened = goToWhatsApp(tab, href);
    setPhase({ kind: "sent", info, href, opened });
    requestAnimationFrame(() => okRef.current?.focus());
  };

  const sendAnother = () => {
    files.reset();
    setErrors({});
    setSubmitted(false);
    setEmailHref(null);
    setPhase({ kind: "idle" });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const channel = submitter?.value === "email" ? "email" : "whatsapp";
    const values = read(e.currentTarget);
    const found = validate(values);
    setErrors(found);
    setSubmitted(true);
    if (Object.keys(found).length) {
      setEmailHref(null);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (channel === "whatsapp") {
      setEmailHref(null);
      void sendOnWhatsApp(values, String(new FormData(e.currentTarget).get("website") ?? ""));
      return;
    }
    const { subject, body } = compose(values);
    const href = mailtoLink(subject, `${body}\n\nMy tech pack files are attached.`);
    setEmailHref(href);
    window.location.href = href;
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

      {phase.kind === "sent" ? (
        <div className="ts-form">
          <div className="send-ok" role="status" tabIndex={-1} ref={okRef}>
            <h4>
              {phase.opened ? "Press send in WhatsApp" : "One tap left"}
              <span className="dot">.</span>
            </h4>
            <p>
              {phase.opened
                ? "WhatsApp opened in a new tab with your message already written. Press send and we will take it from there."
                : "Your message is written and ready. Tap the button to open WhatsApp, then press send."}
            </p>
            <p style={{ marginTop: 16 }}>
              <a className="pill solid" href={phase.href} target="_blank" rel="noopener noreferrer">
                {phase.opened ? "Take me back to WhatsApp" : "Take me to WhatsApp"}
              </a>
            </p>
            {phase.info.reference ? (
              <>
                <p>Your tech pack files are saved with us. Your reference:</p>
                <p className="send-ref">{phase.info.reference}</p>
              </>
            ) : (
              <p>
                We could not save a copy on our side just now, so the chat is the way to reach us. The message has all your details.
              </p>
            )}
            {phase.info.attachLater && (
              <p>Tap the paperclip or + in the chat, choose Document, and attach your tech pack files before you send.</p>
            )}
            <ol>
              <li>We go through your files and details.</li>
              <li>We reply on WhatsApp with questions, fabric options and sampling.</li>
              <li>Then a price for your quantity.</li>
            </ol>
            <p style={{ marginTop: 16 }}>
              <button type="button" className="pill on-dark" onClick={sendAnother}>
                Send another tech pack
              </button>
            </p>
          </div>
        </div>
      ) : (
      <form ref={formRef} className="ts-form" noValidate onSubmit={onSubmit} onChange={onChange} aria-describedby="ts-how" aria-busy={sending || undefined}>
        <div className="ts-how" id="ts-how">
          <p className="br">How it works</p>
          <ol>
            <li>Fill in the short form below.</li>
            <li>
              <strong>Add your tech pack files</strong> (PDF, AI, PNG, Excel and more).
            </li>
            <li>Press Send it on WhatsApp. A chat opens with your message already written, you just press send.</li>
          </ol>
          <p>Your files are saved with the Antlertee team only. Prefer email? Use the button at the bottom.</p>
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
        {emailHref && errorList.length === 0 && (
          <div className="status-ok" role="status">
            <strong>Your email app is open.</strong> Use Attach (the paperclip) to add your tech pack files, then send. Nothing happened?{" "}
            <a href={emailHref} rel="noopener noreferrer">
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
              {LABELS.brand} <span className="opt">Optional</span>
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
              {LABELS.quantity} <span className="opt">Optional, in pieces</span>
            </label>
            <input {...fp("quantity", true)} type="number" min={1} step={1} inputMode="numeric" />
            <p className="hint" id="ts-quantity-hint">
              Standard MOQ is {facts.moqLong}.
            </p>
            {err("quantity")}
          </div>
          <div className="field">
            <label htmlFor="ts-deadline">
              {LABELS.deadline} <span className="opt">Optional</span>
            </label>
            <input {...fp("deadline")} type="date" min={todayIso()} />
            {err("deadline")}
          </div>
          <div className="field full">
            <label htmlFor="ts-notes">
              {LABELS.notes} <span className="opt">Optional</span>
            </label>
            <textarea {...fp("notes")} className="input tp-textarea" rows={4} placeholder="Colours, sampling first, anything we should know" />
          </div>
          <div className="field full">
            <LeadFileDrop idPrefix="ts-files" label="Your tech pack files" files={files} disabled={sending} />
          </div>
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="ts-website">Website</label>
            <input id="ts-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
        </div>

        <div className="tp-out">
          <button type="submit" value="whatsapp" className="pill inked lg" disabled={sending}>
            {sending ? "Opening WhatsApp…" : "Send it on WhatsApp"}
          </button>
        </div>
        <p className="tp-hint tp-out-note" role={sending ? "status" : undefined}>
          {sending
            ? "Saving your tech pack. Keep this page open, WhatsApp opens in a moment."
            : "WhatsApp opens with your message written. Your files are saved with your request, so there is nothing to attach."}
        </p>

        <div className="send-alt">
          <p className="send-alt-h">Prefer email?</p>
          <div className="tp-out">
            <button type="submit" value="email" className="pill lg" disabled={sending}>
              Email it instead
            </button>
          </div>
          <p className="tp-hint tp-out-note">Opens your email app to {contact.email}. Remember to attach your files before you press send.</p>
        </div>
      </form>
      )}
    </div>
  );
}
