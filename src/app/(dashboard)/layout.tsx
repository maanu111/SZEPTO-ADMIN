import { redirect } from "next/navigation";
import { GlobalRealtime } from "@/components/GlobalRealtime";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already blocks anonymous requests; this covers the admin flag.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return <NotAuthorised email={user.email ?? ""} />;

  const { count: pendingCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="min-h-dvh">
      {/* Global realtime keeps sidebar pending count live on every page */}
      <GlobalRealtime />
      <Sidebar
        email={profile.email ?? user.email ?? "admin"}
        pendingCount={pendingCount ?? 0}
      />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-16 sm:px-6 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}

function NotAuthorised({ email }: { email: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-shell-900 p-6 text-center">
        <h1 className="text-lg font-semibold text-text-hi">No access</h1>
        <p className="mt-2 text-[13px] text-text-dim">
          <span className="font-medium text-text-hi">{email}</span> is not the owner account.
        </p>
        <form action="/auth/signout" method="post" className="mt-5">
          <button
            type="submit"
            className="h-10 w-full rounded-lg border border-line bg-shell-850 text-[13px] font-semibold text-text-hi transition-colors hover:border-shell-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
