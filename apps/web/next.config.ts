import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the Worker thin: pages read data from the VPS API, media from the CDN.
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
