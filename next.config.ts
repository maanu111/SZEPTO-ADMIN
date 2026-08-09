import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
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
