import Link from "next/link";
import { contact, nav, whatsappLink } from "@/content/site";
import { modelCredit } from "@/content/credits";

export function SiteFooter() {
  return (
    <footer className="footer" data-nav="dark">
      <div className="footer-top">
        <div>
          <Link className="wm" href="/" aria-label="Antlertee Creative Studios, home">
            <span className="wm-logo" aria-hidden="true" />
          </Link>
          <p className="br" style={{ marginTop: 14 }}>
            ( Creative Studios ) &nbsp; [ Karachi, PK ]
          </p>
        </div>
        <div>
          <h2>Pages</h2>
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Contact</h2>
          <ul>
            <li>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                WhatsApp {contact.whatsappDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`}>Email us</a>
            </li>
            <li>
              <a href={contact.instagram} target="_blank" rel="noopener noreferrer">
                Instagram {contact.instagramHandle}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Antlertee Creative Studios. Private-label garment manufacturing, Karachi, Pakistan.</span>
        <span>
          {modelCredit.short} <Link href="/credits/">Credits</Link>
        </span>
      </div>
    </footer>
  );
}
