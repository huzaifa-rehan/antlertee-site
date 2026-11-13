"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { LeadFileDrop, useLeadFiles } from "@/components/uploads/LeadFiles";
import { contact, mailtoLink, whatsappLink } from "@/content/site";
import { emptyTechPack, steps, type StepId, type TechPack } from "@/content/techpack";
import { MAX_FILE_BYTES, MAX_FILES, formatBytes } from "@/lib/leads/rules";
import { submitLead } from "@/lib/leads/submit";
import { goToWhatsApp, openHandoffTab, saveForHandoff, whatsappMessage, type HandoffInfo } from "@/lib/leads/whatsapp";
import { getLenis } from "@/lib/lenis";
import { ArtworkStep } from "./ArtworkStep";
import { ColoursStep, ContactFields, FabricStep, FitStep, GarmentStep, LabelsStep, SizesStep } from "./BuilderSteps";
import type { SetField, StepProps, Update } from "./fields";
import { LivePreview } from "./Preview";
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
type Sent = { href: string } | null;
type Phase = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; info: HandoffInfo; href: string; opened: boolean };

const LAST = steps.length - 1;

const ERROR_LABEL: Record<ErrorKey, string> = {
  garment: "What we are making",
  garmentOther: "The garment",
  quantities: "How many pieces",
  deadline: "Deadline",
  name: "Your name",
  email: "Email",
  whatsapp: "WhatsApp number",
};

const STEP_INTRO: Record<StepId, string> = {
  garment: "Pick a popular style to start fast, or choose the garment yourself. You can change everything later.",
  fit: "How should it sit on the body? Not sure is a fine answer. We will suggest one.",
  fabric: "What it is made of and how heavy it feels. Skip anything you do not know. We will advise.",
  colours: "Pick the main colour. Add more only if you want the same garment in other colours.",
  artwork: "Tap where a logo or print goes. No artwork yet? Skip this step.",
  sizes: "A rough number is enough. We split it across sizes for you, and you can change it after sampling.",
  labels: "The small details that make it feel like your brand. The usual ones are already ticked.",
  review: "Check that it reads right, add how to reach you, then send it.",
};

/** Roughly three minutes in all. Shown as time left, so it counts down. */
const minutesLeft = (step: number): number => Math.max(1, Math.round(((steps.length - step) * 3) / steps.length));

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
 * read from localStorage on first render. Output is a printable sheet, a WhatsApp chat opened with the tech pack
 * already written (the full pack and any files are saved to the admin inbox first), or an email.
 */
