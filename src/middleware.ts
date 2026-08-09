import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, static assets, and the PWA files.
     *
     * The manifest and service worker MUST stay unauthenticated — the browser
     * fetches them without credentials, and redirecting them to /login silently
     * makes the app uninstallable.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|xml)$).*)",
  ],
};
