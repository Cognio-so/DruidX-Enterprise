import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-3d035218db92408db790b6ce46af0d9e.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    // Ignore ESLint errors during builds to prevent deployment failures
    // Warnings will still be shown but won't fail the build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during builds (optional, but recommended for production)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
