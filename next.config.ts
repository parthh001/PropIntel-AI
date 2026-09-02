import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Default bottom-left position collides with the floating sidebar's
  // footer card — this is a dev-only overlay, never shown in production.
  devIndicators: { position: "bottom-right" },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ]}];
  },
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};
export default nextConfig;