export default function TechPackBuilder() {
  const [initial] = useState(loadDraft);
  const [data, setData] = useState<TechPack>(initial.data);
  const [step, setStep] = useState(initial.step);
  const [canSave] = useState(storageWorks);
  const [attempt, setAttempt] = useState<Attempt>(null);
  const [sent, setSent] = useState<Sent>(null);
  const [printedOn, setPrintedOn] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const files = useLeadFiles();
  const sending = phase.kind === "sending";

  const rootRef = useRef<HTMLDivElement>(null);
  const okRef = useRef<HTMLDivElement>(null);
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

  /** Optional steps can be skipped: nothing is checked and nothing already typed is lost. */
  const onSkip = () => goTo(step + 1);

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

  const onEmail = () => {
    if (!runOutput("send")) return;
    const { subject, body } = composeTechPack(data);
    const href = mailtoLink(subject, `${body}\n\nI will attach my artwork files and the printed tech pack as a PDF here.`);
    setSent({ href });
    window.location.href = href;
  };

  /** Saves the tech pack and any uploaded files to the Antlertee inbox, then opens WhatsApp with the message written. */
  const onWhatsApp = async () => {
    if (sending || !runOutput("send")) return;
    setSent(null);
    // Open the tab now (inside the click), then point it at WhatsApp once the tech pack is saved.
    const tab = openHandoffTab();
    setPhase({ kind: "sending" });
    const info = await saveForHandoff({
      pickedCount: files.items.length,
      upload: () => files.uploadAll(),
      save: (refs) =>
        submitLead({
          kind: "techpack",
          name: data.name,
          email: data.email,
          whatsapp: data.whatsapp,
          brand: data.brand,
          message: data.notes,
          country: data.market,
          techPack: data,
          files: refs,
          website: "",
        }),
    });
    // The saved copy holds the full tech pack, so the message only needs to say what it is.
    const href = whatsappLink(whatsappMessage(composeTechPack(data).body, info));
    const opened = goToWhatsApp(tab, href);
    setPhase({ kind: "sent", info, href, opened });
    requestAnimationFrame(() => okRef.current?.focus());
  };

  const reset = () => {
    clearDraft();
    setData(emptyTechPack());
    setAttempt(null);
    setSent(null);
    setPhase({ kind: "idle" });
    files.reset();
    goTo(0);
  };

  const startOver = () => {
    if (!window.confirm("Clear this tech pack and start again?")) return;
    reset();
  };

  const props: StepProps = { data, set, update, errors };
  const isReview = current.id === "review";
  const noContact = !data.email.trim() && !data.whatsapp.trim();
  // With neither an email nor a number, one line says it once instead of twice.
  const outputErrors = (attempt !== null && attempt.scope !== "step" ? errorKeys : []).filter((k) => !(k === "whatsapp" && noContact && errors.email));
  const showPreview = current.id !== "artwork" && !isReview;
  const nextStep = steps[step + 1];

  return (
    <div className="tp-builder" ref={rootRef}>
      <nav className="tp-progress" aria-label="Tech pack steps">
        <p className="tp-progress-now">
          <b>
            Step {step + 1} of {steps.length}
          </b>
          <span>
            {current.nav}
            {isReview ? ". Last step" : `. About ${minutesLeft(step)} min left`}
          </span>
        </p>
        <div className="tp-progress-bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${(step + 1) / steps.length})` }} />
        </div>
        <ol>
          {steps.map((s, i) => (
            <li key={s.id} data-state={i === step ? "current" : i < step ? "done" : "todo"}>
              <button type="button" onClick={() => goTo(i)} aria-current={i === step ? "step" : undefined}>
                <b>{i < step ? "✓" : i + 1}</b>
                <span>{s.nav}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <form className="tp-step" onSubmit={onNext} noValidate aria-labelledby="tp-step-title" data-review={isReview ? "true" : undefined}>
        <header className="tp-step-head">
          <p className="br kicker">
            Step {step + 1} of {steps.length}
          </p>
          <h3 id="tp-step-title" ref={headingRef} tabIndex={-1}>
            {current.title}
          </h3>
          <p className="tp-step-intro">{STEP_INTRO[current.id]}</p>
          {current.optional && (
            <p className="tp-step-skip">
              <span>Optional step. Nothing here is needed for a price.</span>
              <button type="button" className="tp-link tp-skip-head" onClick={onSkip}>
                Skip for now
              </button>
            </p>
          )}
        </header>

        <div className="tp-step-body" data-preview={showPreview ? "on" : undefined}>
          <div className="tp-step-main">
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
                {phase.kind !== "sent" && (
                  <LeadFileDrop
                    idPrefix="tp-files"
                    label="Add a sketch or logo if you have one"
                    hint={`A photo, sketch, logo or design file. PDF, PNG, JPG, AI and more. Up to ${MAX_FILES} files, ${formatBytes(MAX_FILE_BYTES)} each.`}
                    files={files}
                    disabled={sending}
                  />
                )}

                {outputErrors.length > 0 && (
                  <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
                    <h4>
                      {outputErrors.length === 1
                        ? "One thing is missing before we can send this:"
                        : `${outputErrors.length} things are missing before we can send this:`}
                    </h4>
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
                            {k === "email" && noContact ? "Email or WhatsApp" : ERROR_LABEL[k]}: {errors[k]}
                            {errorStep[k] !== "review" && ` Go to step ${steps.findIndex((s) => s.id === errorStep[k]) + 1}.`}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {sent && outputErrors.length === 0 && (
                  <div className="status-ok" role="status">
                    Your email app opened with your tech pack. Attach your artwork files and the PDF there before you send. Nothing
                    happened?{" "}
                    <a href={sent.href} rel="noopener noreferrer">
                      Open it again
                    </a>{" "}
                    or message us on {contact.whatsappDisplay}.
                  </div>
                )}

                {phase.kind === "sent" ? (
                  <div className="send-ok" role="status" tabIndex={-1} ref={okRef}>
                    <h4>
                      {phase.opened ? "Press send in WhatsApp" : "One tap left"}
                      <span className="dot">.</span>
                    </h4>
                    <p>
                      {phase.opened
                        ? "WhatsApp opened in a new tab with your tech pack already written. Press send and we will take it from there."
                        : "Your tech pack message is written and ready. Tap the button to open WhatsApp, then press send."}
                    </p>
                    <p style={{ marginTop: 16 }}>
                      <a className="pill solid" href={phase.href} target="_blank" rel="noopener noreferrer">
                        {phase.opened ? "Take me back to WhatsApp" : "Take me to WhatsApp"}
                      </a>
                    </p>
                    {phase.info.reference ? (
                      <>
                        <p>The full tech pack and your files are saved with us. Your reference:</p>
                        <p className="send-ref">{phase.info.reference}</p>
                      </>
                    ) : (
                      <p>
                        We could not save a copy on our side just now, so the chat is the way to reach us. The message has your tech
                        pack in it.
                      </p>
                    )}
                    {phase.info.attachLater && (
                      <p>Tap the paperclip or + in the chat, choose Document, and attach your artwork files before you send.</p>
                    )}
                    <ol>
                      <li>We go through your tech pack and files.</li>
                      <li>We reply on WhatsApp with questions, fabric options and a sampling plan. A sample is one test piece you check first.</li>
                      <li>Then a price for your quantity.</li>
                    </ol>
                    <div className="tp-out" style={{ marginTop: 16 }}>
                      <button type="button" className="pill on-dark" onClick={onPrint}>
                        Keep a copy (PDF or print)
                      </button>
                      <button type="button" className="pill on-dark" onClick={reset}>
                        Start a fresh tech pack
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="tp-send">
                      <div className="tp-out">
                        <button type="button" className="pill inked lg" onClick={() => void onWhatsApp()} disabled={sending}>
                          {sending ? "Opening WhatsApp…" : "Send it on WhatsApp"}
                        </button>
                      </div>
                      <p className="tp-hint tp-out-note" role={sending ? "status" : undefined}>
                        {sending
                          ? "Saving your tech pack. Keep this page open, WhatsApp opens in a moment."
                          : "WhatsApp opens with your message ready. Just press send. The full tech pack and any files above are saved with your request."}
                      </p>
                    </div>

                    <div className="send-alt" style={{ marginTop: 0 }}>
                      <p className="send-alt-h">Other ways to send it</p>
                      <div className="tp-out">
                        <button type="button" className="pill lg" onClick={onPrint} disabled={sending}>
                          Download or print
                        </button>
                        <button type="button" className="pill lg" onClick={onEmail} disabled={sending}>
                          Email it instead
                        </button>
                      </div>
                      <p className="tp-hint tp-out-note" style={{ marginTop: 12 }}>
                        To keep a PDF, choose <strong>Save as PDF</strong> in the print window. By email, your email app opens with the
                        tech pack written. Attach that PDF and your files there.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {showPreview && <LivePreview data={data} />}
        </div>

        <p className="tp-saved">
          {canSave
            ? "Saved on this device as you go. You can close this page and come back."
            : "Your browser is blocking storage, so this draft is lost if you refresh."}{" "}
          <button type="button" className="tp-link" onClick={startOver}>
            Start over
          </button>
        </p>

        <footer className="tp-step-foot">
          <button type="button" className="pill lg" onClick={() => goTo(step - 1)} disabled={step === 0}>
            ← Back
          </button>
          {!isReview && current.optional && (
            <button type="button" className="pill lg tp-skip" onClick={onSkip}>
              Skip for now
            </button>
          )}
          {!isReview && (
            <button type="submit" className="pill inked lg">
              Next: {nextStep?.nav}
            </button>
          )}
        </footer>
      </form>

      <TechPackSheet data={data} printedOn={printedOn} />
    </div>
  );
}
