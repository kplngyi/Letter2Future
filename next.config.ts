import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('sqlite3', 'node-pre-gyp');
    }
    return config;
  },
};

export default nextConfig;
