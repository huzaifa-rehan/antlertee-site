import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { LocalTime } from "@/components/admin/LocalTime";
import { requireAdminPage } from "@/server/auth/admin";
import { statusCounts } from "@/server/leads";
import { listSubscribers } from "@/server/subscribers";

const PAGE = 100;

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function SubscribersPage({ searchParams }: { searchParams: Search }) {
  const { csrf } = await requireAdminPage();
  const sp = await searchParams;
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, Number.parseInt(raw ?? "", 10) || 1);
  const [{ subscribers, total }, counts] = await Promise.all([listSubscribers(PAGE, (page - 1) * PAGE), statusCounts()]);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <AdminHeader csrf={csrf} active="subscribers" unread={counts.new} />
      <div className="adm-wrap">
        <h1 className="adm-h1">
          Subscribers<span className="dot">.</span>
        </h1>
        <p className="adm-sub">{total === 0 ? "No sign-ups yet." : `${total} in total.`} People who joined the newsletter from the site footer.</p>

        <div className="adm-toolbar">
          <a className="pill" href="/api/admin/subscribers/export/" download>
            Export CSV
          </a>
        </div>

        {subscribers.length === 0 ? (
          <p className="adm-empty">Nobody has signed up yet. New sign-ups from the footer appear here.</p>
        ) : (
          <ul className="adm-list">
            {subscribers.map((s) => (
              <li key={s.id}>
                <div className="adm-lead">
                  <span className="adm-kind">{s.status === "subscribed" ? "Subscribed" : "Unsubscribed"}</span>
                  <span>
                    <span className="adm-lead-name">{s.email}</span>
                    {s.sourcePath ? (
                      <>
                        <br />
                        <span className="adm-lead-meta">from {s.sourcePath}</span>
                      </>
                    ) : null}
                  </span>
                  <span className="adm-lead-time">
                    <LocalTime iso={s.createdAt} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav className="adm-pager" aria-label="Pages">
            {page > 1 && (
              <Link className="pill" href={`/admin/subscribers/${page - 1 > 1 ? `?page=${page - 1}` : ""}`}>
                ← Newer
              </Link>
            )}
            <span className="adm-sub" style={{ alignSelf: "center" }}>
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link className="pill" href={`/admin/subscribers/?page=${page + 1}`}>
                Older →
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
