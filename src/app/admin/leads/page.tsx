import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { LocalTime } from "@/components/admin/LocalTime";
import { isLeadStatus, leadReference, type LeadStatus } from "@/lib/leads/rules";
import { requireAdminPage } from "@/server/auth/admin";
import { listLeads, statusCounts } from "@/server/leads";

const PAGE = 50;
const TABS: { status: LeadStatus | "all"; label: string }[] = [
  { status: "all", label: "All" },
  { status: "new", label: "New" },
  { status: "read", label: "Read" },
  { status: "done", label: "Done" },
  { status: "spam", label: "Spam" },
];

type Search = Promise<Record<string, string | string[] | undefined>>;

function href(status: string, q: string, page = 1): string {
  const p = new URLSearchParams();
  if (status !== "all") p.set("status", status);
  if (q) p.set("q", q);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return `/admin/leads/${s ? `?${s}` : ""}`;
}

export default async function LeadsPage({ searchParams }: { searchParams: Search }) {
  const { csrf } = await requireAdminPage();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = isLeadStatus(one(sp.status)) ? (one(sp.status) as LeadStatus) : undefined;
  const q = one(sp.q).slice(0, 100);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const [{ leads, total }, counts] = await Promise.all([listLeads({ status, q, limit: PAGE, offset: (page - 1) * PAGE }), statusCounts()]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const current = status ?? "all";

  return (
    <>
      <AdminHeader csrf={csrf} active="leads" unread={counts.new} />
      <div className="adm-wrap">
        <h1 className="adm-h1">
          Leads<span className="dot">.</span>
        </h1>
        <p className="adm-sub">
          {counts.new > 0 ? `${counts.new} new, ` : "Nothing new. "}
          {counts.all} in total.
        </p>

        <div className="adm-toolbar">
          <nav aria-label="Filter by status">
            <ul className="adm-tabs">
              {TABS.map((t) => (
                <li key={t.status}>
                  <Link href={href(t.status, q)} aria-current={current === t.status ? "page" : undefined}>
                    {t.label} <span aria-hidden="true">({counts[t.status]})</span>
                    <span className="sr-only">, {counts[t.status]} leads</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form className="adm-search" role="search" action="/admin/leads/" method="get">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="adm-q" className="sr-only">
              Search by name, email, brand or WhatsApp
            </label>
            <input id="adm-q" name="q" type="search" className="input" defaultValue={q} placeholder="Search name, email, brand" />
            <button type="submit" className="pill">
              Search
            </button>
            <a className="pill" href="/api/admin/leads/export/" download>
              Export CSV
            </a>
          </form>
        </div>

        {leads.length === 0 ? (
          <p className="adm-empty">{q || status ? "No leads match this filter." : "No leads yet. New quote and tech pack requests from the site appear here."}</p>
        ) : (
          <ul className="adm-list">
            {leads.map((l) => (
              <li key={l.id}>
                <Link className="adm-lead" href={`/admin/leads/${l.id}/`} data-status={l.status}>
                  <span className="adm-kind" data-kind={l.kind}>
                    {l.kind === "techpack" ? "Tech pack" : "Quote"}
                  </span>
                  <span>
                    <span className="adm-lead-name">{l.name}</span>
                    <br />
                    <span className="adm-lead-meta">
                      {[l.brand, l.email || l.whatsapp, l.fileCount ? `${l.fileCount} file${l.fileCount > 1 ? "s" : ""}` : "", leadReference(l.id)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="adm-lead-time">
                    <LocalTime iso={l.createdAt} />
                    {l.status !== "new" && (
                      <>
                        <br />
                        <span className="adm-status">{l.status}</span>
                      </>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav className="adm-pager" aria-label="Pages">
            {page > 1 && (
              <Link className="pill" href={href(current, q, page - 1)}>
                ← Newer
              </Link>
            )}
            <span className="adm-sub" style={{ alignSelf: "center" }}>
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link className="pill" href={href(current, q, page + 1)}>
                Older →
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
