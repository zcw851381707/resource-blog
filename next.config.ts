import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.5.100', '192.168.5.96', '192.168.5.21', '192.168.5.82', '192.168.5.109'],
  reactStrictMode: false,
  serverExternalPackages: ['@resvg/resvg-wasm', 'sharp', 'text-to-svg'],
};

export default nextConfig;
