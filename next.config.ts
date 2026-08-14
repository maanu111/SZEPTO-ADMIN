import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  /*
   * Self-contained server build.
   *
   * Produces `.next/standalone` with a `server.js` and only the node_modules
   * actually reached at runtime, so the upload is tens of megabytes instead of
   * hundreds. Required when the host has no build step of its own.
   */
  output: "standalone",
  // This app sits beside another one; without a root, tracing walks up and
  // drags the sibling's files into the bundle.
  outputFileTracingRoot: __dirname,
  devIndicators: false,
  images: {
    remotePatterns: [
      // Uploaded product photos, QR codes and payment screenshots
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // Seeded catalog photography — drop once you upload your own
      { protocol: "https" as const, hostname: "cdn.dummyjson.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
