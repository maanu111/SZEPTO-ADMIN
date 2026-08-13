import { redirect } from "next/navigation";
import { GlobalRealtime } from "@/components/GlobalRealtime";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Middleware already blocks anonymous requests; this covers a signed-in
    // account that is not staff, or a staff member who has been switched off.
    if (!user) redirect("/login");
    return <NotAuthorised email={user.email ?? ""} />;
  }

  if (viewer.allowedPages.length === 0) {
    return <NoPages email={viewer.email} />;
  }

  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="min-h-dvh">
      {/* Global realtime keeps sidebar pending count live on every page */}
      <GlobalRealtime />
      <Sidebar
        email={viewer.email}
        pendingCount={pendingCount ?? 0}
        allowedPages={viewer.allowedPages}
        isOwner={viewer.isOwner}
      />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-16 sm:px-6 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}

function NotAuthorised({ email }: { email: string }) {
  return (
    <Shell title="No access">
      <p className="mt-2 text-[13px] text-text-dim">
        <span className="font-medium text-text-hi">{email}</span> does not have an account here.
      </p>
    </Shell>
  );
}

function NoPages({ email }: { email: string }) {
  return (
    <Shell title="Nothing assigned yet">
      <p className="mt-2 text-[13px] text-text-dim">
        <span className="font-medium text-text-hi">{email}</span> has no pages assigned. Ask the
        owner to give you access.
      </p>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-shell-900 p-6 text-center">
        <h1 className="text-lg font-semibold text-text-hi">{title}</h1>
        {children}
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
