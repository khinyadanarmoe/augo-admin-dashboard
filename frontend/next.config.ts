import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
  turbopack: {},
  transpilePackages: ['leaflet', 'react-leaflet'],
};

export default nextConfig;
