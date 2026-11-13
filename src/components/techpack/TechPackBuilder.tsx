"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { contact, mailtoLink, whatsappLink } from "@/content/site";
import { emptyTechPack, steps, type StepId, type TechPack } from "@/content/techpack";
import { getLenis } from "@/lib/lenis";
import { ArtworkStep } from "./ArtworkStep";
import { ColoursStep, ContactFields, FabricStep, FitStep, GarmentStep, LabelsStep, SizesStep } from "./BuilderSteps";
import type { SetField, StepProps, Update } from "./fields";
import { ReviewSummary } from "./ReviewSummary";
import { TechPackSheet } from "./TechPackSheet";
import {
  clearDraft,
  composeTechPack,
  errorField,
  errorStep,
  garmentLabel,
  loadDraft,
  saveDraft,
  validateAll,
  validateStep,
  type ErrorKey,
  type Errors,
} from "./logic";

type Attempt = { scope: "step"; step: StepId } | { scope: "print" | "send" } | null;
type Sent = { channel: "whatsapp" | "email"; href: string } | null;

const LAST = steps.length - 1;

const ERROR_LABEL: Record<ErrorKey, string> = {
  garment: "Garment type",
  garmentOther: "Garment",
  gsm: "Weight",
  quantities: "Quantities",
  deadline: "Deadline",
  name: "Your name",
  email: "Email",
  whatsapp: "WhatsApp number",
};

const STEP_INTRO: Record<StepId, string> = {
  garment: "Start with the garment. Everything after this adapts to it.",
  fit: "How it should sit on the body. Skip anything you are unsure of; we can decide it together at sampling.",
  fabric: "Fabric, weight and any garment wash.",
  colours: "The colours you want to produce.",
  artwork: "Where your prints and embroidery go, and how they are made.",
  sizes: "Pieces per size, per colourway.",
  labels: "The finishing that makes it your brand, plus timing.",
  review: "Check everything, add your details, then download or send it.",
};

