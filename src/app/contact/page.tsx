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

/*
 * Two colour zones: an ink hero band (headline and the four ways to reach us, so the top of the page fits one screen)
 * and the paper band that holds the quote form (a form is inherently long, so it scrolls normally).
 */
export default function ContactPage() {
  return (
    <>
      <section className="ct-hero band-ink" data-nav="dark" data-snap="fit" aria-labelledby="contact-title">
        <p className="br kicker">Get a quote</p>
        <h1 id="contact-title" className="h-page ct-title">
          Start your drop<span className="dot">.</span>
        </h1>
        <p className="lead">
          Tell us what you want to make. We will come back with fabric options, sampling and a price for your quantity.
        </p>
        <dl className="ct-facts">
          <div>
            <dt className="br">WhatsApp</dt>
            <dd>
              <a className="ct-big" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                {contact.whatsappDisplay}
              </a>
            </dd>
          </div>
          <div>
            <dt className="br">Email</dt>
            <dd>
              <a className="ct-big" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="br">Minimums</dt>
            <dd>MOQ {facts.moqLong}. Samples available before bulk.</dd>
          </div>
          <div>
            <dt className="br">Studio</dt>
            <dd>Karachi, Pakistan. Shipping worldwide.</dd>
          </div>
        </dl>
      </section>

      <section className="ct-form band-paper" data-nav="light" data-snap="edge" aria-label="Quote form">
        <div className="ct-form-in">
          <Suspense fallback={<FormFallback />}>
            <QuoteForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}
