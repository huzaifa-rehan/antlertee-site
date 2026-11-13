import Link from "next/link";
import { contact, whatsappLink } from "@/content/site";

/** Yellow "Got a design? We'll build it." call to action, used at the bottom of most pages. */
export function QuoteCta({ title = "Got a design?\nWe'll build it" }: { title?: string }) {
  return (
    <section className="cta-b" data-nav="yellow" aria-labelledby="cta-title">
      <p className="br">Start your next drop</p>
      <h2 id="cta-title">
        {title.split("\n").map((line, i) => (
          <span key={line} style={{ display: "block" }}>
            {line}
            {i === title.split("\n").length - 1 && <span style={{ color: "var(--ink)" }}>.</span>}
          </span>
        ))}
      </h2>
      <div className="row">
        <Link className="pill inked lg" href="/contact/">
          Get a quote
        </Link>
        <a className="pill lg" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
          WhatsApp {contact.whatsappLocal}
        </a>
        <a className="pill lg" href={`mailto:${contact.email}`}>
          Email us
        </a>
      </div>
    </section>
  );
}
