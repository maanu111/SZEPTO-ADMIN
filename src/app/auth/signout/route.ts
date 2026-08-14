import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  /*
   * Relative Location, deliberately.
   *
   * `new URL("/login", request.url)` builds an absolute URL from the address the
   * server sees, which behind a reverse proxy is the internal one — so the
   * browser gets sent somewhere it cannot reach and shows a network error. A
   * relative target lets the browser resolve it against the address bar, which
   * is right on every host.
   */
  return new NextResponse(null, {
    // 303 so the browser follows with GET rather than replaying the POST.
    status: 303,
    headers: { Location: "/login" },
  });
}
