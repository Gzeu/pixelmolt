import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
