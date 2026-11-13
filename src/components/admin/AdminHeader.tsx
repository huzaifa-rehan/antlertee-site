import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

type Section = "leads" | "subscribers" | "images" | "library";

/** Top bar for every logged-in admin page. */
export function AdminHeader({ csrf, active, unread }: { csrf: string; active: Section; unread?: number }) {
  const link = (section: Section, href: string, label: string, badge?: number) => (
    <li>
      <Link href={href} aria-current={active === section ? "page" : undefined}>
        {label}
        {badge ? (
          <span className="adm-badge" aria-label={`${badge} unread`}>
            {badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
  return (
    <header className="adm-top">
      <div className="adm-top-in">
        <Link className="adm-brand" href="/admin/leads/">
          Antlertee<span className="dot">.</span> admin
        </Link>
        <nav aria-label="Admin">
          <ul className="adm-nav">
            {link("leads", "/admin/leads/", "Leads", unread)}
            {link("subscribers", "/admin/subscribers/", "Subscribers")}
            {link("images", "/admin/media/", "Site images")}
            {link("library", "/admin/media/library/", "Library")}
          </ul>
        </nav>
        <div className="adm-top-end">
          <a className="adm-linkbtn" href="/" target="_blank" rel="noopener noreferrer">
            View site
          </a>
          <LogoutButton csrf={csrf} />
        </div>
      </div>
    </header>
  );
}
