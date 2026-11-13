import { Suspense } from "react";
import { QuoteForm } from "@/components/QuoteForm";
import { contact, facts, whatsappLink } from "@/content/site";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Get a quote: private-label garment manufacturing",
  description: `Request a quote from Antlertee Creative Studios. Tell us the product, quantity and deadline; we reply on WhatsApp (${contact.whatsappDisplay}) or email. MOQ ${facts.moqLong}.`,
  path: "/contact/",
});

function FormFallback() {
  return (
    <p className="leading-relaxed text-mute">
      Loading the quote form… You can also message us on{" "}
      <a className="underline" href={whatsappLink()}>
        WhatsApp {contact.whatsappDisplay}
      </a>{" "}
      or email <a className="underline" href={`mailto:${contact.email}`}>{contact.email}</a>.
    </p>
  );
}

export default function ContactPage() {
  return (
    <section className="page-hero" data-nav="light" aria-labelledby="contact-title" style={{ paddingBottom: "14vh" }}>
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.3fr] lg:gap-[6vw]">
        <div>
          <p className="br kicker">Get a quote</p>
          <h1 id="contact-title" className="h-page" style={{ marginTop: 18 }}>
            Start your
            <br />
            drop<span className="dot">.</span>
          </h1>
          <p className="lead">
            Tell us what you want to make. We will come back with fabric options, sampling and a price for your quantity.
          </p>
          <dl className="mt-10 grid gap-5 text-[15px]">
            <div className="border-t border-ink/15 pt-4">
              <dt className="br text-mute">WhatsApp</dt>
              <dd className="mt-1.5">
                <a className="font-display text-[26px] font-extrabold tracking-[-0.02em] no-underline hover:underline" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                  {contact.whatsappDisplay}
                </a>
              </dd>
            </div>
            <div className="border-t border-ink/15 pt-4">
              <dt className="br text-mute">Email</dt>
              <dd className="mt-1.5 break-all">
                <a className="font-display text-[clamp(18px,2vw,24px)] font-extrabold tracking-[-0.02em] no-underline hover:underline" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </dd>
            </div>
            <div className="border-t border-ink/15 pt-4">
              <dt className="br text-mute">Minimums</dt>
              <dd className="mt-1.5">MOQ {facts.moqLong}. Samples available before bulk.</dd>
            </div>
            <div className="border-t border-ink/15 pt-4">
              <dt className="br text-mute">Studio</dt>
              <dd className="mt-1.5">Karachi, Pakistan. Shipping worldwide.</dd>
            </div>
          </dl>
        </div>
        <div className="lg:pt-6">
          <Suspense fallback={<FormFallback />}>
            <QuoteForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
