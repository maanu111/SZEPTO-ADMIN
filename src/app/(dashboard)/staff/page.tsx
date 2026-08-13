import { redirect } from "next/navigation";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requirePage } from "@/lib/viewer";
import { StaffManager } from "./StaffManager";

export const metadata = { title: "Staff" };
export const revalidate = 0;

export default async function StaffPage() {
  const viewer = await requirePage("staff");
  // Staff administration is the owner's alone — a manager with the page ticked
  // still cannot widen anyone's access.
  if (!viewer.isOwner) redirect("/no-access");

  const supabase = await createClient();
  const { data } = await supabase
    .from("staff")
    .select("id, email, full_name, phone, role, is_active, allowed_pages, created_at")
    .order("role")
    .order("created_at");

  return (
    <>
      <RealtimeRefresh tables={["staff"]} />
      <PageHeader
        title="Staff"
        subtitle="Create an account and tick the pages that person can open"
      />
      <StaffManager rows={data ?? []} />
    </>
  );
}
