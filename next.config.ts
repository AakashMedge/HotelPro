import type { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        // Allow any https image source — needed for user-supplied menu item URLs
        protocol: 'https',
        hostname: '**',
        pathname: '**',
      },
      {
        // Allow http sources too (some CDNs still use it)
        protocol: 'http',
        hostname: '**',
        pathname: '**',
      },
    ],
  },
} as any;

export default nextConfig;

