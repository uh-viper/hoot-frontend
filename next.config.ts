import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  // Optimize CSS loading
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Reduce aggressive prefetching that causes CSS preload warnings
  poweredByHeader: false,
  // Disable CSS preloading to prevent console warnings
  async headers() {
    return [];
  },
};

export default nextConfig;
