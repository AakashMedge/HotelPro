import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'masalaandchai.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'www.transparenttextures.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.loveandlemons.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'loveandlemons.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'www.indianhealthyrecipes.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'www.cookwithmanali.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'www.mystore.in',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'static.toiimg.com',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;

