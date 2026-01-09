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
  // Disable automatic CSS preloading for better control
  optimizeFonts: true,
  // Reduce aggressive prefetching that causes CSS preload warnings
  poweredByHeader: false,
};

export default nextConfig;
