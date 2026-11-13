"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { LeadFileDrop, useLeadFiles } from "@/components/uploads/LeadFiles";
import { getProduct, products } from "@/content/products";
import { contact, facts, mailtoLink, whatsappLink } from "@/content/site";
import { submitLead } from "@/lib/leads/submit";
import { goToWhatsApp, openHandoffTab, saveForHandoff, whatsappMessage, type HandoffInfo } from "@/lib/leads/whatsapp";

type FieldName = "name" | "brand" | "email" | "whatsapp" | "product" | "quantity" | "deadline" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
type Phase = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; info: HandoffInfo; href: string; opened: boolean };

const LABELS: Record<FieldName, string> = {
  name: "Your name",
  brand: "Brand name",
  email: "Email",
  whatsapp: "WhatsApp number",
  product: "Product interest",
  quantity: "Quantity",
  deadline: "Deadline",
  message: "Message",
};

const ORDER: FieldName[] = ["name", "brand", "email", "whatsapp", "product", "quantity", "deadline", "message"];

function today(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Enter your name.";
  const email = v.email.trim();
  const phone = v.whatsapp.replace(/[\s()-]/g, "");
  if (!email && !phone) {
    e.email = "Enter an email or a WhatsApp number so we can reply.";
    e.whatsapp = "Enter a WhatsApp number or an email so we can reply.";
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = "Enter a valid email, like name@brand.com.";
  if (phone && !/^\+?\d{8,15}$/.test(phone)) e.whatsapp = "Enter a valid number with country code, like +44 7700 900123.";
  if (!v.product) e.product = "Choose a product, or “Not sure yet”.";
  if (v.quantity) {
    const q = Number(v.quantity);
    if (!Number.isInteger(q) || q < 1) e.quantity = "Enter a whole number of pieces.";
    else if (q > 1_000_000) e.quantity = "Enter a realistic quantity.";
  }
  if (v.deadline && v.deadline < today()) e.deadline = "Choose a date in the future.";
  if (v.message.trim().length < 10) e.message = "Tell us a little about the order (at least 10 characters).";
  return e;
}

function compose(v: Values): { subject: string; body: string } {
  const product = getProduct(v.product);
  const details: [string, string][] = [
    ["Name", v.name.trim()],
    ["Brand", v.brand.trim()],
    ["Email", v.email.trim()],
    ["WhatsApp", v.whatsapp.trim()],
    ["Product", product ? `${product.name} (${product.sub})` : "Not sure yet / something else"],
    ["Quantity", v.quantity ? `${v.quantity} pcs` : ""],
    ["Deadline", v.deadline],
  ];
  const body = [
    "Hi Antlertee Creative Studios, I'd like a quote.",
    "",
    ...details.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
    "",
    v.message.trim(),
  ].join("\n");
  const subject = `Quote request${v.brand.trim() ? `: ${v.brand.trim()}` : ""}${product ? ` (${product.name})` : ""}`;
  return { subject, body };
}

/**
 * Quote form: "Send it on WhatsApp" saves the request (with optional files) to the admin inbox, then opens a WhatsApp
 * chat with the details already typed; the visitor only presses send. The mail app, with the details filled in,
 * is the alternative.
 */
export function QuoteForm() {
  const params = useSearchParams();
  const preset = getProduct(params.get("product") ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const okRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [emailHref, setEmailHref] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const files = useLeadFiles();
  const sending = phase.kind === "sending";

  const read = (form: HTMLFormElement): Values => {
    const data = new FormData(form);
    return Object.fromEntries(ORDER.map((k) => [k, String(data.get(k) ?? "")])) as Values;
  };

  const sendOnWhatsApp = async (v: Values, honeypot: string) => {
    // Open the tab now (inside the click), then point it at WhatsApp once the request is saved.
    const tab = openHandoffTab();
    setPhase({ kind: "sending" });
    const product = getProduct(v.product);
    const fields: Record<string, string> = { product: product ? `${product.name} (${product.sub})` : "Not sure yet / something else" };
    if (v.quantity) fields.quantity = v.quantity;
    if (v.deadline) fields.deadline = v.deadline;
    const info = await saveForHandoff({
      pickedCount: files.items.length,
      upload: () => files.uploadAll(),
      save: (refs) =>
        submitLead({
          kind: "quote",
          name: v.name,
          email: v.email,
          whatsapp: v.whatsapp,
          brand: v.brand,
          message: v.message,
          fields,
          files: refs,
          website: honeypot,
        }),
    });
    const href = whatsappLink(whatsappMessage(compose(v).body, info));
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
    const native = e.nativeEvent as SubmitEvent;
    const choice = (native.submitter as HTMLButtonElement | null)?.value;
    const values = read(e.currentTarget);
    const found = validate(values);
    setErrors(found);
    setSubmitted(true);
    if (Object.keys(found).length > 0) {
      setEmailHref(null);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (choice === "email") {
      const href = mailtoLink(compose(values).subject, compose(values).body);
      setEmailHref(href);
      window.location.href = href;
      return;
    }
    setEmailHref(null);
    void sendOnWhatsApp(values, String(new FormData(e.currentTarget).get("website") ?? ""));
  };

  // After the first submit, re-validate a field as soon as the user fixes it.
  const onFieldChange = () => {
    if (!submitted || !formRef.current) return;
    setErrors(validate(read(formRef.current)));
  };

  const errorList = ORDER.filter((k) => errors[k]);
  const fieldProps = (name: FieldName) => ({
    id: `f-${name}`,
    name,
    className: "input",
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": [errors[name] ? `f-${name}-err` : "", `f-${name}-hint`].filter(Boolean).join(" ") || undefined,
  });
  const err = (name: FieldName) =>
    errors[name] ? (
      <p className="error" id={`f-${name}-err`}>
        <span aria-hidden="true">!</span> {errors[name]}
      </p>
    ) : null;

  if (phase.kind === "sent") {
    const { info, href, opened } = phase;
    return (
      <div className="send-ok" role="status" tabIndex={-1} ref={okRef}>
        <h2>
          {opened ? "Press send in WhatsApp" : "One tap left"}
          <span className="dot">.</span>
        </h2>
        <p>
          {opened
            ? "WhatsApp opened in a new tab with your message already written. Press send and we will take it from there."
            : "Your message is written and ready. Tap the button to open WhatsApp, then press send."}
        </p>
        <p style={{ marginTop: 16 }}>
          <a className="pill solid" href={href} target="_blank" rel="noopener noreferrer">
            {opened ? "Take me back to WhatsApp" : "Take me to WhatsApp"}
          </a>
        </p>
        {info.reference ? (
          <>
            <p>A copy is saved with us. Your reference:</p>
            <p className="send-ref">{info.reference}</p>
          </>
        ) : (
          <p>
            We could not save a copy on our side just now, so the chat is the way to reach us. Nothing is lost: the message has all
            your details.
          </p>
        )}
        {info.attachLater && <p>Tap the paperclip or + in the chat to attach your files before you send.</p>}
        <ol>
          <li>We read your request and any files.</li>
          <li>We reply on WhatsApp with fabric options and sampling.</li>
          <li>Then a price for your quantity.</li>
        </ol>
        <p style={{ marginTop: 16 }}>
          <button type="button" className="pill on-dark" onClick={sendAnother}>
            Got another idea? Send one more
          </button>
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} onChange={onFieldChange} aria-describedby="form-note" aria-busy={sending || undefined}>
      {errorList.length > 0 && (
        <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
          <h2>Please fix {errorList.length === 1 ? "this" : `these ${errorList.length} things`}:</h2>
          <ul>
            {errorList.map((k) => (
              <li key={k}>
                <a href={`#f-${k}`}>
                  {LABELS[k]}: {errors[k]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {emailHref && errorList.length === 0 && (
        <div className="status-ok" role="status">
          Your email app opened with your details. Nothing happened?{" "}
          <a href={emailHref} rel="noopener noreferrer">
            Open it again
          </a>{" "}
          or message us on {contact.whatsappDisplay}.
        </div>
      )}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="f-name">{LABELS.name}</label>
          <input {...fieldProps("name")} type="text" autoComplete="name" required />
          {err("name")}
        </div>
        <div className="field">
          <label htmlFor="f-brand">
            {LABELS.brand} <span className="opt">Optional</span>
          </label>
          <input {...fieldProps("brand")} type="text" autoComplete="organization" />
          {err("brand")}
        </div>
        <div className="field">
          <label htmlFor="f-email">{LABELS.email}</label>
          <input {...fieldProps("email")} type="email" autoComplete="email" inputMode="email" />
          <p className="hint" id="f-email-hint">
            Email or WhatsApp: at least one, so we can reply.
          </p>
          {err("email")}
        </div>
        <div className="field">
          <label htmlFor="f-whatsapp">{LABELS.whatsapp}</label>
          <input {...fieldProps("whatsapp")} type="tel" autoComplete="tel" inputMode="tel" placeholder="+44 7700 900123" />
          {err("whatsapp")}
        </div>
        <div className="field">
          <label htmlFor="f-product">{LABELS.product}</label>
          <select {...fieldProps("product")} defaultValue={preset?.slug ?? ""} required>
            <option value="" disabled>
              Choose a product
            </option>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name} ({p.sub})
              </option>
            ))}
            <option value="other">Not sure yet / something else</option>
          </select>
          {err("product")}
        </div>
        <div className="field">
          <label htmlFor="f-quantity">
            {LABELS.quantity} <span className="opt">Optional, in pieces</span>
          </label>
          <input {...fieldProps("quantity")} type="number" min={1} step={1} inputMode="numeric" />
          <p className="hint" id="f-quantity-hint">
            Standard MOQ is {facts.moqLong}.
          </p>
          {err("quantity")}
        </div>
        <div className="field">
          <label htmlFor="f-deadline">
            {LABELS.deadline} <span className="opt">Optional</span>
          </label>
          <input {...fieldProps("deadline")} type="date" min={today()} />
          {err("deadline")}
        </div>
        <div className="field full">
          <label htmlFor="f-message">{LABELS.message}</label>
          <textarea
            {...fieldProps("message")}
            rows={6}
            required
            defaultValue={preset ? `I'm interested in the ${preset.name} (${preset.sub}). ` : ""}
          />
          <p className="hint" id="f-message-hint">
            Colours, GSM, fit, print or embroidery, labels. Have a tech pack or mockup? Add it below.
          </p>
          {err("message")}
        </div>
        <div className="field full">
          <LeadFileDrop idPrefix="f-files" label="Tech pack, mockups or references" files={files} disabled={sending} />
        </div>
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="f-website">Website</label>
          <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="submit" value="whatsapp" className="pill solid lg" disabled={sending}>
          {sending ? "Opening WhatsApp…" : "Send it on WhatsApp"}
        </button>
      </div>
      <p id="form-note" className="mt-4 max-w-[60ch] text-[13px] leading-relaxed text-mute" role={sending ? "status" : undefined}>
        {sending
          ? "Saving your request. Keep this page open, WhatsApp opens in a moment."
          : "WhatsApp opens with your message already written. Just press send. Any files you add are saved with your request."}
      </p>

      <div className="send-alt">
        <p className="send-alt-h">Prefer email?</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="submit" value="email" className="pill lg" disabled={sending}>
            Email it instead
          </button>
        </div>
        <p className="mt-4 max-w-[60ch] text-[13px] leading-relaxed text-mute">
          Your email app opens with the message ready to send to {contact.email}. Attach any files there.
        </p>
      </div>
    </form>
  );
}
