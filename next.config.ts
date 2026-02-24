import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
};

export default nextConfig;

