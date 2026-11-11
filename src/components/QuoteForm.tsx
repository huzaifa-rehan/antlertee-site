"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { getProduct, products } from "@/content/products";
import { contact, facts, mailtoLink, whatsappLink } from "@/content/site";

type FieldName = "name" | "brand" | "email" | "whatsapp" | "product" | "quantity" | "deadline" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
type Channel = "whatsapp" | "email";

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

/** Quote form for a static site: on submit it opens WhatsApp or the mail app with the details filled in. */
export function QuoteForm() {
  const params = useSearchParams();
  const preset = getProduct(params.get("product") ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState<{ channel: Channel; href: string } | null>(null);

  const read = (form: HTMLFormElement): Values => {
    const data = new FormData(form);
    return Object.fromEntries(ORDER.map((k) => [k, String(data.get(k) ?? "")])) as Values;
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const native = e.nativeEvent as SubmitEvent;
    const channel: Channel = (native.submitter as HTMLButtonElement | null)?.value === "email" ? "email" : "whatsapp";
    const values = read(e.currentTarget);
    const found = validate(values);
    setErrors(found);
    setSubmitted(true);
    if (Object.keys(found).length > 0) {
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

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} onChange={onFieldChange} aria-describedby="form-note">
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
      {sent && errorList.length === 0 && (
        <div className="status-ok" role="status">
          {sent.channel === "whatsapp" ? "WhatsApp opened in a new tab with your details." : "Your email app opened with your details."}{" "}
          Nothing happened?{" "}
          <a href={sent.href} target={sent.channel === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer">
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
            {LABELS.brand} <span className="opt">(optional)</span>
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
            {LABELS.quantity} <span className="opt">(pieces, optional)</span>
          </label>
          <input {...fieldProps("quantity")} type="number" min={1} step={1} inputMode="numeric" />
          <p className="hint" id="f-quantity-hint">
            Standard MOQ is {facts.moqLong}.
          </p>
          {err("quantity")}
        </div>
        <div className="field">
          <label htmlFor="f-deadline">
            {LABELS.deadline} <span className="opt">(optional)</span>
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
            Colours, GSM, fit, print or embroidery, labels. Have a tech pack or mockup? Attach it in the WhatsApp chat or email that opens.
          </p>
          {err("message")}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="submit" value="whatsapp" className="pill solid lg">
          Send on WhatsApp
        </button>
        <button type="submit" value="email" className="pill lg">
          Send by email
        </button>
      </div>
      <p id="form-note" className="mt-4 max-w-[60ch] text-[13px] leading-relaxed text-mute">
        Nothing is stored on this website: sending opens WhatsApp or your email app with the message ready to send to{" "}
        {contact.email}.
      </p>
    </form>
  );
}
