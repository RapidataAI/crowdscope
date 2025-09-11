import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Next.js uses this folder as the workspace root for Turbopack
  // to avoid picking up a parent lockfile in a monorepo.
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5328/api/:path*",
      },
    ];
  },
};

export default nextConfig;
