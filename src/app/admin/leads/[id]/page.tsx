import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { LeadActions } from "@/components/admin/LeadActions";
import { LocalTime } from "@/components/admin/LocalTime";
import { formatBytes, leadReference } from "@/lib/leads/rules";
import { requireAdminPage } from "@/server/auth/admin";
import { getLead, statusCounts } from "@/server/leads";

const FIELD_LABELS: Record<string, string> = { product: "Product", quantity: "Quantity (pcs)", deadline: "Deadline" };
const VIEWABLE = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { csrf } = await requireAdminPage();
  const { id } = await params;
  const [found, counts] = await Promise.all([getLead(id), statusCounts()]);
  if (!found) notFound();
  const { lead, files } = found;
  const fields = Object.entries(lead.payload.fields ?? {});
  const rows: [string, React.ReactNode][] = [
    ["Reference", leadReference(lead.id)],
    ["Received", <LocalTime key="t" iso={lead.createdAt} />],
    ["Type", lead.kind === "techpack" ? "Tech pack" : "Quote request"],
    ["Name", lead.name],
    ["Brand", lead.brand],
    ["Email", lead.email ? <a key="e" href={`mailto:${lead.email}`}>{lead.email}</a> : ""],
    [
      "WhatsApp",
      lead.whatsapp ? (
        <a key="w" href={`https://wa.me/${lead.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer">
          {lead.whatsapp}
        </a>
      ) : (
        ""
      ),
    ],
    ["Country / market", lead.country],
    ...fields.map(([k, v]): [string, React.ReactNode] => [FIELD_LABELS[k] ?? k, v]),
    ["Sent from", lead.sourcePath],
  ];

  return (
    <>
      <AdminHeader csrf={csrf} active="leads" unread={counts.new} />
      <div className="adm-wrap">
        <Link className="adm-back" href="/admin/leads/">
          ← All leads
        </Link>
        <h1 className="adm-h1">
          {lead.name}
          <span className="dot">.</span>
        </h1>
        <p className="adm-sub">
          {lead.kind === "techpack" ? "Tech pack" : "Quote request"} · {leadReference(lead.id)} · status: <strong>{lead.status}</strong>
        </p>

        <LeadActions id={lead.id} status={lead.status} csrf={csrf} />

        <div className="adm-detail">
          <div style={{ display: "grid", gap: 18 }}>
            <section className="adm-card" aria-labelledby="sec-details">
              <h2 className="adm-h2" id="sec-details">
                Details
              </h2>
              <dl className="adm-dl">
                {rows
                  .filter(([, v]) => v !== "" && v !== null && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
            </section>

            {lead.message && (
              <section className="adm-card" aria-labelledby="sec-msg">
                <h2 className="adm-h2" id="sec-msg">
                  Message
                </h2>
                <p className="adm-pre">{lead.message}</p>
              </section>
            )}

            {lead.payload.summary && (
              <section className="adm-card" aria-labelledby="sec-tp">
                <h2 className="adm-h2" id="sec-tp">
                  Tech pack (built on the site)
                </h2>
                <p className="adm-pre">{lead.payload.summary}</p>
              </section>
            )}
          </div>

          <section className="adm-card" aria-labelledby="sec-files">
            <h2 className="adm-h2" id="sec-files">
              Files ({files.length})
            </h2>
            {files.length === 0 ? (
              <p className="adm-sub">No files were uploaded with this lead.</p>
            ) : (
              <ul className="adm-files">
                {files.map((f) => {
                  const base = `/api/admin/leads/${lead.id}/files/${f.id}/`;
                  return (
                    <li key={f.id} className="adm-file">
                      <span className="adm-file-name">
                        {f.originalName}
                        <br />
                        <span className="adm-sub" style={{ fontWeight: 400, fontSize: 13 }}>
                          {formatBytes(f.size)} · {f.mime}
                        </span>
                      </span>
                      <span className="adm-actions">
                        {VIEWABLE.has(f.mime) && (
                          <a className="pill" href={`${base}?view=1`} target="_blank" rel="noopener noreferrer">
                            View<span className="sr-only"> {f.originalName}</span>
                          </a>
                        )}
                        <a className="pill" href={base} download>
                          Download<span className="sr-only"> {f.originalName}</span>
                        </a>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {lead.userAgent && (
              <p className="adm-sub" style={{ marginTop: 14, fontSize: 12 }}>
                Browser: {lead.userAgent}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
