import { AdminHeader } from "@/components/admin/AdminHeader";
import { LibraryManager } from "@/components/admin/LibraryManager";
import { requireAdminPage } from "@/server/auth/admin";
import { statusCounts } from "@/server/leads";
import { listLibrary } from "@/server/media";

export default async function LibraryPage() {
  const { csrf } = await requireAdminPage();
  const [items, counts] = await Promise.all([listLibrary(), statusCounts()]);
  return (
    <>
      <AdminHeader csrf={csrf} active="library" unread={counts.new} />
      <div className="adm-wrap">
        <h1 className="adm-h1">
          Library<span className="dot">.</span>
        </h1>
        <p className="adm-sub">
          Extra photos and videos for the site. Upload them here, give each a name and a description, and copy the link when you need it.
          Placing library items into new spots on the pages (for example extra gallery cards) comes in the next update.
        </p>
        <LibraryManager csrf={csrf} items={items} />
      </div>
    </>
  );
}
