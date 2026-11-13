import { redirect } from "next/navigation";
import { requireAdminPage } from "@/server/auth/admin";

export default async function AdminHome() {
  await requireAdminPage();
  redirect("/admin/leads/");
}