function storageWorks(): boolean {
  try {
    const k = "acs-techpack-test";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/**
 * "Build a tech pack with us": an eight-step builder. Client-only (loaded with ssr: false) so the draft can be
 * read from localStorage on first render. Output is a printable sheet and a WhatsApp / email message.
 */
export default function TechPackBuilder() {
  const [initial] = useState(loadDraft);
  const [data, setData] = useState<TechPack>(initial.data);
  const [step, setStep] = useState(initial.step);
  const [canSave] = useState(storageWorks);
  const [attempt, setAttempt] = useState<Attempt>(null);
  const [sent, setSent] = useState<Sent>(null);
  const [printedOn, setPrintedOn] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const navigated = useRef(false);
  const focusAfter = useRef<string | null>(null);

  const current = steps[step] ?? steps[0];

  // Errors are derived from the data, so they clear as soon as the visitor fixes a field.
  const errors: Errors =
    attempt === null ? {} : attempt.scope === "step" ? validateStep(data, attempt.step) : validateAll(data, attempt.scope);
  const errorKeys = Object.keys(errors) as ErrorKey[];

  // Save the draft (debounced). Storage may be blocked; the builder still works, it just will not survive a refresh.
  useEffect(() => {
    const t = window.setTimeout(() => saveDraft(data, step), 250);
    return () => window.clearTimeout(t);
  }, [data, step]);

  // After a step change: move focus to the new step's heading (or a field), and bring the builder into view.
  useEffect(() => {
    if (!navigated.current) return;
    navigated.current = false;
    const root = rootRef.current;
    if (root) {
      const top = root.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(root, { offset: -88, duration: 0.6 });
        else window.scrollTo({ top: window.scrollY + top - 88 });
      }
    }
    const id = focusAfter.current;
    focusAfter.current = null;
    const target = id ? document.getElementById(id) : headingRef.current;
    target?.focus({ preventScroll: true });
  }, [step]);

  const set: SetField = useCallback((key, value) => setData((d) => ({ ...d, [key]: value })), []);
  const update: Update = useCallback((fn) => setData(fn), []);

  const goTo = (i: number, focusId?: string) => {
    const next = Math.max(0, Math.min(LAST, i));
    if (next === step) {
      // Same step (e.g. an error link for a field on this page): keep the errors showing and focus the field.
      requestAnimationFrame(() => (focusId ? document.getElementById(focusId) : headingRef.current)?.focus());
      return;
    }
    navigated.current = true;
    focusAfter.current = focusId ?? null;
    setAttempt(null);
    setSent(null);
    setStep(next);
  };

  const focusFirstError = (found: Errors) => {
    const first = (Object.keys(found) as ErrorKey[])[0];
    if (first) requestAnimationFrame(() => document.getElementById(errorField[first])?.focus());
  };

  const onNext = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (current.id === "review") return;
    const found = validateStep(data, current.id);
    if (Object.keys(found).length) {
      setAttempt({ scope: "step", step: current.id });
      focusFirstError(found);
      return;
    }
    goTo(step + 1);
  };

  const fixError = (key: ErrorKey) => {
    const target = steps.findIndex((s) => s.id === errorStep[key]);
    goTo(target, errorField[key]);
    if (target !== step) setAttempt({ scope: "step", step: errorStep[key] });
  };

  const runOutput = (purpose: "print" | "send") => {
    const found = validateAll(data, purpose);
    setAttempt({ scope: purpose });
    if (Object.keys(found).length) {
      setSent(null);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return false;
    }
    return true;
  };

  const onPrint = () => {
    if (!runOutput("print")) return;
    flushSync(() =>
      setPrintedOn(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })),
    );
    const html = document.documentElement;
    const prevTitle = document.title;
    // The title becomes the PDF's file name in "Save as PDF".
    document.title = ["Tech pack", data.brand.trim(), data.styleName.trim() || garmentLabel(data)].filter(Boolean).join(" - ");
    html.classList.add("tp-printing");
    const done = () => {
      html.classList.remove("tp-printing");
      document.title = prevTitle;
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
    // Some browsers return from print() before firing afterprint; clean up on the next tick either way.
    window.setTimeout(done, 1000);
  };

  const onSend = (channel: "whatsapp" | "email") => {
    if (!runOutput("send")) return;
    const { subject, body } = composeTechPack(data);
    const href = channel === "whatsapp" ? whatsappLink(body) : mailtoLink(subject, body);
    setSent({ channel, href });
    if (channel === "whatsapp") window.open(href, "_blank", "noopener,noreferrer");
    else window.location.href = href;
  };

  const startOver = () => {
    if (!window.confirm("Clear this tech pack and start again?")) return;
    clearDraft();
    setData(emptyTechPack());
    setAttempt(null);
    setSent(null);
    goTo(0);
  };

  const props: StepProps = { data, set, update, errors };
  const isReview = current.id === "review";
  const outputErrors = attempt !== null && attempt.scope !== "step" ? errorKeys : [];

  return (
    <div className="tp-builder" ref={rootRef}>
      <nav className="tp-progress" aria-label="Tech pack steps">
        <p className="tp-progress-now br" aria-hidden="true">
          Step {String(step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")} · {current.title}
        </p>
        <div className="tp-progress-bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${(step + 1) / steps.length})` }} />
        </div>
        <ol>
          {steps.map((s, i) => (
            <li key={s.id} data-state={i === step ? "current" : i < step ? "done" : "todo"}>
              <button type="button" onClick={() => goTo(i)} aria-current={i === step ? "step" : undefined}>
                <b>{String(i + 1).padStart(2, "0")}</b>
                <span>{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <form className="tp-step" onSubmit={onNext} noValidate aria-labelledby="tp-step-title">
        <header className="tp-step-head">
          <p className="br kicker">Step {String(step + 1).padStart(2, "0")}</p>
          <h3 id="tp-step-title" ref={headingRef} tabIndex={-1}>
            {current.title}
            <span className="dot">.</span>
          </h3>
          <p className="tp-step-intro">{STEP_INTRO[current.id]}</p>
        </header>

        {current.id === "garment" && <GarmentStep {...props} />}
        {current.id === "fit" && <FitStep {...props} />}
        {current.id === "fabric" && <FabricStep {...props} />}
        {current.id === "colours" && <ColoursStep {...props} />}
        {current.id === "artwork" && <ArtworkStep {...props} />}
        {current.id === "sizes" && <SizesStep {...props} />}
        {current.id === "labels" && <LabelsStep {...props} />}
        {isReview && (
          <div className="tp-stack">
            <ReviewSummary data={data} onEdit={(id) => goTo(steps.findIndex((s) => s.id === id))} />
            <ContactFields {...props} />

            {outputErrors.length > 0 && (
              <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
                <h4>Please fix {outputErrors.length === 1 ? "this" : `these ${outputErrors.length} things`}:</h4>
                <ul>
                  {outputErrors.map((k) => (
                    <li key={k}>
                      <a
                        href={`#${errorField[k]}`}
                        onClick={(e) => {
                          e.preventDefault();
                          fixError(k);
                        }}
                      >
                        {ERROR_LABEL[k]}: {errors[k]}
                        {errorStep[k] !== "review" && ` (step ${steps.findIndex((s) => s.id === errorStep[k]) + 1})`}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sent && outputErrors.length === 0 && (
              <div className="status-ok" role="status">
                {sent.channel === "whatsapp" ? "WhatsApp opened in a new tab with your tech pack." : "Your email app opened with your tech pack."}{" "}
                Attach your artwork files and the PDF there before you send. Nothing happened?{" "}
                <a href={sent.href} target={sent.channel === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer">
                  Open it again
                </a>{" "}
                or message us on {contact.whatsappDisplay}.
              </div>
            )}

            <div className="tp-out">
              <button type="button" className="pill solid lg" onClick={onPrint}>
                Download / print tech pack
              </button>
              <button type="button" className="pill inked lg" onClick={() => onSend("whatsapp")}>
                Send on WhatsApp
              </button>
              <button type="button" className="pill lg" onClick={() => onSend("email")}>
                Send by email
              </button>
            </div>
            <p className="tp-hint tp-out-note">
              Tip: choose <strong>Save as PDF</strong> in the print dialog, then attach that PDF and your artwork files in WhatsApp or
              email. Files are attached in those apps; nothing is uploaded to or stored on this website.
            </p>
          </div>
        )}

        <footer className="tp-step-foot">
          <button type="button" className="pill lg" onClick={() => goTo(step - 1)} disabled={step === 0}>
            ← Back
          </button>
          {!isReview && (
            <button type="submit" className="pill inked lg">
              Next: {steps[step + 1]?.title} →
            </button>
          )}
          <p className="tp-saved">
            {canSave ? "Saved in this browser as you go." : "Your browser is blocking storage, so this draft is lost on refresh."}{" "}
            <button type="button" className="tp-link" onClick={startOver}>
              Start over
            </button>
          </p>
        </footer>
      </form>

      <TechPackSheet data={data} printedOn={printedOn} />
    </div>
  );
}
